# Yanina — consultas online

React 18, Vite, Supabase Auth/Postgres e Stripe Checkout hospedado. Interface ES/PT para apresentação, agendamento, consultas do paciente e administração. Preserva o conteúdo e a arquitetura do projeto original.

## Desenvolvimento e validação

Requer Node >=22.12.0.

```sh
npm ci
cp .env.example .env.local
npm run dev
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

`vite` serve o frontend. Para executar também `/api`, use `vercel dev` com o projeto vinculado e as variáveis de servidor configuradas. Não coloque segredos em variáveis `VITE_`.

Os testes de navegador iniciam o frontend com Supabase/Stripe simulados, sem enviar e-mails nem cobrar. Os testes Node executam os handlers com contratos simulados e verificam assinaturas de webhook com o SDK Stripe real. O teste de banco executa SQL e RLS em PostgreSQL via PGlite, incluindo repetição da migração. Esses testes não substituem homologação com Supabase Auth, entrega de e-mail, Stripe test mode e Vercel reais.

## Banco e implantação

Para um banco novo, aplique nesta ordem: `supabase/schema.sql`, `supabase/admin_schema.sql`, `supabase/pagamento_schema.sql`, depois `supabase/migrations/20260915_stripe_booking.sql`. No banco existente, aplique somente a migração após confirmar que os três schemas base já existem.

A migração mantém referências antigas do Mercado Pago para histórico, adiciona Stripe, cria perfis no cadastro, protege links e centraliza reservas. Ela remove a inserção direta de consultas pelos pacientes: coordene aplicação da migração com a publicação desta versão. Não execute os schemas base novamente sobre produção.

1. Prepare um ambiente de homologação com as variáveis de `.env.example`. Use chave Stripe de teste e chave Supabase de servidor apenas no backend.
2. Aplique a migração nesse ambiente e publique a versão correspondente.
3. Supabase Auth: ative confirmação de e-mail, configure Site URL e permita os retornos `/mis-consultas` e `/redefinir-senha` da origem publicada. Configure SMTP para entrega confiável. Confirme essas rotas no código ao personalizar templates.
4. A conta da profissional deve existir em Auth e ter seu UUID em `public.admins`. Preserve os administradores existentes.
5. No painel `/admin`, salve perfil, preço positivo, moeda e horários reais. Não existe preço comercial inventado no código.
6. Crie o webhook Stripe para `https://SEU-DOMINIO/api/webhook-stripe`, eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `checkout.session.expired`. Configure o segredo desse endpoint em `STRIPE_WEBHOOK_SECRET` e faça novo deploy.
7. Valide cadastro com recebimento de e-mail, redefinição de senha, compra com cartão de teste aprovado/recusado, abandono/retomada, webhook e link da consulta. Confira a consulta no banco e a sessão recuperada pelo backend.
8. Somente depois faça a implantação coordenada em produção. A ativação de cobranças reais exige credenciais e webhook do modo de produção.

## Regras implementadas

- Agenda no fuso `America/Argentina/Buenos_Aires`, próximos 14 dias, antecedência mínima de 1 hora, sessão de 50 minutos e bloqueio de sobreposições.
- Uma reserva pendente por paciente; retenção de 35 minutos. O Checkout deve ser criado logo após reservar: o Stripe exige pelo menos 30 minutos até expirar. Uma sessão aberta já criada pode ser retomada até sua expiração.
- Valor e moeda vêm do banco, ficam congelados na reserva e são comparados ao Stripe no servidor. Nenhum parâmetro de retorno confirma pagamento por si só.
- Checkout com chave de idempotência evita sessões duplicadas. Processamento assíncrono mantém a reserva até evento final.
- Webhook assinado e consulta autenticada de status recuperam a sessão diretamente do Stripe. Pagamento atrasado de reserva já cancelada é registrado para conciliação; não ocupa novamente um horário liberado.
- `minhas_consultas` retorna apenas dados do próprio paciente e libera o link somente em consultas confirmadas/realizadas. A leitura direta da coluna do link é bloqueada para clientes.
- Administração usa `consultas_admin`, protegida por verificação no banco. Horários e perfil mantêm RLS. Links aceitam somente HTTPS.
- Reembolsos e conciliação excepcional permanecem operações administrativas no Stripe; não há automação de reembolso nesta versão.

## Rotas

`/`, `/cadastro`, `/entrar`, `/recuperar`, `/redefinir-senha`, `/agendar`, `/mis-consultas`, `/admin`.

O endpoint antigo do Mercado Pago retorna 410. Não configure novos pagamentos nele.
