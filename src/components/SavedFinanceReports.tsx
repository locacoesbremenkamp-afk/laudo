import { useMemo, useState } from "react";
import { FolderOpen, Trash2, Search, Receipt, Loader2 } from "lucide-react";

export type SavedReport = {
  id: number;
  doc_number: string;
  client_name: string | null;
  total: number | string;
  items_count: number;
  data: any;
  created_at: string;
  updated_at: string;
};

const brl = (v: number | string) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Lista dos relatórios financeiros já gerados, para reabrir, reimprimir ou excluir. */
export function SavedFinanceReports({
  reports,
  loading,
  error,
  onOpen,
  onDelete,
}: {
  reports: SavedReport[];
  loading: boolean;
  error: string;
  onOpen: (r: SavedReport) => void;
  onDelete: (r: SavedReport) => void;
}) {
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return reports;
    return reports.filter((r) => [r.doc_number, r.client_name].some((v) => (v || "").toLowerCase().includes(s)));
  }, [reports, q]);

  const sum = list.reduce((acc, r) => acc + Number(r.total || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Receipt size={18} className="text-blue-600" /> Relatórios salvos</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {list.length} relatório(s){list.length > 0 && <> · total {brl(sum)}</>}
          </p>
        </div>
        <div className="relative sm:w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
          <input
            id="saved-reports-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número ou cliente"
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading && <p className="p-6 text-sm text-zinc-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Carregando relatórios...</p>}
      {!loading && error && <p className="m-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{error}</p>}
      {!loading && !error && list.length === 0 && (
        <p className="p-8 text-center text-sm text-zinc-500">
          Nenhum relatório salvo ainda. Clique em "Gerar relatório financeiro" para criar o primeiro; ele é salvo ao imprimir.
        </p>
      )}

      {!loading && list.length > 0 && (
        <ul className="divide-y divide-zinc-100">
          {list.map((r) => (
            <li key={r.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900 text-sm truncate">{r.client_name || "Cliente não informado"}</p>
                <p className="text-xs text-zinc-500">
                  <span className="font-mono">{r.doc_number}</span> · {new Date(r.created_at).toLocaleDateString("pt-BR")} · {r.items_count} item(ns)
                </p>
              </div>
              <p className="font-bold text-blue-700 text-sm tabular-nums whitespace-nowrap">{brl(r.total)}</p>
              <div className="flex items-center gap-2">
                {confirmId === r.id ? (
                  <>
                    <span className="text-xs text-red-700">Excluir?</span>
                    <button onClick={() => { setConfirmId(null); onDelete(r); }} className="px-2.5 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Sim</button>
                    <button onClick={() => setConfirmId(null)} className="px-2.5 py-1.5 text-xs font-semibold bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200">Não</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onOpen(r)} className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1.5">
                      <FolderOpen size={14} /> Abrir
                    </button>
                    <button onClick={() => setConfirmId(r.id)} aria-label={`Excluir ${r.doc_number}`} className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
