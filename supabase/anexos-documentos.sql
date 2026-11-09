-- Permite anexar documentos do Word e Excel (além de fotos, vídeos e PDF)
-- na pasta de arquivos do app. Não altera nenhum arquivo já enviado.
-- Onde rodar: Supabase > SQL Editor > New query > colar > Run.
update storage.buckets
set allowed_mime_types = array[
  'image/*',
  'video/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
where id = 'rzv-engenharia';

select id, allowed_mime_types, file_size_limit from storage.buckets where id = 'rzv-engenharia';
