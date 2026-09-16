-- Apply after schema.sql, admin_schema.sql and pagamento_schema.sql.
-- Additive payment migration. Existing Mercado Pago references remain for history.
begin;
alter table public.consultas add column if not exists reserva_expira_em timestamptz;
update public.consultas c set reserva_expira_em = c.criado_em + interval '35 minutes'
where c.status = 'pendente_pago' and c.reserva_expira_em is null
and not exists(select 1 from public.pagamentos p where p.consulta_id=c.id and p.status='processando');
alter table public.perfil_psicologa add column if not exists moeda_consulta text not null default 'ARS';
alter table public.perfil_psicologa add column if not exists frase_pt text;
alter table public.perfil_psicologa add column if not exists bio_pt text;
alter table public.perfil_psicologa add column if not exists cita_pt text;
alter table public.perfil_psicologa add column if not exists titulo_pt text;
alter table public.pagamentos add column if not exists stripe_checkout_session_id text;
alter table public.pagamentos add column if not exists stripe_payment_intent_id text;
alter table public.pagamentos add column if not exists pago_em timestamptz;
create unique index if not exists pagamentos_stripe_session_unique on public.pagamentos(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index if not exists pagamentos_stripe_intent_unique on public.pagamentos(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
-- Rebooking a cancelled appointment must be possible.
alter table public.consultas drop constraint if exists consultas_data_hora_key;
create unique index if not exists consultas_active_slot_unique on public.consultas(data_hora) where status <> 'cancelada';
-- All patient reservations go through the validated transaction below.
drop policy if exists "Cliente cria consulta" on public.consultas;

-- Signup must also work when Supabase requires email confirmation (no session yet).
create or replace function public.create_patient_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.clientes(id, nombre, telefone)
 values(new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)), nullif(new.raw_user_meta_data->>'telefone', ''))
 on conflict (id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created_patient on auth.users;
create trigger on_auth_user_created_patient after insert on auth.users for each row execute procedure public.create_patient_profile();
revoke all on function public.create_patient_profile() from public;

-- Public availability returns timestamps only, never patient identities.
create or replace function public.horarios_livres() returns table(data_hora timestamptz)
language sql security definer set search_path = '' as $$
 with slots as (
 select distinct ((d::date + a.hora) at time zone 'America/Argentina/Buenos_Aires') as slot
 from generate_series((now() at time zone 'America/Argentina/Buenos_Aires')::date,
 (now() at time zone 'America/Argentina/Buenos_Aires')::date + 13, interval '1 day') d
 join public.disponibilidade a on a.dia_semana = extract(dow from d) and a.ativo
 ) select slot from slots
 where slot > now() + interval '1 hour'
 and not exists (select 1 from public.consultas c where c.data_hora < slot + interval '50 minutes' and c.data_hora + interval '50 minutes' > slot and c.status <> 'cancelada'
 and (c.status <> 'pendente_pago' or c.reserva_expira_em is null or c.reserva_expira_em > now()))
 order by slot;
$$;
revoke all on function public.horarios_livres() from public;
grant execute on function public.horarios_livres() to anon, authenticated;

create or replace function public.reservar_consulta(p_data_hora timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_price numeric; v_currency text; v_local timestamp;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.clientes where id = auth.uid()) then raise exception 'PROFILE_REQUIRED'; end if;
 v_local := p_data_hora at time zone 'America/Argentina/Buenos_Aires';
 if p_data_hora <= now() + interval '1 hour' or v_local::date > (now() at time zone 'America/Argentina/Buenos_Aires')::date + 13 then raise exception 'INVALID_SLOT'; end if;
 if not exists(select 1 from public.disponibilidade where ativo and dia_semana = extract(dow from v_local) and hora = v_local::time) then raise exception 'INVALID_SLOT'; end if;
 -- Serialize patient requests and all overlapping calendar slots.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 perform pg_advisory_xact_lock(hashtextextended('yanina-calendar', 1));
 update public.consultas set status = 'cancelada' where status = 'pendente_pago' and reserva_expira_em < now();
 select id into v_id from public.consultas where cliente_id = auth.uid() and data_hora = p_data_hora and status = 'pendente_pago';
 if v_id is not null then return v_id; end if;
 if exists(select 1 from public.consultas where cliente_id = auth.uid() and status = 'pendente_pago') then raise exception 'PENDING_RESERVATION'; end if;
 if exists(select 1 from public.consultas where data_hora < p_data_hora + interval '50 minutes' and data_hora + interval '50 minutes' > p_data_hora and status <> 'cancelada') then raise exception 'SLOT_TAKEN'; end if;
 select precio_consulta, moeda_consulta into v_price, v_currency from public.perfil_psicologa order by actualizado_em desc limit 1;
 if v_price is null or v_price <= 0 or v_currency not in ('ARS', 'BRL', 'USD', 'EUR') then raise exception 'PRICE_UNAVAILABLE'; end if;
 insert into public.consultas(cliente_id, data_hora, status, reserva_expira_em)
 values(auth.uid(), p_data_hora, 'pendente_pago', now() + interval '35 minutes') returning id into v_id;
 insert into public.pagamentos(consulta_id, valor, moeda) values(v_id, v_price, v_currency);
 return v_id;
end; $$;
revoke all on function public.reservar_consulta(timestamptz) from public;
grant execute on function public.reservar_consulta(timestamptz) to authenticated;

-- Atomic, idempotent fulfillment. Only the trusted Stripe server calls this.
create or replace function public.confirmar_pagamento_stripe(p_session text, p_intent text, p_amount bigint, p_currency text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_payment public.pagamentos%rowtype;
begin
 select * into v_payment from public.pagamentos where stripe_checkout_session_id = p_session for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if round(v_payment.valor * 100) <> p_amount or lower(v_payment.moeda) <> lower(p_currency) then raise exception 'AMOUNT_MISMATCH'; end if;
 -- Never resurrect a refunded payment after an out-of-order event.
 if v_payment.status in ('aprovado', 'reembolsado') then return; end if;
 update public.pagamentos set status = 'aprovado', stripe_payment_intent_id = p_intent, pago_em = now() where id = v_payment.id;
 -- A late payment on a cancelled reservation is recorded for admin reconciliation.
 update public.consultas set status = 'confirmada' where id = v_payment.consulta_id and status = 'pendente_pago';
end; $$;
revoke all on function public.confirmar_pagamento_stripe(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_stripe(text, text, bigint, text) to service_role;

create or replace function public.expirar_reserva_stripe(p_session text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_payment public.pagamentos%rowtype;
begin
 select * into v_payment from public.pagamentos where stripe_checkout_session_id = p_session for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if v_payment.status not in ('pendente', 'processando') then return; end if;
 update public.pagamentos set status = 'rejeitado' where id = v_payment.id;
 update public.consultas set status = 'cancelada' where id = v_payment.consulta_id and status = 'pendente_pago';
end; $$;
revoke all on function public.expirar_reserva_stripe(text) from public, anon, authenticated;
grant execute on function public.expirar_reserva_stripe(text) to service_role;
-- Session links are private even if a patient calls the Data API directly.
-- Column grants retain ordinary ownership queries; RPCs reveal links by status.
revoke select on public.consultas from anon, authenticated;
grant select(id, cliente_id, data_hora, status, criado_em, reserva_expira_em) on public.consultas to authenticated;
create or replace function public.minhas_consultas() returns jsonb
language sql security definer set search_path = '' as $$
 select coalesce(jsonb_agg(x order by x.data_hora desc), '[]'::jsonb) from (
 select c.id,c.data_hora,c.status,c.reserva_expira_em,
 case when c.status in ('confirmada','realizada') then c.link_chamada else null end as link_chamada,
 (select coalesce(jsonb_agg(jsonb_build_object('valor',p.valor,'moeda',p.moeda,'status',p.status) order by p.criado_em desc),'[]'::jsonb) from public.pagamentos p where p.consulta_id=c.id) as pagamentos
 from public.consultas c where c.cliente_id=auth.uid() and auth.uid() is not null
 ) x;
$$;
revoke all on function public.minhas_consultas() from public;
grant execute on function public.minhas_consultas() to authenticated;
create or replace function public.consultas_admin() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.admins where id=auth.uid()) then raise exception 'ADMIN_REQUIRED'; end if;
 return (select coalesce(jsonb_agg(x order by x.data_hora desc),'[]'::jsonb) from (
 select c.*,jsonb_build_object('nombre',cl.nombre,'telefone',cl.telefone) as clientes,
 (select coalesce(jsonb_agg(jsonb_build_object('status',p.status)),'[]'::jsonb) from public.pagamentos p where p.consulta_id=c.id) as pagamentos
 from public.consultas c left join public.clientes cl on cl.id=c.cliente_id
 ) x);
end; $$;
revoke all on function public.consultas_admin() from public;
grant execute on function public.consultas_admin() to authenticated;

-- Delayed payment methods retain the reservation until their final event.
alter table public.pagamentos drop constraint if exists pagamentos_status_check;
alter table public.pagamentos add constraint pagamentos_status_check check(status in ('pendente','processando','aprovado','rejeitado','reembolsado'));
create or replace function public.processar_pagamento_stripe(p_session text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_payment public.pagamentos%rowtype;
begin
 select * into v_payment from public.pagamentos where stripe_checkout_session_id=p_session for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if v_payment.status <> 'pendente' then return; end if;
 update public.pagamentos set status='processando' where id=v_payment.id;
 update public.consultas set reserva_expira_em=null where id=v_payment.consulta_id and status='pendente_pago';
end; $$;
revoke all on function public.processar_pagamento_stripe(text) from public, anon, authenticated;
grant execute on function public.processar_pagamento_stripe(text) to service_role;
-- Indexes for ownership and dependent payment lookups.
create index if not exists consultas_cliente_id_idx on public.consultas(cliente_id);
create index if not exists pagamentos_consulta_id_idx on public.pagamentos(consulta_id);
commit;
