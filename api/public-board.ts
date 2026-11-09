import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Esconde números que parecem telefone (8+ dígitos) em texto livre.
const maskPhones = (text?: string | null) =>
  String(text ?? '').replace(/(\+?\(?\d[\d\s().-]{6,}\d)/g, (m) =>
    m.replace(/\D/g, '').length >= 8 ? '[telefone oculto]' : m
  );

const SAFE = 'id, company_name, unit, claimant_name, budget_number, urgency, status, created_at, suggested_date, description';

/**
 * Dados do quadro público (/acompanhamento): só campos seguros, sem
 * telefones, endereços ou localização.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const anon = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  // Depois do supabase/seguranca.sql: função do banco que devolve só os campos seguros.
  let { data, error } = await anon.rpc('public_board');
  if (error && /public_board|PGRST202|Could not find the function/i.test(error.message)) {
    // Banco ainda no modo antigo.
    ({ data, error } = await anon.from('requests').select(SAFE).order('created_at', { ascending: false }) as any);
    if (error && /unit/.test(error.message)) {
      ({ data, error } = await anon.from('requests').select(SAFE.replace('unit, ', '')).order('created_at', { ascending: false }) as any);
    }
  }
  if (error) return res.status(500).json({ error: error.message });

  const rows = (data || []).map((r: any) => ({
    id: r.id,
    company_name: r.company_name,
    unit: r.unit ?? null,
    claimant_name: r.claimant_name,
    budget_number: r.budget_number,
    urgency: r.urgency,
    status: r.status,
    created_at: r.created_at,
    suggested_date: r.suggested_date,
    description: maskPhones(r.description),
  }));
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.json(rows);
}
