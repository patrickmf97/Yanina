# Yanina | Psicologia Online

Projeto desenvolvido pela **ConvertaStudio** para transformar a presença digital da psicóloga Yanina em uma experiência completa de atendimento online.

Mais do que uma página de apresentação, o site foi pensado para facilitar o caminho entre conhecer o trabalho da profissional e marcar uma consulta: o paciente pode conhecer a proposta de atendimento, criar sua conta, consultar horários disponíveis, agendar e acompanhar suas consultas em um único lugar.

🌐 **Site:** https://yaniterapia.vercel.app

## Sobre o projeto

A proposta da ConvertaStudio é criar **sites que geram clientes** e resolvem necessidades reais do negócio. No projeto da Yanina, isso significou unir apresentação profissional, agendamento e gestão em uma mesma plataforma, reduzindo etapas para o paciente e dando mais autonomia para a profissional.

O site possui interface em espanhol e português e foi desenvolvido pensando principalmente no atendimento online e na experiência em dispositivos móveis.

## Principais funcionalidades

- Site institucional responsivo em espanhol e português
- Cadastro, login e recuperação de conta
- Agenda com horários disponíveis em tempo real
- Reserva de consultas com proteção contra conflitos de horário
- Área **Mis Consultas** para acompanhamento dos agendamentos
- Checkout integrado ao Stripe
- Painel administrativo para gerenciamento do perfil, horários e consultas
- Dashboard de faturamento
- Controle de acesso e dados com Supabase Auth e RLS

## Tecnologias

O projeto foi construído com **React**, **Vite**, **Supabase** e **Stripe**, com deploy pela **Vercel**.

No backend, as funções responsáveis por reservas e pagamentos validam os dados no servidor antes de criar uma cobrança. O valor da consulta e a moeda são definidos no painel/banco, evitando depender de valores fixos no frontend.

## Agenda e consultas

A agenda trabalha com o fuso de `America/Argentina/Buenos_Aires` e disponibiliza os próximos 14 dias. Cada consulta possui duração de 50 minutos e o sistema impede reservas sobrepostas.

Ao selecionar um horário, o paciente cria uma reserva vinculada à própria conta. Consultas e links de atendimento ficam protegidos pelas regras de acesso do banco e só são exibidos ao usuário correspondente.

## Pagamentos

O fluxo de pagamento utiliza o Stripe Checkout. A confirmação não depende apenas do retorno do navegador: o status é validado pelo backend e pelos eventos recebidos através do webhook do Stripe.

O projeto mantém referências da integração anterior com Mercado Pago apenas por compatibilidade com dados históricos. Novos pagamentos utilizam Stripe.

## Rodando localmente

Requer Node.js 22.12 ou superior.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

As variáveis necessárias estão documentadas em `.env.example`. Chaves privadas do Supabase e Stripe devem permanecer somente no backend e nunca utilizar o prefixo `VITE_`.

Para executar o frontend junto das funções da pasta `/api`, utilize:

```bash
vercel dev
```

## Testes

O projeto possui testes para os principais fluxos de navegador, banco de dados, reservas e pagamentos.

```bash
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

## Estrutura do banco

Para uma instalação nova do Supabase, os scripts devem ser aplicados nesta ordem:

```text
supabase/schema.sql
supabase/admin_schema.sql
supabase/pagamento_schema.sql
supabase/migrations/20260915_stripe_booking.sql
```

Em um banco já existente, os schemas base não devem ser executados novamente. Nesse caso, aplique somente as migrations necessárias após conferir o estado atual do banco.

## ConvertaStudio

A **ConvertaStudio** desenvolve sites e aplicações web para transformar presença digital em resultado: mais credibilidade, uma experiência profissional para o cliente e caminhos mais simples para contato, agendamento e conversão.

Este projeto é um exemplo dessa proposta aplicada a um atendimento profissional que precisava ir além de um site institucional tradicional.

---

Desenvolvido por **Patrick Morais Ferreira — ConvertaStudio**.