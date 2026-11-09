import { companyLabel } from "./companies";

export type PrintableRequest = {
  id: number;
  company_name: string;
  unit?: string | null;
  responsible_name?: string;
  phone?: string;
  claimant_name?: string;
  claimant_phone?: string;
  budget_number?: string;
  urgency?: string;
  status?: string;
  address?: string;
  description?: string;
  created_at?: string;
  suggested_date?: string | null;
};

const URGENCY_COLOR: Record<string, string> = {
  Baixa: "#1B5E20",
  Média: "#0D47A1",
  Alta: "#E65100",
  Crítica: "#B71C1C",
};

// Texto digitado pelos clientes: escapa para não quebrar a página impressa.
const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const fmtDate = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
};

// Sempre desenha a linha (com "—" quando vazia) para todos os cards terem o mesmo layout.
const row = (label: string, value?: string) =>
  `<div class="row"><span>${label}</span><b>${value ? esc(value) : "—"}</b></div>`;

function card(r: PrintableRequest) {
  const color = URGENCY_COLOR[r.urgency || ""] || "#444";
  return `
  <section class="card">
    <header>
      <div><small>CHAMADO</small><strong>#${r.id}</strong></div>
      <div class="company">${esc(companyLabel(r))}</div>
      <span class="urg" style="color:${color};border-color:${color}">${esc(r.urgency || "—")}</span>
    </header>
    <div class="grid">
      ${row("Aberto em", fmtDate(r.created_at))}
      ${row("Visita sugerida", fmtDate(r.suggested_date))}
      ${row("Situação", r.status)}
      ${row("Pré-venda", r.budget_number)}
      ${row("Responsável", [r.responsible_name, r.phone].filter(Boolean).join(" · "))}
      ${row("Reclamante", [r.claimant_name, r.claimant_phone].filter(Boolean).join(" · "))}
      ${row("Endereço", r.address)}
    </div>
    <div class="desc"><span>Descrição do problema</span><p>${esc(r.description)}</p></div>
    <div class="notes"><span>Anotações da visita</span></div>
  </section>`;
}

/** Abre uma janela com os chamados formatados para A4 e chama a impressão. Retorna false se o pop-up foi bloqueado. */
export function printRequests(list: PrintableRequest[]) {
  const sorted = [...list].sort((a, b) => a.id - b.id);
  const now = new Date();
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Chamados RZV — ${now.toLocaleDateString("pt-BR")}</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:16px}
  .top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1d4ed8;padding-bottom:8px;margin-bottom:12px}
  .top h1{font-size:18px;margin:0} .top p{margin:0;font-size:11px;color:#555}
  .card{border:1px solid #bbb;border-radius:8px;padding:12px 14px;margin:0 0 12px;break-inside:avoid;page-break-inside:avoid}
  header{display:flex;align-items:center;gap:12px;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:8px}
  header small{display:block;font-size:9px;color:#666;letter-spacing:1px} header strong{font-size:22px}
  .company{flex:1;font-weight:bold;font-size:15px}
  .urg{border:1.5px solid;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:bold;white-space:nowrap}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 18px}
  .row{display:flex;gap:6px;font-size:12px;padding:2px 0} .row span{color:#666;min-width:92px} .row b{font-weight:600}
  .desc{margin-top:8px} .desc span,.notes span{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px}
  .desc p{margin:3px 0 0;font-size:12.5px;line-height:1.45;white-space:pre-wrap}
  .notes{margin-top:8px;height:54px;border-top:1px dashed #bbb;padding-top:4px}
  @page{size:A4;margin:12mm} @media print{body{margin:0}}
</style></head><body>
<div class="top"><div><h1>RZV Engenharia — Chamados Técnicos</h1><p>${sorted.length} chamado(s)</p></div>
<p>Impresso em ${now.toLocaleString("pt-BR")}</p></div>
${sorted.map(card).join("")}
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
