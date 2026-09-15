-- Rode isso no SQL Editor do Supabase (depois do schema.sql e admin_schema.sql)

alter table perfil_psicologa
  add column if not exists precio_consulta numeric(10,2) default 0;
