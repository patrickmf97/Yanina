export const uid = "00000000-0000-4000-8000-000000000001";
const adminId = "00000000-0000-4000-8000-000000000002";
export function session(admin = false) {
  const id = admin ? adminId : uid;
  return {
    access_token: `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.fixture`,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id,
      aud: "authenticated",
      role: "authenticated",
      email: admin ? "admin@example.test" : "patient@example.test",
      app_metadata: { provider: "email" },
      user_metadata: { nombre: "Paciente Teste" },
      created_at: new Date().toISOString(),
    },
  };
}
export async function setup(
  page,
  { loggedIn = false, admin = false, payments = "pending" } = {},
) {
  const auth = session(admin),
    requests = [];
  let confirmationRequired = true;
  let profile = {
    id: "profile1",
    nombre: "Yanina",
    precio_consulta: 12000,
    moeda_consulta: "ARS",
    titulo: "Psicóloga",
    bio: "Un espacio de escucha.",
    frase: "Volver a vos, a tu propio ritmo.",
  };
  const future = new Date(Date.now() + 2 * 86400000);
  future.setUTCHours(17, 0, 0, 0);
  let slots = [
    { data_hora: future.toISOString() },
    { data_hora: new Date(+future + 86400000).toISOString() },
  ];
  let schedules = [
    { id: "schedule1", dia_semana: 1, hora: "14:00:00", ativo: true },
  ];
  let appointments = [
    {
      id: "00000000-0000-4000-8000-000000000005",
      data_hora: future.toISOString(),
      status: "pendente_pago",
      reserva_expira_em: new Date(Date.now() + 35 * 60000).toISOString(),
      link_chamada: null,
      clientes: { nombre: "Paciente Teste", telefone: "" },
      pagamentos: [{ valor: 12000, moeda: "ARS", status: "pendente" }],
    },
    {
      id: "00000000-0000-4000-8000-000000000006",
      data_hora: new Date(+future + 86400000).toISOString(),
      status: "confirmada",
      link_chamada: "https://meet.google.com/test-session",
      clientes: { nombre: "Paciente Teste", telefone: "" },
      pagamentos: [{ valor: 12000, moeda: "ARS", status: "aprovado" }],
    },
  ];
  if (loggedIn)
    await page.addInitScript(
      (auth) =>
        localStorage.setItem("sb-fixture-auth-token", JSON.stringify(auth)),
      auth,
    );
  await page.route("https://fixture.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname,
      method = req.method();
    let body;
    try {
      body = req.postDataJSON();
    } catch {}
    requests.push({ path, method, body, url: url.href });
    const send = (value, status = 200, headers = {}) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers,
        body: JSON.stringify(value),
      });
    if (path.endsWith("/signup")) {
      confirmationRequired = true;
      return send({ user: auth.user, session: null });
    }
    if (path.endsWith("/token")) {
      if (body.password === "Wrong-password")
        return send({ msg: "Invalid login credentials" }, 400);
      if (body.password === "Unconfirmed-password")
        return send({ msg: "Email not confirmed" }, 400);
      return send(auth);
    }
    if (path.endsWith("/user")) return send(auth.user);
    if (path.endsWith("/recover")) return send({});
    if (path.endsWith("/logout")) return send({});
    if (path.endsWith("/admins")) return send(admin ? { id: adminId } : null);
    if (path.endsWith("/rpc/horarios_livres")) return send(slots);
    if (path.endsWith("/rpc/reservar_consulta"))
      return send(appointments[0].id);
    if (
      path.endsWith("/rpc/minhas_consultas") ||
      path.endsWith("/rpc/consultas_admin")
    )
      return send(appointments);
    if (path.endsWith("/perfil_psicologa")) {
      if (method === "PATCH") profile = { ...profile, ...body };
      return send(profile);
    }
    if (path.endsWith("/disponibilidade")) {
      if (method === "POST")
        schedules.push({ id: "schedule2", ...body, hora: body.hora + ":00" });
      if (method === "DELETE")
        schedules = schedules.filter(
          (x) => "eq." + x.id !== url.searchParams.get("id"),
        );
      return send(schedules);
    }
    if (path.endsWith("/consultas")) {
      if (method === "PATCH") {
        appointments = appointments.map((c) =>
          "eq." + c.id === url.searchParams.get("id") ? { ...c, ...body } : c,
        );
        return send(null);
      }
      return send([], 200, { "content-range": "0-1/2" });
    }
    if (path.endsWith("/pagamentos"))
      return send([
        {
          valor: 12000,
          moeda: "ARS",
          status: "aprovado",
          criado_em: new Date().toISOString(),
          pago_em: new Date().toISOString(),
        },
      ]);
    return send({ message: "unhandled fixture path" }, 404);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    requests.push({
      path: new URL(req.url()).pathname,
      method: req.method(),
      body: req.postData(),
    });
    if (req.url().includes("status-pagamento"))
      return route.fulfill({
        json:
          payments === "approved"
            ? { paid: true, confirmed: true, status: "complete" }
            : { paid: false, confirmed: false, status: "open" },
      });
    return route.fulfill({
      json: { url: "https://checkout.stripe.com/c/pay/test-fixture" },
    });
  });
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Stripe fixture checkout</h1>",
    }),
  );
  return { requests, auth, setAppointments: (value) => (appointments = value) };
}
