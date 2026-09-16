import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("reservation authorization, slot isolation, price snapshot and Stripe fulfillment", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`,
  );
  await db.exec(
    `grant usage on schema public,auth to authenticated,anon; alter default privileges in schema public grant select,insert,update on tables to authenticated; alter default privileges in schema public grant select on tables to anon;`,
  );
  for (const path of [
    "schema.sql",
    "admin_schema.sql",
    "pagamento_schema.sql",
    "migrations/20260915_stripe_booking.sql",
  ])
    await db.exec(
      await readFile(new URL("../supabase/" + path, import.meta.url), "utf8"),
    );
  // Migration must be safely re-runnable.
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20260915_stripe_booking.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002";
  await db.query("insert into auth.users values($1,$2,$3),($4,$5,$6)", [
    a,
    "a@example.com",
    JSON.stringify({ nombre: "Ana" }),
    b,
    "b@example.com",
    JSON.stringify({ nombre: "Bea" }),
  ]);
  assert.equal(
    (await db.query("select count(*)::int n from clientes")).rows[0].n,
    2,
  );
  await db.exec(
    `insert into perfil_psicologa(nombre,precio_consulta) values('Yanina',12000); insert into disponibilidade(dia_semana,hora) select n,'14:00' from generate_series(0,6) n;`,
  );
  const slot = (await db.query("select * from horarios_livres()")).rows[1]
    .data_hora;
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`,
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into consultas(cliente_id,data_hora,status) values($1,$2,'confirmada')",
        [a, slot],
      ),
    /row-level security/,
  );
  const id = (await db.query("select reservar_consulta($1) id", [slot])).rows[0]
    .id;
  assert.equal(
    (await db.query("select reservar_consulta($1) id", [slot])).rows[0].id,
    id,
    "same request returns same reservation",
  );
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);`);
  assert.equal(
    (await db.query("select id from consultas")).rows.length,
    0,
    "another patient cannot see identities",
  );
  assert.equal(
    (await db.query("select * from horarios_livres()")).rows.some(
      (r) => +new Date(r.data_hora) === +new Date(slot),
    ),
    false,
    "busy slot hidden without leaking patient",
  );
  await assert.rejects(
    () => db.query("select reservar_consulta($1)", [slot]),
    /SLOT_TAKEN/,
  );
  await assert.rejects(
    () =>
      db.query(
        "select confirmar_pagamento_stripe('cs_test_1','pi_test_1',1200000,'ars')",
      ),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("select consultas_admin()"),
    /ADMIN_REQUIRED/,
  );
  await assert.rejects(
    () => db.query("select link_chamada from consultas"),
    /permission denied/,
  );
  await db.exec("reset role;");
  await db.query(
    "update consultas set link_chamada='https://meet.google.com/private' where id=$1",
    [id],
  );
  await db.exec(
    `insert into disponibilidade(dia_semana,hora) select n,'14:30' from generate_series(0,6) n; set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`,
  );
  assert.equal(
    (await db.query("select minhas_consultas() items")).rows[0].items[0]
      .link_chamada,
    null,
    "pending meeting is masked in the database",
  );
  await assert.rejects(
    () => db.query("select reservar_consulta(now())"),
    /INVALID_SLOT/,
  );
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);`);
  const overlapping = new Date(+new Date(slot) + 30 * 60 * 1000).toISOString();
  await assert.rejects(
    () => db.query("select reservar_consulta($1)", [overlapping]),
    /SLOT_TAKEN/,
  );
  assert.equal(
    (await db.query("select * from horarios_livres()")).rows.some(
      (r) => +new Date(r.data_hora) === +new Date(overlapping),
    ),
    false,
  );
  await db.exec("reset role;");
  await db.query(
    "update pagamentos set stripe_checkout_session_id='cs_test_1' where consulta_id=$1",
    [id],
  );
  await assert.rejects(
    () =>
      db.query(
        "select confirmar_pagamento_stripe('cs_test_1','pi_test_1',1,'ars')",
      ),
    /AMOUNT_MISMATCH/,
  );
  await db.exec("select processar_pagamento_stripe('cs_test_1');");
  assert.equal(
    (
      await db.query("select reserva_expira_em from consultas where id=$1", [
        id,
      ])
    ).rows[0].reserva_expira_em,
    null,
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20260915_stripe_booking.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    (
      await db.query("select reserva_expira_em from consultas where id=$1", [
        id,
      ])
    ).rows[0].reserva_expira_em,
    null,
    "rerunning migration preserves processing holds",
  );

  await db.exec(
    "select confirmar_pagamento_stripe('cs_test_1','pi_test_1',1200000,'ars'); select confirmar_pagamento_stripe('cs_test_1','pi_test_1',1200000,'ars'); select expirar_reserva_stripe('cs_test_1');",
  );
  assert.equal(
    (await db.query("select status from consultas where id=$1", [id])).rows[0]
      .status,
    "confirmada",
  );
  assert.equal(
    (await db.query("select count(*)::int n from pagamentos")).rows[0].n,
    1,
  );
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`,
  );
  assert.equal(
    (await db.query("select minhas_consultas() items")).rows[0].items[0]
      .link_chamada,
    "https://meet.google.com/private",
  );
  await db.exec("reset role;");
  await db.query("update consultas set status='cancelada' where id=$1", [id]);
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${b}',false);`,
  );
  assert.ok(
    (await db.query("select reservar_consulta($1) id", [slot])).rows[0].id,
    "cancelled slot can be booked again",
  );
  await db.exec("reset role;");
  await db.close();
});
