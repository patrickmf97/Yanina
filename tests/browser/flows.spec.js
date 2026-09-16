import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setup } from "./fixtures.js";
test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      ["error", "warning"].includes(m.type()) &&
      !m.text().includes("Failed to load resource")
    )
      errors.push(m.text());
  });
  page.__errors = errors;
});
test.afterEach(async ({ page }, info) => {
  expect(page.__errors, "unexpected browser errors or warnings").toEqual([]);
  if (!page.isClosed())
    await page.screenshot({
      path: info.outputPath("screen.png"),
      fullPage: true,
    });
});
test("home: responsive layout, language, FAQ and accessibility", async ({
  page,
}) => {
  await setup(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "PT", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await page.locator("summary").first().click();
  await expect(page.locator("details[open]")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
test("signup with confirmation, rejected login and confirmed session", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/cadastro");
  await page.getByLabel("Nombre completo").fill("Paciente Teste");
  await page.getByLabel("Correo electrónico").fill("patient@example.test");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Test-password-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("status")).toContainText("confirmar la cuenta");
  expect(
    f.requests.some((r) => r.path.endsWith("clientes") && r.method === "POST"),
  ).toBe(false);
  const signup = f.requests.find((r) => r.path.endsWith("/signup"));
  expect(signup.body.data.nombre).toBe("Paciente Teste");
  await page.goto("/entrar");
  await page.getByLabel("Correo electrónico").fill("patient@example.test");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Unconfirmed-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Test-password-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/agendar/);
  await expect(
    page.getByRole("link", { name: "Mis consultas", exact: true }),
  ).toBeVisible();
});
test("email confirmation callback creates session from token", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto(
    `/mis-consultas#access_token=${f.auth.access_token}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=signup`,
  );
  await expect(page.locator(".consultation-card")).toHaveCount(2);
});
test("password recovery request and valid recovery callback", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/recuperar");
  await page.getByLabel("Correo electrónico").fill("patient@example.test");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText("recibirás un enlace");
  await page.goto(
    `/redefinir-senha#access_token=${f.auth.access_token}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=recovery`,
  );
  await page
    .getByLabel("Nueva contraseña", { exact: true })
    .fill("A-new-password-123");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/mis-consultas/);
  expect(
    f.requests.some((r) => r.path.endsWith("/user") && r.method === "PUT"),
  ).toBe(true);
});
test("expired recovery link cannot update password", async ({ page }) => {
  await setup(page);
  await page.goto(
    "/redefinir-senha#error=access_denied&error_description=Expired",
  );
  await expect(
    page.getByRole("button", { name: "Guardar contraseña" }),
  ).toBeDisabled();
});
test("booking, price, authenticated server request and Stripe redirect", async ({
  page,
}) => {
  const f = await setup(page, { loggedIn: true });
  await page.goto("/agendar");
  await page.locator(".agendar-slot").first().click();
  await expect(
    page.getByRole("button", { name: "Confirmar y pagar" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Confirmar y pagar" }).click();
  await expect(page).toHaveURL(/checkout.stripe.com/);
  expect(f.requests.some((r) => r.path.endsWith("reservar_consulta"))).toBe(
    true,
  );
  expect(f.requests.some((r) => r.path === "/api/criar-pagamento")).toBe(true);
});
test("my appointments hide pending links and allow resume", async ({
  page,
}) => {
  await setup(page, { loggedIn: true });
  await page.goto("/mis-consultas");
  await expect(page.locator(".consultation-card")).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "Entrar a la sesión" }),
  ).toHaveCount(1);
  expect(
    await page
      .getByRole("link", { name: "Entrar a la sesión" })
      .getAttribute("href"),
  ).toBe("https://meet.google.com/test-session");
  await page.getByRole("button", { name: "Continuar al pago" }).click();
  await expect(page).toHaveURL(/checkout.stripe.com/);
});
test("forged return URL never displays approved payment", async ({ page }) => {
  await setup(page, { loggedIn: true });
  await page.goto("/agendar?pago=ok");
  await expect(
    page.getByText("¡Pago aprobado! Tu consulta está confirmada."),
  ).toHaveCount(0);
  await page.goto("/agendar?session_id=cs_fixture");
  await expect(
    page.getByRole("status").filter({ hasText: "todavía no está confirmada" }),
  ).toBeVisible();
});
test("verified server response confirms; cancelled checkout remains pending", async ({
  page,
}) => {
  await setup(page, { loggedIn: true, payments: "approved" });
  await page.goto("/agendar?session_id=cs_fixture");
  await expect(
    page.getByRole("status").filter({ hasText: "Pago aprobado" }),
  ).toContainText("Pago aprobado");
  await page.goto("/agendar?cancelado=1");
  await expect(page.getByText(/El pago no se completó/)).toBeVisible();
});
test("admin gate prevents patient access", async ({ page }) => {
  await setup(page, { loggedIn: true });
  await page.goto("/admin");
  await expect(
    page.getByText("Esta cuenta no tiene permisos de administradora."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Perfil", exact: true }),
  ).toHaveCount(0);
});
test("professional edits profile, creates/removes hours, manages session links and sees billing", async ({
  page,
}) => {
  const f = await setup(page, { loggedIn: true, admin: true });
  await page.goto("/admin");
  await page.getByLabel("Nombre completo").fill("Yanina");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.getByRole("button", { name: "Horarios", exact: true }).click();
  await page.getByLabel("Hora", { exact: true }).fill("16:00");
  await page.getByRole("button", { name: "Agregar horario" }).click();
  await expect(page.locator(".horario-item")).toHaveCount(2);
  await page
    .locator(".horario-item")
    .last()
    .getByRole("button", { name: "Quitar" })
    .click();
  await expect(page.locator(".horario-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Consultas", exact: true }).click();
  await page
    .locator(".admin-appointment")
    .first()
    .getByLabel("Enlace de videollamada")
    .fill("https://meet.google.com/new-link");
  await page
    .locator(".admin-appointment")
    .first()
    .getByRole("button", { name: "Guardar cambios" })
    .click();
  expect(
    f.requests.some(
      (r) =>
        r.path.endsWith("/consultas") &&
        r.body.link_chamada === "https://meet.google.com/new-link",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Facturación" }).click();
  await expect(page.locator(".faturamento-card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("processing payment has no second checkout or session link", async ({
  page,
}) => {
  const f = await setup(page, { loggedIn: true });
  f.setAppointments([
    {
      id: "processing",
      data_hora: new Date(Date.now() + 86400000).toISOString(),
      status: "pendente_pago",
      reserva_expira_em: null,
      link_chamada: null,
      pagamentos: [{ valor: 12000, moeda: "ARS", status: "processando" }],
    },
  ]);
  await page.goto("/mis-consultas");
  await expect(page.locator(".consultation-card")).toHaveCount(1);
  await expect(page.locator(".consultation-actions button")).toHaveCount(0);
  await expect(page.locator(".consultation-actions a")).toHaveCount(0);
});

test("API failure preserves pending appointment and allows retry", async ({
  page,
}) => {
  await setup(page, { loggedIn: true });
  await page.route("**/api/criar-pagamento", (route) =>
    route.fulfill({ status: 503, json: { error: "PAYMENTS_UNAVAILABLE" } }),
  );
  await page.goto("/mis-consultas");
  const resume = page.locator(".consultation-actions button");
  await resume.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(resume).toBeEnabled();
  await expect(page.locator(".consultation-card")).toHaveCount(2);
});

test("professional cannot add duplicate time through the form", async ({
  page,
}) => {
  const f = await setup(page, { loggedIn: true, admin: true });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Horarios", exact: true }).click();
  await page.getByRole("button", { name: "Agregar horario" }).click();
  await expect(page.getByRole("alert")).toContainText("Ese horario ya existe");
  expect(
    f.requests.some(
      (r) => r.path.endsWith("/disponibilidade") && r.method === "POST",
    ),
  ).toBe(false);
});
