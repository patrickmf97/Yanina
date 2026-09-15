-- Rode este script no SQL Editor do Supabase (Project > SQL Editor > New query)

-- 1. Perfil da psicóloga (dados editáveis pelo painel admin)
create table perfil_psicologa (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  titulo text,
  bio text,
  frase text,
  cita text,
  foto_url text,
  email_contato text,
  instagram text,
  ubicacion text,
  actualizado_em timestamptz default now()
);

-- 2. Dados do cliente/paciente (complementa auth.users do Supabase Auth)
create table clientes (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  telefone text,
  criado_em timestamptz default now()
);

-- 3. Disponibilidade semanal recorrente definida pela admin
create table disponibilidade (
  id uuid primary key default gen_random_uuid(),
  dia_semana int not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora time not null,
  ativo boolean default true
);

-- 4. Consultas agendadas
create table consultas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  data_hora timestamptz not null,
  status text not null default 'pendente_pago' check (status in ('pendente_pago', 'confirmada', 'realizada', 'cancelada')),
  link_chamada text,
  criado_em timestamptz default now(),
  unique (data_hora) -- impede dois clientes agendarem o mesmo horário
);

-- 5. Pagamentos (vinculados 1:1 a uma consulta)
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid references consultas(id) on delete cascade,
  valor numeric(10,2) not null,
  moeda text not null default 'ARS',
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado', 'reembolsado')),
  mercadopago_payment_id text,
  criado_em timestamptz default now()
);

-- === Row Level Security ===
alter table clientes enable row level security;
alter table consultas enable row level security;
alter table pagamentos enable row level security;
alter table perfil_psicologa enable row level security;
alter table disponibilidade enable row level security;

-- Cliente só vê/edita seus próprios dados
create policy "Cliente vê seu próprio perfil" on clientes
  for select using (auth.uid() = id);
create policy "Cliente edita seu próprio perfil" on clientes
  for update using (auth.uid() = id);
create policy "Cliente se cadastra" on clientes
  for insert with check (auth.uid() = id);

-- Cliente só vê/cria suas próprias consultas
create policy "Cliente vê suas consultas" on consultas
  for select using (auth.uid() = cliente_id);
create policy "Cliente cria consulta" on consultas
  for insert with check (auth.uid() = cliente_id);

-- Cliente só vê seus próprios pagamentos
create policy "Cliente vê seus pagamentos" on pagamentos
  for select using (
    exists (select 1 from consultas where consultas.id = pagamentos.consulta_id and consultas.cliente_id = auth.uid())
  );

-- Perfil e disponibilidade são públicos para leitura (qualquer visitante vê a página)
create policy "Perfil é público" on perfil_psicologa for select using (true);
create policy "Disponibilidade é pública" on disponibilidade for select using (true);

-- NOTA: as policies de escrita para a ADMIN (Yani editar perfil, ver todas as consultas
-- e pagamentos, gerenciar disponibilidade) serão adicionadas na etapa do Painel Admin,
-- usando uma tabela/role de admin dedicada — para não misturar permissão de admin
-- com a de cliente comum.
