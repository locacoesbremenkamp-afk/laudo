-- Cria a pasta de arquivos (bucket) usada pelo app de Laudos para fotos, vídeos e PDFs.
-- Seguro para rodar mais de uma vez: não apaga nem altera nenhum dado existente.
-- Onde rodar: Supabase > SQL Editor > New query > colar > Run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rzv-engenharia',
  'rzv-engenharia',
  true,                          -- as fotos aparecem no laudo por link público
  52428800,                      -- 50 MB por arquivo
  array['image/*', 'video/*', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- O formulário público e o editor de laudos enviam arquivos direto do navegador.
-- Esta regra permite só ENVIAR arquivos novos para este bucket. Ninguém de fora
-- consegue listar, apagar ou substituir arquivos existentes. As fotos continuam
-- visíveis pelo link de cada uma, porque o bucket é público.
drop policy if exists "rzv: enviar arquivos" on storage.objects;
create policy "rzv: enviar arquivos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'rzv-engenharia');
