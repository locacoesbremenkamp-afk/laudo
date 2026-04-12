import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { file, fileName } = req.body;
    if (!file || !fileName) return res.status(400).json({ error: 'Missing file or fileName' });

    // Convert base64 dataURL to Buffer
    const base64 = file.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const contentType = file.match(/^data:([A-Za-z-+/]+);base64,/)?.[1] || 'image/jpeg';

    const { error } = await supabase.storage
      .from('rzv-engenharia')
      .upload(`uploads/${fileName}`, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: error.message });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('rzv-engenharia')
      .getPublicUrl(`uploads/${fileName}`);

    return res.json({ url: publicUrl });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
