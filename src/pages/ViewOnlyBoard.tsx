import { useEffect, useMemo, useState } from "react";
import { Eye, Printer, Search, RefreshCw, Calendar, User, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "../lib/utils";
import { companyLabel } from "../lib/companies";
import { printRequests, maskPhones, type PrintableRequest } from "../lib/printRequests";
import { STATUS_COLUMNS } from "./Dashboard";

type Req = PrintableRequest & { status: string; urgency: string; created_at: string };

const URGENCY_STYLE: Record<string, string> = {
  Baixa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Média: "bg-blue-50 text-blue-700 border-blue-200",
  Alta: "bg-orange-50 text-orange-700 border-orange-200",
  Crítica: "bg-red-50 text-red-700 border-red-200",
};

const fmtDay = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
};

/**
 * Quadro de chamados só para visualização (link para terceiros).
 * Não tem nenhuma ação de edição e não mostra telefones nem endereços.
 */
export default function ViewOnlyBoard() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCanceled, setShowCanceled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/requests");
      if (!res.ok) throw new Error();
      setRequests(await res.json());
      setUpdatedAt(new Date());
      setError("");
    } catch {
      setError("Não foi possível carregar os chamados. Tente atualizar a página.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // atualiza sozinho a cada minuto
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (!showCanceled && r.status === "Cancelado") return false;
      if (!q) return true;
      return [companyLabel(r), r.claimant_name, r.budget_number, String(r.id), r.description]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [requests, search, showCanceled]);

  const columns = STATUS_COLUMNS.filter((c) => showCanceled || c.id !== "Cancelado")
    .map((c) => ({ ...c, items: visible.filter((r) => r.status === c.id) }))
    .filter((c) => c.items.length > 0);

  const printAll = () => {
    const ok = printRequests(visible, { hideContacts: true, title: "RZV Engenharia — Acompanhamento de Chamados" });
    if (!ok) alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente de novo.");
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold tracking-[0.2em] text-blue-700">RZV ENGENHARIA</p>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Acompanhamento de Chamados</h1>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <Eye size={13} /> Somente visualização
              {updatedAt && <> · atualizado às {updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
              <input
                id="board-search"
                type="search"
                placeholder="Buscar por nº, empresa, reclamante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-600 px-2 cursor-pointer">
              <input id="board-canceled" type="checkbox" checked={showCanceled} onChange={(e) => setShowCanceled(e.target.checked)} />
              Mostrar cancelados
            </label>
            <button onClick={load} className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900" aria-label="Atualizar">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={printAll}
              disabled={visible.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50"
            >
              <Printer size={16} /> Imprimir todos ({visible.length})
            </button>
          </div>
        </div>
        {columns.length > 0 && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
            {columns.map((c) => (
              <span key={c.id} className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", c.bg, c.text)}>
                {c.id}: {c.items.length}
              </span>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {loading && <p className="text-sm text-zinc-500">Carregando chamados...</p>}
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        {!loading && !error && columns.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-16">Nenhum chamado encontrado.</p>
        )}

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {columns.map((col) => (
            <section key={col.id} className="w-[300px] shrink-0 snap-start">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={cn("w-2.5 h-2.5 rounded-full", col.color)} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">{col.id}</h2>
                <span className={cn("text-[11px] font-bold px-2 rounded-full", col.bg, col.text)}>{col.items.length}</span>
              </div>
              <div className="space-y-3">
                {col.items.map((r) => (
                  <article key={r.id} className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-zinc-400">#{r.id}</p>
                        <p className="font-semibold text-zinc-900 text-sm leading-snug">{companyLabel(r)}</p>
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap", URGENCY_STYLE[r.urgency] || "bg-zinc-50 text-zinc-600 border-zinc-200")}>
                        {r.urgency}
                      </span>
                    </div>
                    {r.claimant_name && (
                      <p className="text-xs text-zinc-600 flex items-center gap-1.5"><User size={12} className="text-zinc-400" /> {r.claimant_name}</p>
                    )}
                    {r.budget_number && (
                      <p className="text-xs text-zinc-600 flex items-center gap-1.5"><FileText size={12} className="text-zinc-400" /> Pré-venda {r.budget_number}</p>
                    )}
                    {r.description && <p className="text-xs text-zinc-500 line-clamp-3 bg-zinc-50 rounded-lg px-2.5 py-2">{maskPhones(r.description)}</p>}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                      <span title={fmtDay(r.created_at)}>
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      {r.suggested_date && (
                        <span className="flex items-center gap-1"><Calendar size={11} /> visita {fmtDay(r.suggested_date)}</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
