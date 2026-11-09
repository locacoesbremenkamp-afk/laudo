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
  const { id } = req.query;

  // GET - buscar chamado
  if (req.method === 'GET') {
    const { data: request, error } = await supabase
      .from('requests').select('*').eq('id', id).maybeSingle();
    if (error || !request) return res.status(404).json({ error: 'Not found' });

    const { data: attachments } = await supabase
      .from('attachments').select('*').eq('request_id', id);
    const { data: report } = await supabase
      .from('reports').select('*').eq('request_id', id).maybeSingle();
    const { data: agreement } = await supabase
      .from('agreements').select('*').eq('request_id', id).maybeSingle();

    let parsedReport = report;
    if (report && report.json_data) {
      const jd = typeof report.json_data === 'string' 
        ? JSON.parse(report.json_data) : report.json_data;
      parsedReport = { ...report, json_data: jd };
      if (jd.custom_photos) parsedReport.custom_photos = jd.custom_photos;
    }

    let parsedAgreement = agreement;
    if (agreement && agreement.json_data) {
      const jd = typeof agreement.json_data === 'string' 
        ? JSON.parse(agreement.json_data) : agreement.json_data;
      parsedAgreement = { ...agreement, ...jd };
    }

    return res.json({ 
      ...request, 
      attachments: attachments || [], 
      report: parsedReport, 
      agreement: parsedAgreement 
    });
  }

  // PATCH - atualizar status
  if (req.method === 'PATCH') {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // PUT - atualizar dados completos
  if (req.method === 'PUT') {
    const { data, error } = await supabase
      .from('requests')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
