// Empresas e unidades que aparecem no formulário de solicitação.
// Para incluir ou renomear uma unidade, altere só esta lista.
export const COMPANIES = [
  { name: "Casa do Serralheiro", short: "Casa do Serralheiro", color: "blue" },
] as const;

export const UNITS = ["Serra", "Linhares", "Cariacica"] as const;

export function isKnownCompany(name: string) {
  return COMPANIES.some((c) => c.name === name);
}

/** "Casa do Serralheiro — Serra", ou só o nome da empresa quando não há unidade. */
export function companyLabel(r: { company_name?: string | null; unit?: string | null }) {
  const company = (r.company_name || "").trim() || "Empresa não informada";
  return r.unit ? `${company} — ${r.unit}` : company;
}
