-- ============================================================================
-- Fecha o banco do app de Laudos.
-- Antes: a regra "Allow all" deixava QUALQUER pessoa ler, alterar e apagar
-- chamados, laudos e termos usando a chave pública que vai dentro do site.
-- Depois:
--   • visitante: só consegue ABRIR chamado (formulário) e ver o quadro público
--     (/acompanhamento) sem telefones nem endereços;
--   • equipe logada: vê e edita tudo, como hoje.
-- Nenhum dado é alterado ou apagado. Pode rodar mais de uma vez.
-- Onde rodar: Supabase > SQL Editor > New query > colar > Run.
-- ANTES de rodar: confirme que você consegue entrar no dashboard do site.
-- ============================================================================

-- 1. Coluna da unidade (se ainda não existir)
alter table public.requests add column if not exists unit text;

-- 2. Remove todas as regras antigas ("Allow all") destas tabelas
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('requests','attachments','reports','agreements','pre_sales','technical_visits')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3. Equipe: só as contas listadas aqui veem e editam os dados.
--    Entram automaticamente as contas que JÁ existem hoje no Supabase Auth.
--    Contas criadas depois NÃO entram sozinhas. Para incluir alguém:
--      insert into public.team_members (user_id, email)
--      select id, email from auth.users where email = 'pessoa@exemplo.com';
create table if not exists public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  added_at timestamptz not null default now()
);
alter table public.team_members enable row level security;  -- sem regras: ninguém lê pela API

insert into public.team_members (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from team_members where user_id = auth.uid())
$$;
revoke all on function public.is_team() from public;
grant execute on function public.is_team() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['requests','attachments','reports','agreements','pre_sales','technical_visits'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('create policy "equipe RZV" on public.%I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
    end if;
  end loop;
end $$;


-- 4. Formulário público: cria o chamado e os anexos, sem poder ler nada
create or replace function public.create_request(payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
begin
  if coalesce(trim(payload->>'company_name'), '') = '' or coalesce(trim(payload->>'description'), '') = '' then
    raise exception 'Preencha a empresa e a descrição do problema.';
  end if;

  insert into requests (
    company_name, unit, responsible_name, phone, role, address, lat, lng,
    claimant_name, claimant_phone, budget_number, description, urgency, suggested_date
  ) values (
    left(payload->>'company_name', 200),
    left(nullif(payload->>'unit', ''), 100),
    left(payload->>'responsible_name', 200),
    left(payload->>'phone', 50),
    left(payload->>'role', 200),
    left(payload->>'address', 500),
    nullif(payload->>'lat', '')::float8,
    nullif(payload->>'lng', '')::float8,
    left(payload->>'claimant_name', 200),
    left(payload->>'claimant_phone', 50),
    left(payload->>'budget_number', 100),
    left(payload->>'description', 5000),
    coalesce(nullif(payload->>'urgency', ''), 'Média'),
    nullif(payload->>'suggested_date', '')::date
  )
  returning id into new_id;

  -- Só aceita anexos guardados no armazenamento deste projeto.
  insert into attachments (request_id, url, type)
  select new_id, a->>'url', coalesce(a->>'type', 'image')
  from jsonb_array_elements(coalesce(payload->'attachments', '[]'::jsonb)) a
  where a->>'url' like 'https://pdygzwmwoulqnaypocvr.supabase.co/storage/v1/object/public/rzv-engenharia/%'
  limit 30;

  return new_id;
end $$;

revoke all on function public.create_request(jsonb) from public;
grant execute on function public.create_request(jsonb) to anon, authenticated;

-- 5. Quadro público (/acompanhamento): só campos seguros
drop function if exists public.public_board();
create function public.public_board()
returns table (
  id bigint, company_name text, unit text, claimant_name text, budget_number text,
  urgency text, status text, created_at timestamptz, suggested_date date, description text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id::bigint, r.company_name::text, r.unit::text, r.claimant_name::text, r.budget_number::text,
         r.urgency::text, r.status::text, r.created_at::timestamptz, r.suggested_date::date, r.description::text
  from requests r
  order by r.created_at desc
$$;

revoke all on function public.public_board() from public;
grant execute on function public.public_board() to anon, authenticated;

-- Conferência: contas da equipe
select email, added_at from public.team_members order by added_at;
