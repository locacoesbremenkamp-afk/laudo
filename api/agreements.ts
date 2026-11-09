import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Rota interna: exige login. Usa o token do usuário nas consultas, então
// as regras do banco (RLS) decidem o que cada um pode ver e alterar.
async function authed(req: VercelRequest, res: VercelResponse) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'Faça login para continuar.' }); return null; }
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) { res.status(401).json({ error: 'Sessão expirada. Faça login de novo.' }); return null; }
  return client;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = await authed(req, res);
  if (!supabase) return;
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
