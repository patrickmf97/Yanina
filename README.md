# Site da Yani — Psicóloga

## Como configurar

1. **Supabase**
   - Crie um projeto em https://supabase.com
   - Vá em `SQL Editor` → cole o conteúdo de `supabase/schema.sql` → Run
   - Cole também o conteúdo de `supabase/admin_schema.sql` → Run (cria as permissões de administradora)
   - Vá em `Project Settings > API`, copie a `URL` e a `anon public key`
   - Copie `.env.example` para `.env` e preencha essas duas variáveis

2. **Tornar a Yani administradora**
   - Ela precisa criar uma conta normal primeiro: acesse `/cadastro` no site e cadastre-se com o e-mail dela
   - No Supabase, vá em `Authentication > Users`, copie o UUID da conta dela
   - Vá em `Table Editor > admins` → Insert row → cole o UUID no campo `id`
   - Pronto: agora ela consegue entrar em `/admin` com esse e-mail/senha e ver o painel

3. **Horários disponíveis**
   - Antes só dava pra inserir direto no Supabase — agora a Yani mesma gerencia isso em `/admin`, aba "Horarios"

4. **Mercado Pago**
   - Rode `supabase/pagamento_schema.sql` no SQL Editor (adiciona o campo de preço)
   - Crie uma conta em https://www.mercadopago.com.ar (ou use a que a Yani já tem)
   - Vá em `Seu negocio > Configuración > Credenciales de producción` e copie o **Access Token**
   - Na Vercel, adicione as variáveis de ambiente (Settings > Environment Variables), como **Config** (não Secret, porque essas não têm o prefixo `VITE_` — não são expostas ao navegador de qualquer forma, já que só rodam no servidor):
     - `SUPABASE_URL` (mesma URL do projeto, sem o `VITE_`)
     - `SUPABASE_SERVICE_ROLE_KEY` (em `Project Settings > API > service_role` no Supabase — **NUNCA** compartilhe essa chave, ela ignora todas as regras de segurança)
     - `MERCADOPAGO_ACCESS_TOKEN`
     - `SITE_URL` (ex: `https://yaniterapia.vercel.app`)
   - No painel admin (`/admin` → aba Perfil), defina o **preço da consulta** — sem isso o pagamento não é criado
   - Para testar sem cobrar de verdade, use as **credenciais de teste** do Mercado Pago (mesma tela, aba "Credenciales de prueba") e os [cartões de teste deles](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)

3. **Deploy**
   - Suba a pasta pro GitHub (dá pra fazer pelo navegador, sem terminal)
   - Conecte o repositório no Vercel
   - Nas configurações do projeto no Vercel, adicione as mesmas variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
   - Deploy automático a cada push

## O que já funciona
- Página de apresentação (ES/PT), com conteúdo puxado do banco (editável pelo admin)
- Cadastro e login de cliente (Supabase Auth)
- Agendamento: cliente vê horários livres dos próximos 7 dias e reserva um
- Painel admin (`/admin`): editar perfil, gerenciar horários disponíveis, ver todas as consultas e mudar status
- Pagamento real via Mercado Pago: ao confirmar, cliente é redirecionado pro checkout; a consulta só vira "confirmada" depois do pagamento aprovado (via webhook) — **configuração das credenciais ainda pendente**
- Dashboard de faturamento (aba "Facturación" no admin): receita total, receita do mês, consultas confirmadas, taxa de inadimplência e gráfico dos últimos 6 meses

## Próximas etapas
- Configurar as credenciais reais do Mercado Pago (pendente — falta acesso à conta da Yani)
- Design visual final (a versão atual é só funcional — o visual bonito fica pra etapa final)
