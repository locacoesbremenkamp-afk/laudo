import { supabase, isSupabaseConfigured } from "./supabase";

export const BUCKET = "rzv-engenharia";

// Limites alinhados com a configuração do bucket no Supabase (supabase/storage-bucket.sql)
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1920;
const JPEG_QUALITY = 0.82;

export type UploadedFile = { url: string; type: "image" | "video" | "pdf" | "document" };

// Alguns celulares/computadores não informam o tipo de .doc/.xls: deduz pela extensão.
const EXT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function safeName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .slice(-60);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${rand}-${base || "arquivo"}`;
}

/**
 * Reduz fotos grandes de celular (5–15 MB) para ~300–800 KB antes do envio.
 * GIFs e imagens que não podem ser lidas pelo navegador seguem sem alteração.
 */
async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // Formatos como HEIC em alguns navegadores: envia o original.
    return file;
  }
}

function friendlyError(message: string) {
  if (/bucket not found/i.test(message)) {
    return `A pasta de arquivos "${BUCKET}" não existe no Supabase. Avise o administrador do sistema.`;
  }
  if (/row-level security|unauthorized|403/i.test(message)) {
    return "O Supabase recusou o envio (permissão). Avise o administrador do sistema.";
  }
  if (/mime type|not supported|invalid_mime/i.test(message)) {
    return "Tipo de arquivo não aceito. Envie foto, vídeo, PDF, Word ou Excel.";
  }
  if (/payload too large|exceeded the maximum/i.test(message)) {
    return "Arquivo grande demais. O limite é 50 MB por arquivo.";
  }
  return message;
}

/**
 * Envia um arquivo direto do navegador para o Supabase Storage.
 * Não passa pela Vercel, então não sofre o limite de 4,5 MB das funções.
 * Lança um erro com mensagem em português se o envio falhar.
 */
export async function uploadFile(file: File | Blob, folder: string, originalName?: string): Promise<UploadedFile> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado neste ambiente.");
  }

  const name = originalName || (file instanceof File ? file.name : "arquivo");
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const mime = file.type || EXT_TYPES[ext] || "application/octet-stream";
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isPdf = mime === "application/pdf";

  let body: Blob = file;
  let finalName = name;
  if (isImage && file instanceof File) {
    body = await compressImage(file);
    if (body !== file) finalName = name.replace(/\.[^.]+$/, "") + ".jpg";
  }

  if (body.size > MAX_FILE_BYTES) {
    throw new Error(`"${name}" tem ${(body.size / 1024 / 1024).toFixed(1)} MB. O limite é 50 MB por arquivo.`);
  }

  const path = `${folder}/${safeName(finalName)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: body.type || mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(friendlyError(error.message));

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, type: isImage ? "image" : isVideo ? "video" : isPdf ? "pdf" : "document" };
}
