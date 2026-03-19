import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ChevronRight,
  Printer,
  Filter,
  Download,
  Loader2
} from "lucide-react";
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toPng } from 'html-to-image';
import { jsPDF } from "jspdf";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#71717a'];

export default function Analytics() {
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  // Filters
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetchStats();
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      setRequests(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequestsByDate = requests.filter(req => {
    if (!req.created_at) return false;
    const date = parseISO(req.created_at);
    return isWithinInterval(date, {
      start: parseISO(startDate),
      end: parseISO(endDate)
    });
  });

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando métricas...</div>;

  const statusData = stats?.byStatus?.map((s: any) => ({
    name: s.status,
    value: s.count
  })) || [];

  const urgencyData = stats?.byUrgency?.map((u: any) => ({
    name: u.urgency,
    value: u.count
  })) || [];

  const monthlyData = stats?.monthly?.map((m: any) => ({
    name: m.month,
    chamados: m.count
  })) || [];

  const URGENCY_COLORS: Record<string, string> = {
    "Crítica": "#ef4444",
    "Alta": "#f97316",
    "Média": "#3b82f6",
    "Baixa": "#71717a"
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Análise de Produtividade</h1>
          <p className="text-zinc-500 text-xs sm:text-sm">Métricas de desempenho e volume de atendimentos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-sm">
            <Calendar size={16} className="text-zinc-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-medium outline-none bg-transparent"
            />
            <span className="text-zinc-300">|</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-medium outline-none bg-transparent"
            />
          </div>
          <button 
            onClick={handlePrint}
            disabled={printing}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all text-sm font-medium shadow-lg shadow-zinc-200 disabled:opacity-50"
          >
            {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            <span className="hidden sm:inline">Imprimir Relatório</span>
            <span className="sm:hidden">Imprimir</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 print:grid-cols-2">
        <StatCard 
          title="Total de Chamados" 
          value={stats?.total || 0} 
          icon={TrendingUp} 
          trend="+12%" 
          trendUp={true} 
        />
        <StatCard 
          title="Em Aberto" 
          value={stats?.byStatus?.find((s:any) => s.status === 'Pedido Recebido')?.count || 0} 
          icon={Clock} 
          trend="8 novos" 
          trendUp={true} 
        />
        <StatCard 
          title="Concluídos" 
          value={stats?.byStatus?.find((s:any) => s.status === 'Concluído')?.count || 0} 
          icon={CheckCircle2} 
          trend="+5%" 
          trendUp={true} 
        />
        <StatCard 
          title="Tempo Médio" 
          value={`${stats?.avgTime || 0} dias`} 
          icon={Calendar} 
          trend="Últimos 30 dias" 
          trendUp={false} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 print:grid-cols-2">
        <section className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
          <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Volume Mensal de Chamados</h3>
          <div className="h-64 sm:h-80 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="chamados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
          <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Distribuição por Status</h3>
          <div className="h-64 sm:h-80 min-h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {statusData.map((s: any, i: number) => (
              <div key={s.name} className="flex items-center gap-2 text-[10px] sm:text-xs text-zinc-500">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
            <FileText size={18} className="text-blue-500" />
            Chamados no Período
          </h3>
          <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">{filteredRequestsByDate.length} Chamados</span>
        </div>
        <div className="divide-y divide-zinc-100">
          {filteredRequestsByDate.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 italic text-sm">Nenhum chamado encontrado neste período.</div>
          ) : (
            filteredRequestsByDate.map((req) => (
              <div 
                key={req.id} 
                className="p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between group cursor-pointer"
                onClick={() => navigate(`/request/${req.id}`)}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-[10px] sm:text-xs">
                    #{req.id}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 text-xs sm:text-sm">{req.company_name}</p>
                    <p className="text-[10px] sm:text-xs text-zinc-500 truncate max-w-[150px] sm:max-w-none">
                      {req.responsible_name} • {format(parseISO(req.created_at), "dd/MM/yy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${
                    req.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status}
                  </span>
                  <ChevronRight size={16} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Hidden Printable Report (Visible only during print) */}
      <div className="hidden print:block">
        <div 
          ref={reportRef}
          className="w-full bg-white p-0 font-sans text-zinc-900"
        >
          <div className="flex justify-between items-start border-b-4 border-blue-600 pb-8 mb-8">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-zinc-900">
                RZV <span className="text-blue-600">ENGENHARIA</span>
              </h1>
              <p className="text-zinc-500 font-medium mt-1">Relatório de Produtividade e Analytics</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-blue-600 uppercase tracking-widest">Relatório de Gestão</h2>
              <p className="text-zinc-500 text-sm mt-1">Período: {format(parseISO(startDate), "dd/MM/yyyy")} - {format(parseISO(endDate), "dd/MM/yyyy")}</p>
              <p className="text-zinc-500 text-sm">Gerado em: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Resumo Geral</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Total de Chamados</span>
                  <span className="text-lg font-bold text-zinc-900">{stats?.total || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Chamados Concluídos</span>
                  <span className="text-lg font-bold text-zinc-900">{stats?.byStatus?.find((s:any) => s.status === 'Concluído')?.count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Tempo Médio de Resolução</span>
                  <span className="text-lg font-bold text-zinc-900">{stats?.avgTime || 0} dias</span>
                </div>
              </div>
            </div>
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Distribuição de Status</h3>
              <div className="space-y-2">
                {statusData.map((s: any) => (
                  <div key={s.name} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">{s.name}</span>
                    <span className="font-bold text-zinc-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Lista de Chamados no Período</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-200">
                  <th className="text-left py-3 font-black text-zinc-400 uppercase tracking-widest">ID</th>
                  <th className="text-left py-3 font-black text-zinc-400 uppercase tracking-widest">Cliente</th>
                  <th className="text-left py-3 font-black text-zinc-400 uppercase tracking-widest">Data</th>
                  <th className="text-right py-3 font-black text-zinc-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRequestsByDate.map((req) => (
                  <tr key={req.id}>
                    <td className="py-3 font-bold text-zinc-900">#{req.id}</td>
                    <td className="py-3 text-zinc-600">{req.company_name}</td>
                    <td className="py-3 text-zinc-600">{format(parseISO(req.created_at), "dd/MM/yyyy")}</td>
                    <td className="py-3 text-right font-bold text-zinc-900">{req.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-auto pt-12 border-t border-zinc-100 text-center space-y-1">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">RZV Engenharia - Relatório Gerencial de Produtividade</p>
            <p className="text-[9px] text-blue-600/50 font-bold uppercase tracking-widest">Responsável Técnico: ES-044985/D</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: any) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-50 text-zinc-400 rounded-xl flex items-center justify-center">
          <Icon size={18} className="sm:size-5" />
        </div>
        <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-zinc-900">{value}</p>
      </div>
    </div>
  );
}
