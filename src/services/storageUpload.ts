import { supabase } from './supabase';

const DOCS_BUCKET =
  (import.meta.env.VITE_SUPABASE_DOCS_BUCKET as string | undefined) || 'nanny-documents';
const PHOTOS_BUCKET =
  (import.meta.env.VITE_SUPABASE_PHOTOS_BUCKET as string | undefined) || 'nanny-photos';

function getNowTs(): number {
  return Date.now();
}

async function getCurrentUserId(): Promise<string> {
  if (!supabase) return 'anon';
  const { data } = await supabase.auth.getUser();
  return data.user?.id || 'anon';
}

export async function uploadDocumentFile(file: File, docType: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const userId = await getCurrentUserId();
    const ext = file.name.split('.').pop() || 'bin';
    const filePath = `${userId}/${getNowTs()}-${docType}.${ext}`;

    const { error } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(filePath, file, { contentType: file.type || 'application/octet-stream', upsert: false });

    if (error) {
      console.warn('Document upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(DOCS_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

export async function uploadPhotoFile(file: File): Promise<string | null> {
  if (!supabase) return null;
  try {
    const userId = await getCurrentUserId();
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${getNowTs()}-photo.${ext}`;

    const { error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(filePath, file, { contentType: file.type || 'image/jpeg', upsert: false });

    if (error) {
      console.warn('Photo upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}
