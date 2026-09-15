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

## Próximas etapas
- Integração de pagamento (Mercado Pago) — vai travar a consulta em "confirmada" só depois do pagamento aprovado
- Dashboard de faturamento (receita, inadimplência)
