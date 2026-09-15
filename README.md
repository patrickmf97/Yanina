# Site da Yani — Psicóloga

## Como configurar

1. **Supabase**
   - Crie um projeto em https://supabase.com
   - Vá em `SQL Editor` → cole o conteúdo de `supabase/schema.sql` → Run
   - Vá em `Project Settings > API`, copie a `URL` e a `anon public key`
   - Copie `.env.example` para `.env` e preencha essas duas variáveis

2. **Horários disponíveis (temporário, até o Painel Admin ficar pronto)**
   - No Supabase, vá em `Table Editor > disponibilidade`
   - Insira linhas manualmente, ex: `dia_semana: 1` (segunda), `hora: 14:00:00`, `ativo: true`
   - `dia_semana` vai de 0 (domingo) a 6 (sábado)

3. **Deploy**
   - Suba a pasta pro GitHub (dá pra fazer pelo navegador, sem terminal)
   - Conecte o repositório no Vercel
   - Nas configurações do projeto no Vercel, adicione as mesmas variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
   - Deploy automático a cada push

## O que já funciona
- Página de apresentação (ES/PT)
- Cadastro e login de cliente (Supabase Auth)
- Agendamento: cliente vê horários livres dos próximos 7 dias e reserva um

## Próximas etapas
- Integração de pagamento (Mercado Pago) — vai travar a consulta em "confirmada" só depois do pagamento aprovado
- Painel administrativo (login da Yani, edição de perfil, gestão de horários, ver todos os agendamentos)
- Dashboard de faturamento
