import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const uploadDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadDir));

  app.post("/api/upload", (req, res) => {
    const { file, fileName } = req.body;
    if (!file || !fileName) {
      return res.status(400).json({ error: "Missing file or fileName" });
    }
    const base64Data = file.replace(/^data:([A-Za-z-+/]+);base64,/, "");
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, base64Data, 'base64');
    res.json({ url: `/uploads/${fileName}` });
  });

  // API Routes
  app.get("/api/requests", async (req, res) => {
    const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/requests", async (req, res) => {
    try {
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

      if (error) throw error;
      const requestId = data.id;

      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const atts = attachments.map(att => ({ request_id: requestId, url: att.url, type: att.type }));
        await supabase.from('attachments').insert(atts);
      }

      res.status(201).json({ id: requestId });
    } catch (error: any) {
      console.error("Error creating request:", error);
      res.status(500).json({ error: error.message || "Erro interno ao criar solicitação." });
    }
  });

  app.get("/api/requests/:id", async (req, res) => {
    const reqId = req.params.id;
    const { data: request, error } = await supabase.from('requests').select('*').eq('id', reqId).maybeSingle();
    if (error || !request) return res.status(404).json({ error: "Not found" });
    
    const { data: attachments } = await supabase.from('attachments').select('*').eq('request_id', reqId);
    const { data: report } = await supabase.from('reports').select('*').eq('request_id', reqId).maybeSingle();
    const { data: agreement } = await supabase.from('agreements').select('*').eq('request_id', reqId).maybeSingle();
    
    let parsedAgreement = agreement;
    if (agreement && agreement.json_data) {
      const jd = typeof agreement.json_data === 'string' ? JSON.parse(agreement.json_data) : agreement.json_data;
      parsedAgreement = { ...agreement, ...jd };
    }
    
    let parsedReport = report;
    if (report && report.json_data) {
      const jd = typeof report.json_data === 'string' ? JSON.parse(report.json_data) : report.json_data;
      parsedReport = { ...report, json_data: jd };
      if (jd.custom_photos) {
        parsedReport.custom_photos = jd.custom_photos;
        delete jd.custom_photos;
      }
    }

    res.json({ ...request, attachments: attachments || [], report: parsedReport, agreement: parsedAgreement });
  });

  app.get("/api/requests/:id/visits", async (req, res) => {
    const { data, error } = await supabase.from('technical_visits').select('*').eq('request_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.get("/api/requests/:id/pre-sales", async (req, res) => {
    const { data, error } = await supabase.from('pre_sales').select('*').eq('request_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/requests/:id/visits", async (req, res) => {
    const { visit_date, technician_name, observations, value } = req.body;
    const { error } = await supabase.from('technical_visits').insert([{
      request_id: req.params.id, visit_date, technician_name, observations, value
    }]);
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true });
  });

  app.post("/api/requests/:id/pre-sales", async (req, res) => {
    const { service_type, area_m2, unit_value, total_value, observations } = req.body;
    const { error } = await supabase.from('pre_sales').insert([{
      request_id: req.params.id, service_type, area_m2, unit_value, total_value, observations
    }]);
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true });
  });

  app.patch("/api/requests/:id/status", async (req, res) => {
    const { status } = req.body;
    const { error } = await supabase.from('requests').update({ status, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/generate-ai", async (req, res) => {
    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(400).json({ error: "Chave da API do Gemini não configurada." });
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent(req.body);
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error.message || "Erro interno da IA" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    const { request_id, visit_date, diagnosis, technical_opinion, recommendation, signature, json_data, custom_photos } = req.body;
    
    // Convert to object for JSONB if it's string
    const jsonbData = typeof json_data === 'string' ? JSON.parse(json_data) : json_data || {};
    if (custom_photos) {
      jsonbData.custom_photos = custom_photos;
    }

    const { data: existing } = await supabase.from('reports').select('id').eq('request_id', request_id).maybeSingle();
    
    if (existing) {
      const { error } = await supabase.from('reports').update({
        visit_date, diagnosis, technical_opinion, recommendation, signature, json_data: jsonbData
      }).eq('request_id', request_id);
      if (error) return res.status(500).json({ error: error.message });
    } else {
      const { error } = await supabase.from('reports').insert([{
        request_id, visit_date, diagnosis, technical_opinion, recommendation, signature, json_data: jsonbData
      }]);
      if (error) return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true });
  });

  app.post("/api/agreements", async (req, res) => {
    const { request_id, ...agreementData } = req.body;
    
    const { data: existing } = await supabase.from('agreements').select('id').eq('request_id', request_id).maybeSingle();
    
    if (existing) {
      const { error } = await supabase.from('agreements').update({ json_data: agreementData }).eq('request_id', request_id);
      if (error) return res.status(500).json({ error: error.message });
    } else {
      const { error } = await supabase.from('agreements').insert([{ request_id, json_data: agreementData }]);
      if (error) return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true });
  });

  app.get("/api/stats", async (req, res) => {
    const { data: reqs, error } = await supabase.from('requests').select('*');
    if (error || !reqs) return res.status(500).json({ error: error?.message });

    const total = reqs.length;
    const statusMap = new Map();
    const urgencyMap = new Map();
    const monthlyMap = new Map();
    
    let sumDays = 0;
    let completedCount = 0;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Grouping manually since we do not have direct group queries exposed seamlessly without RPC
    reqs.forEach(r => {
      statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
      urgencyMap.set(r.urgency, (urgencyMap.get(r.urgency) || 0) + 1);

      if (r.status === 'Concluído' && r.created_at && r.updated_at) {
        const d1 = new Date(r.created_at);
        const d2 = new Date(r.updated_at);
        const diff = (d2.getTime() - d1.getTime()) / (1000 * 3600 * 24);
        sumDays += diff;
        completedCount++;
      }

      const d = new Date(r.created_at);
      if (d >= sixMonthsAgo) {
        const mStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        monthlyMap.set(mStr, (monthlyMap.get(mStr) || 0) + 1);
      }
    });

    const statusArr = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
    const urgencyArr = Array.from(urgencyMap.entries()).map(([urgency, count]) => ({ urgency, count }));
    
    // Sort monthly by actual date keys, roughly
    const monthlyArr = Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count })).reverse();
    
    const avgTime = completedCount > 0 ? (sumDays / completedCount).toFixed(1) : "0.0";

    res.json({
      total,
      byStatus: statusArr,
      byUrgency: urgencyArr,
      monthly: monthlyArr,
      avgTime
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
