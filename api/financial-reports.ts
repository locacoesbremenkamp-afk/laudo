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

const tableMissing = (msg?: string) => /financial_reports/.test(msg || '') && /does not exist|schema cache|not find/i.test(msg || '');
const MISSING = 'Tabela de relatórios ainda não criada. Rode supabase/financeiro.sql no Supabase.';

/** Relatórios financeiros salvos: listar (GET), salvar/atualizar (POST) e excluir (DELETE ?id=). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = await authed(req, res);
  if (!supabase) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('financial_reports')
      .select('id, doc_number, client_name, total, items_count, data, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return res.status(tableMissing(error.message) ? 503 : 500).json({ error: tableMissing(error.message) ? MISSING : error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { doc_number, client_name, total, items_count, data } = req.body || {};
    if (!doc_number || !data) return res.status(400).json({ error: 'Relatório sem número ou sem dados.' });
    const { data: saved, error } = await supabase
      .from('financial_reports')
      .upsert(
        { doc_number, client_name, total: Number(total) || 0, items_count: Number(items_count) || 0, data, updated_at: new Date().toISOString() },
        { onConflict: 'doc_number' }
      )
      .select('id, doc_number, client_name, total, items_count, data, created_at, updated_at')
      .single();
    if (error) return res.status(tableMissing(error.message) ? 503 : 500).json({ error: tableMissing(error.message) ? MISSING : error.message });
    return res.json(saved);
  }

  if (req.method === 'DELETE') {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ error: 'Informe o relatório.' });
    const { error } = await supabase.from('financial_reports').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
