import { useMemo, useState } from "react";
import { Download, CheckSquare, Square } from "lucide-react";
import { cn } from "../lib/utils";
import { COMPANIES, UNITS, companyLabel } from "../lib/companies";

export type FinanceRequest = {
  id: number | string;
  company_name: string;
  unit?: string | null;
  responsible_name: string;
  claimant_name?: string;
  budget_number?: string;
  status?: string;
  created_at?: string;
  address?: string;
};

const STATUSES = ["Serviço Concluído", "Esperando Realização", "Em Análise", "Aguardando Assinar Termo", "Pedido Recebido", "Cancelado"];

const field = "w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm";
const lbl = "text-[10px] font-bold text-zinc-400 uppercase tracking-wider";

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

/** Unidade gravada na coluna nova ou, nos chamados antigos, no fim do nome ("Empresa — Serra"). */
function unitOf(r: FinanceRequest) {
  if (r.unit) return r.unit;
  const m = (r.company_name || "").split(" — ");
  return m.length > 1 ? m[m.length - 1] : "";
}

/**
 * Busca chamados por empresa, unidade, período e situação e devolve os
 * escolhidos para virarem itens do relatório financeiro.
 */
export function PullRequests({
  requests,
  alreadyAdded,
  onAdd,
}: {
  requests: FinanceRequest[];
  alreadyAdded: Set<string>;
  onAdd: (rows: FinanceRequest[], unitValue: number) => void;
}) {
  const [company, setCompany] = useState<string>(COMPANIES[0].name);
  const [unit, setUnit] = useState<string>("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("Serviço Concluído");
  const [unitValue, setUnitValue] = useState(150);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const list = useMemo(() => {
    return requests.filter((r) => {
      const name = (r.company_name || "").toLowerCase();
      if (company === "__outras__") {
        if (COMPANIES.some((c) => name.startsWith(c.name.toLowerCase()))) return false;
      } else if (company && !name.startsWith(company.toLowerCase())) return false;
      if (unit && unitOf(r) !== unit) return false;
      if (status && r.status !== status) return false;
      const day = (r.created_at || "").slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [requests, company, unit, from, to, status]);

  const selectable = list.filter((r) => !alreadyAdded.has(String(r.id)));
  const allPicked = selectable.length > 0 && selectable.every((r) => picked.has(String(r.id)));
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const add = () => {
    const rows = list.filter((r) => picked.has(String(r.id)) && !alreadyAdded.has(String(r.id)));
    if (!rows.length) return;
    onAdd(rows, unitValue);
    setPicked(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 col-span-2">
          <label className={lbl} htmlFor="pull-company">Empresa</label>
          <select id="pull-company" className={field} value={company} onChange={(e) => { setCompany(e.target.value); setPicked(new Set()); }}>
            {COMPANIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            <option value="__outras__">Outras empresas</option>
            <option value="">Todas</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className={lbl} htmlFor="pull-unit">Unidade</label>
          <select id="pull-unit" className={field} value={unit} onChange={(e) => { setUnit(e.target.value); setPicked(new Set()); }}>
            <option value="">Todas</option>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className={lbl} htmlFor="pull-status">Situação</label>
          <select id="pull-status" className={field} value={status} onChange={(e) => { setStatus(e.target.value); setPicked(new Set()); }}>
            <option value="">Todas</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className={lbl} htmlFor="pull-from">De</label>
          <input id="pull-from" type="date" className={field} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className={lbl} htmlFor="pull-to">Até</label>
          <input id="pull-to" type="date" className={field} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setPicked(allPicked ? new Set() : new Set(selectable.map((r) => String(r.id))))}
          disabled={!selectable.length}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-600 disabled:opacity-50"
        >
          <span className="flex items-center gap-2">{allPicked ? <CheckSquare size={14} /> : <Square size={14} />} Selecionar todos</span>
          <span className="text-zinc-400">{list.length} chamado(s)</span>
        </button>
        <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100">
          {list.length === 0 && <p className="p-4 text-center text-xs text-zinc-400">Nenhum chamado com esses filtros.</p>}
          {list.map((r) => {
            const id = String(r.id);
            const added = alreadyAdded.has(id);
            return (
              <label key={id} className={cn("flex items-start gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-zinc-50", added && "opacity-50 cursor-default")}>
                <input type="checkbox" className="mt-0.5" checked={added || picked.has(id)} disabled={added} onChange={() => toggle(id)} />
                <span className="min-w-0 flex-1">
                  <span className="font-bold text-zinc-900">#{id}</span>{" "}
                  <span className="text-zinc-500">{r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : ""}</span>
                  <span className="block text-zinc-700 truncate">{companyLabel(r)}</span>
                  <span className="block text-zinc-400 truncate">
                    {r.claimant_name || r.responsible_name}{r.budget_number ? ` · PV ${r.budget_number}` : ""}{added ? " · já no relatório" : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="space-y-1 flex-1">
          <label className={lbl} htmlFor="pull-value">Valor por visita</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">R$</span>
            <input id="pull-value" type="number" min={0} className={cn(field, "pl-8")} value={unitValue} onChange={(e) => setUnitValue(Number(e.target.value))} />
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={picked.size === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
        >
          <Download size={16} /> Adicionar ({picked.size})
        </button>
      </div>
    </div>
  );
}
