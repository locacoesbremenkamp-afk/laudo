-- Supabase SQL Schema para Laudo App

-- Tabela de Requests (se não existir)
CREATE TABLE IF NOT EXISTS requests (
  id BIGSERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  address TEXT,
  lat FLOAT8,
  lng FLOAT8,
  claimant_name TEXT,
  claimant_phone TEXT,
  budget_number TEXT,
  description TEXT,
  urgency TEXT DEFAULT 'Média',
  suggested_date DATE,
  status TEXT DEFAULT 'Pedido Recebido',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES requests(id) ON DELETE CASCADE,
  url TEXT,
  type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Reports
CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES requests(id) ON DELETE CASCADE,
  diagnosis TEXT,
  json_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Agreements
CREATE TABLE IF NOT EXISTS agreements (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES requests(id) ON DELETE CASCADE,
  json_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Pre-sales
CREATE TABLE IF NOT EXISTS pre_sales (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES requests(id) ON DELETE CASCADE,
  service_type TEXT,
  area_m2 FLOAT8,
  unit_value FLOAT8,
  total_value FLOAT8,
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar coluna status se não existir (para tabelas existentes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'requests' AND column_name = 'status'
  ) THEN
    ALTER TABLE requests ADD COLUMN status TEXT DEFAULT 'Pedido Recebido';
  END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_company ON requests(company_name);
CREATE INDEX IF NOT EXISTS idx_attachments_request ON attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_reports_request ON reports(request_id);
CREATE INDEX IF NOT EXISTS idx_agreements_request ON agreements(request_id);
CREATE INDEX IF NOT EXISTS idx_pre_sales_request ON pre_sales(request_id);

-- RLS Policies (Row Level Security)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_sales ENABLE ROW LEVEL SECURITY;

-- Permitir acesso público (sem autenticação)
CREATE POLICY "Allow all" ON requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON agreements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pre_sales FOR ALL USING (true) WITH CHECK (true);
