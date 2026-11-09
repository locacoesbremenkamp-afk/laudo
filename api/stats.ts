import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Rota interna: exige login. Usa o token do usuário nas consultas, então
// as regras do banco (RLS) decidem o que cada um pode ver e alterar.
async function authed(req: VercelRequest, res: VercelResponse) {
  const token = String(req.headers.authorization || '').replace(/^Bearers+/i, '');
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
  const { data: reqs, error } = await supabase.from('requests').select('*');
  if (error || !reqs) return res.status(500).json({ error: error?.message });

  const total = reqs.length;
  const statusMap = new Map<string, number>();
  const urgencyMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();
  let sumDays = 0;
  let completedCount = 0;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  reqs.forEach((r: any) => {
    statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
    urgencyMap.set(r.urgency, (urgencyMap.get(r.urgency) || 0) + 1);

    if (r.status === 'Concluído' && r.created_at && r.updated_at) {
      const diff = (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 3600 * 24);
      sumDays += diff;
      completedCount++;
    }

    const d = new Date(r.created_at);
    if (d >= sixMonthsAgo) {
      const mStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      monthlyMap.set(mStr, (monthlyMap.get(mStr) || 0) + 1);
    }
  });

  res.json({
    total,
    byStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
    byUrgency: Array.from(urgencyMap.entries()).map(([urgency, count]) => ({ urgency, count })),
    monthly: Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count })).reverse(),
    avgTime: completedCount > 0 ? (sumDays / completedCount).toFixed(1) : '0.0',
  });
}
