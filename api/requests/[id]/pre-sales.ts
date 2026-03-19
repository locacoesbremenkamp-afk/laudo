import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('pre_sales').select('*').eq('request_id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const { service_type, area_m2, unit_value, total_value, observations } = req.body;
    const { error } = await supabase.from('pre_sales').insert([{
      request_id: id, service_type, area_m2, unit_value, total_value, observations
    }]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
