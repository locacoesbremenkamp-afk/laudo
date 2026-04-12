import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { request_id, ...agreementData } = req.body;

    const { data: existing } = await supabase.from('agreements').select('id').eq('request_id', request_id).maybeSingle();

    if (existing) {
      const { error } = await supabase.from('agreements').update({ json_data: agreementData }).eq('request_id', request_id);
      if (error) return res.status(500).json({ error: error.message });
    } else {
      const { error } = await supabase.from('agreements').insert([{ request_id, json_data: agreementData }]);
      if (error) return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
