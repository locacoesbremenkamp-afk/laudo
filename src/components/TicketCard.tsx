import { forwardRef } from "react";
import { companyLabel } from "../lib/companies";

export type Ticket = {
  id: number | string;
  created_at: string;
  company_name: string;
  unit?: string | null;
  responsible_name: string;
  phone: string;
  claimant_name: string;
  claimant_phone: string;
  budget_number?: string;
  urgency: string;
  suggested_date?: string;
  address?: string;
  description: string;
  attachmentCount: number;
  thumbs: string[];
};

const URGENCY: Record<string, { bg: string; fg: string }> = {
  Baixa: { bg: "#E8F5E9", fg: "#1B5E20" },
  Média: { bg: "#E3F2FD", fg: "#0D47A1" },
  Alta: { bg: "#FFF3E0", fg: "#E65100" },
  Crítica: { bg: "#FFEBEE", fg: "#B71C1C" },
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/**
 * Resumo do chamado em formato de cartão, pensado para virar imagem (PNG)
 * e ser enviado pelo WhatsApp. Usa cores fixas para sair igual em qualquer tela.
 */
export const TicketCard = forwardRef<HTMLDivElement, { t: Ticket }>(({ t }, ref) => {
  const u = URGENCY[t.urgency] || URGENCY["Média"];
  const created = new Date(t.created_at);
  const row = (label: string, value?: string | null) => (
    <div style={{ display: "grid", gridTemplateColumns: "118px 1fr", gap: 10, padding: "7px 0", borderTop: "1px solid #EEF0F3" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#111827", fontWeight: 600, overflowWrap: "anywhere" }}>{value || "—"}</span>
    </div>
  );

  return (
    <div ref={ref} style={{ width: 420, background: "#ffffff", borderRadius: 18, overflow: "hidden", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", boxShadow: "0 10px 30px rgba(15,23,42,.12)", border: "1px solid #E5E7EB" }}>
      <div style={{ background: "#0F172A", color: "#fff", padding: "18px 22px" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 700, color: "#93C5FD" }}>RZV ENGENHARIA</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4, gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>Chamado Técnico</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>#{t.id}</div>
        </div>
        <div style={{ fontSize: 12, color: "#CBD5E1", marginTop: 4 }}>
          Aberto em {created.toLocaleDateString("pt-BR")} às {created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div style={{ padding: "14px 22px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>{companyLabel(t)}</div>
          <span style={{ background: u.bg, color: u.fg, fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
            Urgência {t.urgency}
          </span>
        </div>

        {row("Responsável", t.phone ? `${t.responsible_name} · ${t.phone}` : t.responsible_name)}
        {row("Reclamante", t.claimant_phone ? `${t.claimant_name} · ${t.claimant_phone}` : t.claimant_name)}
        {row("Nº Pré-venda", t.budget_number)}
        {row("Visita sugerida", fmtDate(t.suggested_date))}
        {t.address ? row("Endereço", t.address) : null}

        <div style={{ borderTop: "1px solid #EEF0F3", paddingTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Descrição do problema</div>
          <div style={{ fontSize: 13.5, color: "#1F2937", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{t.description}</div>
        </div>

        {t.attachmentCount > 0 && (
          <div style={{ borderTop: "1px solid #EEF0F3", marginTop: 10, paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
              Anexos ({t.attachmentCount})
            </div>
            {t.thumbs.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {t.thumbs.slice(0, 4).map((src, i) => (
                  <img key={i} src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid #E5E7EB" }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ background: "#F8FAFC", borderTop: "1px solid #E5E7EB", padding: "10px 22px", fontSize: 11, color: "#64748B" }}>
        Guarde este número. A RZV Engenharia entrará em contato para agendar a visita.
      </div>
    </div>
  );
});
TicketCard.displayName = "TicketCard";
