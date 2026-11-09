-- Ajuste do seguranca.sql: as funções passam a respeitar o tipo real de cada
-- coluna (no banco, "suggested_date" é texto e alguns chamados têm valor vazio).
-- Não altera dados. Pode rodar mais de uma vez.
-- Onde rodar: Supabase > SQL Editor > New query > colar > Run.

-- Quadro público: devolve tudo como texto (datas em formato ISO).
drop function if exists public.public_board();
create function public.public_board()
returns table (
  id bigint, company_name text, unit text, claimant_name text, budget_number text,
  urgency text, status text, created_at text, suggested_date text, description text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id::bigint,
         r.company_name::text,
         r.unit::text,
         r.claimant_name::text,
         r.budget_number::text,
         r.urgency::text,
         r.status::text,
         to_json(r.created_at) #>> '{}',
         nullif(to_json(r.suggested_date) #>> '{}', ''),
         r.description::text
  from requests r
  order by r.created_at desc
$$;
revoke all on function public.public_board() from public;
grant execute on function public.public_board() to anon, authenticated;

-- Formulário público: converte cada campo para o tipo real da coluna
-- (jsonb_populate_record) e ignora campos vazios.
create or replace function public.create_request(payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  clean jsonb;
  rec requests;
  new_id bigint;
begin
  if coalesce(trim(payload->>'company_name'), '') = '' or coalesce(trim(payload->>'description'), '') = '' then
    raise exception 'Preencha a empresa e a descrição do problema.';
  end if;

  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into clean
  from jsonb_each(payload)
  where key in ('company_name','unit','responsible_name','phone','role','address','lat','lng',
                'claimant_name','claimant_phone','budget_number','description','urgency','suggested_date')
    and value not in ('null'::jsonb, '""'::jsonb);

  rec := jsonb_populate_record(null::requests, clean);

  insert into requests (
    company_name, unit, responsible_name, phone, role, address, lat, lng,
    claimant_name, claimant_phone, budget_number, description, urgency, suggested_date
  ) values (
    left(rec.company_name, 200), left(rec.unit, 100), left(rec.responsible_name, 200), left(rec.phone, 50),
    left(rec.role, 200), left(rec.address, 500), rec.lat, rec.lng,
    left(rec.claimant_name, 200), left(rec.claimant_phone, 50), left(rec.budget_number, 100),
    left(rec.description, 5000), coalesce(rec.urgency, 'Média'), rec.suggested_date
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

-- Conferência: deve listar a quantidade de chamados sem erro
select count(*) as chamados_no_quadro from public.public_board();
