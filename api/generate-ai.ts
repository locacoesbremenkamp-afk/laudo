import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
