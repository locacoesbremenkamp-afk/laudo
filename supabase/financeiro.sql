-- Guarda os relatórios financeiros gerados no app (Financeiro > Relatórios salvos).
-- Só cria uma tabela nova: nenhum dado existente é alterado. Pode rodar mais de uma vez.
-- Precisa do supabase/seguranca.sql já aplicado (usa a função is_team).
-- Onde rodar: Supabase > SQL Editor > New query > colar > Run.

create table if not exists public.financial_reports (
  id bigserial primary key,
  doc_number text not null unique,
  client_name text,
  total numeric(12,2) not null default 0,
  items_count int not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_financial_reports_created on public.financial_reports (created_at desc);

alter table public.financial_reports enable row level security;
drop policy if exists "equipe RZV" on public.financial_reports;
create policy "equipe RZV" on public.financial_reports
  for all to authenticated
  using (public.is_team()) with check (public.is_team());

-- Conferência
select count(*) as relatorios_salvos from public.financial_reports;
