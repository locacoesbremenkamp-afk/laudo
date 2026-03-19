import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data: request, error } = await supabase.from('requests').select('*').eq('id', id).maybeSingle();
    if (error || !request) return res.status(404).json({ error: 'Not found' });

    const { data: attachments } = await supabase.from('attachments').select('*').eq('request_id', id);
    const { data: report } = await supabase.from('reports').select('*').eq('request_id', id).maybeSingle();
    const { data: agreement } = await supabase.from('agreements').select('*').eq('request_id', id).maybeSingle();

    let parsedReport = report;
    if (report && report.json_data) {
      const jd = typeof report.json_data === 'string' ? JSON.parse(report.json_data) : report.json_data;
      parsedReport = { ...report, json_data: jd };
      if (jd.custom_photos) parsedReport.custom_photos = jd.custom_photos;
    }

    let parsedAgreement = agreement;
    if (agreement && agreement.json_data) {
      const jd = typeof agreement.json_data === 'string' ? JSON.parse(agreement.json_data) : agreement.json_data;
      parsedAgreement = { ...agreement, ...jd };
    }

    return res.json({ ...request, attachments: attachments || [], report: parsedReport, agreement: parsedAgreement });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
