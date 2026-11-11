-- =====================================================================
-- SPBIM Inventário: banco de dados no Supabase
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run
-- (pode rodar de novo sem problema: ele atualiza o que já existe)
--
-- Arquitetura: navegador -> API (Vercel, pasta /api) -> Supabase.
-- O navegador NÃO acessa a tabela. Só a API, com a chave secreta.
-- =====================================================================

-- Cada linha guarda uma "coleção" do sistema como JSON
-- (items, cmp, per, assets, loans, maint, movs, acts, trash, hw, users, low).
create table if not exists public.inventario (
  chave          text primary key,
  dados          jsonb       not null,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

-- Atualiza a data a cada alteração. O autor vem da API (que já conferiu o login).
create or replace function public.inventario_touch()
returns trigger language plpgsql as $$
begin
  new.atualizado_em  := clock_timestamp();
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  return new;
end $$;

drop trigger if exists inventario_touch on public.inventario;
create trigger inventario_touch
  before insert or update on public.inventario
  for each row execute function public.inventario_touch();

alter table public.inventario alter column atualizado_por drop default;

-- Usado pela atualização automática ("o que mudou desde...")
create index if not exists inventario_atualizado_em on public.inventario (atualizado_em);

-- Segurança: ninguém acessa a tabela pelo navegador, nem anônimo nem logado.
-- A chave publishable sozinha não lê nem grava nada.
-- Só a API (chave secreta / service_role) consegue, e ela confere o login antes.
revoke all on public.inventario from anon, authenticated;
alter table public.inventario enable row level security;

drop policy if exists "logados leem"     on public.inventario;
drop policy if exists "logados inserem"  on public.inventario;
drop policy if exists "logados alteram"  on public.inventario;
-- (sem policies = acesso negado para anon/authenticated; service_role ignora RLS)

-- O tempo real do Supabase não é mais usado (o site consulta a API a cada 15 s).
do $$
begin
  alter publication supabase_realtime drop table public.inventario;
exception when others then null;
end $$;
