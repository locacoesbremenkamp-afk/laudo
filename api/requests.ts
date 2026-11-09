import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_ANON_KEY!;

// Rota interna: exige login. Usa o token do usuário nas consultas, então
// as regras do banco (RLS) decidem o que cada um pode ver e alterar.
async function authed(req: VercelRequest, res: VercelResponse) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'Faça login para continuar.' }); return null; }
  const client = createClient(URL_, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) { res.status(401).json({ error: 'Sessão expirada. Faça login de novo.' }); return null; }
  return client;
}

const missingFunction = (msg?: string) => /create_request|PGRST202|function .* does not exist|Could not find the function/i.test(msg || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Lista completa: só a equipe logada.
  if (req.method === 'GET') {
    const supabase = await authed(req, res);
    if (!supabase) return;
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // Abrir chamado: público (formulário). Só cria, não lê nada do banco.
  if (req.method === 'POST') {
    const {
      company_name, responsible_name, phone, role, address,
      lat, lng, claimant_name, claimant_phone, budget_number, description,
      urgency, suggested_date, attachments, unit
    } = req.body || {};

    if (!String(company_name || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ error: 'Preencha a empresa e a descrição do problema.' });
    }

    const row: Record<string, any> = {
      company_name, responsible_name, phone, role, address,
      lat, lng, claimant_name, claimant_phone, budget_number, description,
      urgency, suggested_date: suggested_date || null, unit: unit || null,
    };
    const atts = Array.isArray(attachments) ? attachments.map((a: any) => ({ url: a?.url, type: a?.type })) : [];
    const anon = createClient(URL_, ANON, { auth: { persistSession: false } });

    // Caminho seguro (depois de rodar supabase/seguranca.sql): função do banco que só insere.
    const rpc = await anon.rpc('create_request', { payload: { ...row, attachments: atts } });
    if (!rpc.error) return res.status(201).json({ id: rpc.data });
    if (!missingFunction(rpc.error.message)) return res.status(500).json({ error: rpc.error.message });

    // Banco ainda no modo antigo (função não existe): insere direto.
    let { data, error } = await anon.from('requests').insert([row]).select().single();
    if (error && /unit/.test(error.message)) {
      const { unit: u, ...rest } = row;
      ({ data, error } = await anon.from('requests')
        .insert([{ ...rest, company_name: u ? `${company_name} — ${u}` : company_name }])
        .select().single());
    }
    if (error || !data) return res.status(500).json({ error: error?.message || 'Erro ao salvar.' });
    if (atts.length) await anon.from('attachments').insert(atts.map((a) => ({ ...a, request_id: data.id })));
    return res.status(201).json({ id: data.id });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
