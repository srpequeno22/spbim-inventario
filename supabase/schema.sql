-- =====================================================================
-- SPBIM Inventário: banco de dados no Supabase
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run
-- =====================================================================

-- Cada linha guarda uma "coleção" do sistema como JSON
-- (items, cmp, per, assets, loans, maint, movs, acts, trash, hw, users, low).
create table if not exists public.inventario (
  chave          text primary key,
  dados          jsonb       not null,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid        default auth.uid()
);

-- Atualiza a data e o autor a cada alteração
create or replace function public.inventario_touch()
returns trigger language plpgsql as $$
begin
  new.atualizado_em  := now();
  new.atualizado_por := auth.uid();
  return new;
end $$;

drop trigger if exists inventario_touch on public.inventario;
create trigger inventario_touch
  before insert or update on public.inventario
  for each row execute function public.inventario_touch();

-- Permite que o site (via Data API) acesse a tabela; quem pode o quê é decidido pelas policies abaixo
grant select, insert, update on public.inventario to authenticated;
revoke all on public.inventario from anon;

-- Segurança: só usuários logados (criados por você no painel) leem e gravam.
-- Visitantes anônimos não veem nada, mesmo tendo a chave pública do site.
alter table public.inventario enable row level security;

drop policy if exists "logados leem"     on public.inventario;
drop policy if exists "logados inserem"  on public.inventario;
drop policy if exists "logados alteram"  on public.inventario;

create policy "logados leem"    on public.inventario for select to authenticated using (true);
create policy "logados inserem" on public.inventario for insert to authenticated with check (true);
create policy "logados alteram" on public.inventario for update to authenticated using (true) with check (true);

-- Tempo real: quando um colega salva, a tela dos outros atualiza sozinha
do $$
begin
  alter publication supabase_realtime add table public.inventario;
exception when duplicate_object then null;
end $$;
