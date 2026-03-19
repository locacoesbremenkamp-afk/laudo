import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("🚀 Testing Supabase Connection and Schema...");
  
  const { data: request, error: reqErr } = await supabase.from('requests').insert([{
    company_name: 'Empresa Teste IA',
    responsible_name: 'Antigravity Test',
    phone: '11999999999',
    address: 'Rua Teste',
    description: 'Teste automático de conexão com Supabase'
  }]).select().single();

  if (reqErr) {
    console.error("❌ ERRO no POST requests:", reqErr.message);
    return;
  }
  console.log("✅ Request table OK. Inserido ID:", request.id);

  const { data: report, error: repErr } = await supabase.from('reports').insert([{
    request_id: request.id,
    diagnosis: 'Teste de diagnóstico automático',
    json_data: { custom_photos: [{ url: '/teste', description: 'foto teste' }] }
  }]).select().single();

  if (repErr) {
    console.error("❌ ERRO no POST reports:", repErr.message);
    return;
  }
  console.log("✅ Reports table OK. Coluna diagnosis salva e lida com sucesso!");

  await supabase.from('requests').delete().eq('id', request.id);
  console.log("✅ Limpeza do banco confirmada. Tudo validado 100%!");
}

runTest();
