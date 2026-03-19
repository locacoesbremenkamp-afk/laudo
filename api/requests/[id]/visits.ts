import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('technical_visits').select('*').eq('request_id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const { visit_date, technician_name, observations, value } = req.body;
    const { error } = await supabase.from('technical_visits').insert([{
      request_id: id, visit_date, technician_name, observations, value
    }]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
