// Busca em todas as informações do chamado.
// - ignora acentos e maiúsculas ("Joao" acha "João");
// - várias palavras: o chamado precisa ter todas ("maria cariacica");
// - telefone/números: compara só os dígitos ("27 99999" acha "(27) 99999-...");
// - número do chamado: "68" ou "#68".

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

const fmtDate = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("pt-BR");
};

const FIELDS = [
  "company_name", "unit", "responsible_name", "phone", "role", "address",
  "claimant_name", "claimant_phone", "budget_number", "description",
  "urgency", "status",
] as const;

export function matchesSearch(r: Record<string, any>, query: string) {
  const q = query.trim();
  if (!q) return true;

  const text = norm(
    [`#${r.id}`, ...FIELDS.map((f) => r[f]), fmtDate(r.created_at), fmtDate(r.suggested_date)].join(" | ")
  );
  const nums = [r.id, r.phone, r.claimant_phone, r.budget_number].map(digits).join(" ");

  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => {
      if (text.includes(word)) return true;
      const d = digits(word);
      // Palavra só com números (≥3 dígitos): procura também nos telefones e números sem formatação.
      return d.length >= 3 && d.length === word.replace(/[\s().#/-]/g, "").length && nums.includes(d);
    });
}
