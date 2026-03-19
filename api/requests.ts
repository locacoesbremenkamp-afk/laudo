import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const {
      company_name, responsible_name, phone, role, address,
      lat, lng, claimant_name, claimant_phone, budget_number, description,
      urgency, suggested_date, attachments
    } = req.body;

    const { data, error } = await supabase.from('requests').insert([{
      company_name, responsible_name, phone, role, address,
      lat, lng, claimant_name, claimant_phone, budget_number, description,
      urgency, suggested_date
    }]).select().single();

    if (error) return res.status(500).json({ error: error.message });
    const requestId = data.id;

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const atts = attachments.map((att: any) => ({ request_id: requestId, url: att.url, type: att.type }));
      await supabase.from('attachments').insert(atts);
    }

    return res.status(201).json({ id: requestId });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
