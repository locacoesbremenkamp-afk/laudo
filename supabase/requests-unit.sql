-- Adiciona a coluna "unidade" aos chamados (Viana, Serra, Linhares, Cariacica...).
-- Só ACRESCENTA uma coluna vazia: nenhum chamado existente é alterado ou apagado.
-- Onde rodar: Supabase > SQL Editor > New query > colar > Run.
alter table public.requests add column if not exists unit text;
