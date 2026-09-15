-- Rode isso DEPOIS do schema.sql, também no SQL Editor do Supabase

-- Tabela de administradores (por enquanto, só a Yani)
create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz default now()
);

alter table admins enable row level security;

-- Cada admin só consegue ver que ELE é admin (não expõe a lista de admins a ninguém mais)
create policy "Admin vê a si mesmo" on admins
  for select using (auth.uid() = id);

-- === Perfil da psicóloga: só admin pode editar ===
create policy "Admin edita o perfil" on perfil_psicologa
  for update using (exists (select 1 from admins where admins.id = auth.uid()));
create policy "Admin insere o perfil" on perfil_psicologa
  for insert with check (exists (select 1 from admins where admins.id = auth.uid()));

-- === Disponibilidade: só admin gerencia horários ===
create policy "Admin gerencia disponibilidade (insert)" on disponibilidade
  for insert with check (exists (select 1 from admins where admins.id = auth.uid()));
create policy "Admin gerencia disponibilidade (update)" on disponibilidade
  for update using (exists (select 1 from admins where admins.id = auth.uid()));
create policy "Admin gerencia disponibilidade (delete)" on disponibilidade
  for delete using (exists (select 1 from admins where admins.id = auth.uid()));

-- === Consultas: admin vê e atualiza TODAS (não só as próprias) ===
create policy "Admin vê todas as consultas" on consultas
  for select using (exists (select 1 from admins where admins.id = auth.uid()));
create policy "Admin atualiza consultas" on consultas
  for update using (exists (select 1 from admins where admins.id = auth.uid()));

-- === Pagamentos: admin vê todos ===
create policy "Admin vê todos os pagamentos" on pagamentos
  for select using (exists (select 1 from admins where admins.id = auth.uid()));

-- === Clientes: admin vê todos (pra listar nome ao lado de cada consulta) ===
create policy "Admin vê todos os clientes" on clientes
  for select using (exists (select 1 from admins where admins.id = auth.uid()));

-- IMPORTANTE: depois de criar a conta da Yani pelo /cadastro (ou /admin) normalmente,
-- pegue o ID dela em Authentication > Users no Supabase e rode:
--
-- insert into admins (id) values ('COLE-O-UUID-DELA-AQUI');
