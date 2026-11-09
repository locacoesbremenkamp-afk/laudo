import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
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
  if (!(await authed(req, res))) return;
  if (req.method === 'POST') {
    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(400).json({ error: 'Chave da API do Gemini não configurada.' });

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent(req.body);
      return res.json({ text: response.text });
    } catch (error: any) {
      console.error('AI Error:', error);
      return res.status(500).json({ error: error.message || 'Erro interno da IA' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
