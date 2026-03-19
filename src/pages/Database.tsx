import { useState } from "react";
import { motion } from "motion/react";
import { Database, Copy, Check, Terminal } from "lucide-react";

const SQL_CODE = `-- SQL para configuração do Supabase - RZV Engenharia

-- Habilitar extensão para UUID se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Chamados (Requests)
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  claimant_name TEXT,
  claimant_phone TEXT,
  budget_number TEXT,
  description TEXT NOT NULL,
  urgency TEXT DEFAULT 'Média',
  suggested_date TEXT,
  status TEXT DEFAULT 'Pedido Recebido',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Visitas Técnicas
CREATE TABLE IF NOT EXISTS technical_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  technician_name TEXT,
  observations TEXT,
  value DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pré-vendas (Pintura e outros)
CREATE TABLE IF NOT EXISTS pre_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL, -- 'pintura', 'reforma', etc.
  area_m2 DECIMAL(10, 2),
  unit_value DECIMAL(10, 2),
  total_value DECIMAL(10, 2),
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Relatórios (Reports)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  visit_date TEXT,
  diagnosis TEXT,
  technical_opinion TEXT,
  recommendation TEXT,
  signature TEXT,
  json_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Termos/Acordos (Agreements)
CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  json_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Anexos (Attachments)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- 'image' ou 'video'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Storage
-- Certifique-se de criar o bucket "rzv-engenharia" manualmente no painel do Supabase
-- e definir as políticas de acesso como públicas para leitura.
`;

export default function DatabasePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(SQL_CODE);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = SQL_CODE;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (error) {
          console.error(error);
        } finally {
          textArea.remove();
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
            <Database className="text-blue-600" />
            Banco de Dados
          </h1>
          <p className="text-zinc-500 mt-2">
            Código SQL para configuração e atualização do Supabase
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? "Copiado!" : "Copiar SQL"}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl"
      >
        <div className="bg-zinc-900 px-4 py-2 flex items-center gap-2 border-b border-zinc-800">
          <Terminal size={14} className="text-zinc-500" />
          <span className="text-xs font-mono text-zinc-400">supabase_schema.sql</span>
        </div>
        <div className="p-6 overflow-x-auto">
          <pre className="font-mono text-sm text-blue-400 leading-relaxed">
            {SQL_CODE}
          </pre>
        </div>
      </motion.div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">Instruções de Uso</h3>
        <ul className="text-blue-800 text-sm space-y-2 list-disc list-inside">
          <li>Acesse o painel do Supabase e vá em "SQL Editor".</li>
          <li>Crie uma nova query e cole o código acima.</li>
          <li>Clique em "Run" para executar e criar as tabelas necessárias.</li>
          <li>Certifique-se de que as extensões necessárias (como uuid-ossp) estejam habilitadas.</li>
          <li><strong>Importante:</strong> Se você habilitar RLS (Row Level Security), lembre-se de criar as políticas de acesso para permitir leitura e escrita.</li>
        </ul>
      </div>
    </div>
  );
}
