import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Clock, 
  User, 
  AlertCircle, 
  ChevronRight, 
  Search, 
  Filter,
  MoreVertical,
  Calendar,
  Phone,
  MapPin,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLUMNS = [
  { id: "Pedido Recebido", color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  { id: "Em Análise", color: "bg-yellow-500", text: "text-yellow-600", bg: "bg-yellow-50" },
  { id: "Aceito", color: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
  { id: "Agendado", color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50" },
  { id: "Concluído", color: "bg-blue-600", text: "text-blue-700", bg: "bg-blue-50" },
  { id: "Cancelado", color: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
];

interface Request {
  id: number;
  company_name: string;
  responsible_name: string;
  phone: string;
  address: string;
  claimant_name: string;
  claimant_phone?: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  budget_number?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.company_name.toLowerCase().includes(search.toLowerCase()) ||
    r.responsible_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.budget_number && r.budget_number.includes(search))
  );

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "Crítica": return <AlertCircle size={14} className="text-red-500" />;
      case "Alta": return <AlertCircle size={14} className="text-orange-500" />;
      case "Média": return <AlertCircle size={14} className="text-blue-500" />;
      default: return <AlertCircle size={14} className="text-zinc-400" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Crítica": return "bg-red-100 text-red-700 border-red-200";
      case "Alta": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Média": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const copyRequestLink = async () => {
    const url = `${window.location.origin}/request`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
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
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Dashboard de Visitas</h1>
          <p className="text-zinc-500 text-xs sm:text-sm">Gerencie e acompanhe todos os chamados técnicos</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={copyRequestLink}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors text-sm font-medium"
          >
            {copied ? <Check size={16} className="text-blue-500" /> : <Copy size={16} />}
            {copied ? "Copiado!" : "Copiar Link de Solicitação"}
          </button>
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar chamado..."
              className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full md:w-64 transition-all text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="p-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </header>

      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 -mx-4 px-4 sm:-mx-8 sm:px-8 snap-x scrollbar-hide touch-pan-x">
        {STATUS_COLUMNS.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-[85vw] sm:w-80 flex flex-col gap-4 snap-center sm:snap-start">

            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                <h2 className="font-semibold text-zinc-700 text-sm uppercase tracking-wider">{column.id}</h2>
                <span className="bg-zinc-200 text-zinc-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {filteredRequests.filter(r => r.status === column.id).length}
                </span>
              </div>
              <button className="text-zinc-400 hover:text-zinc-600">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-3 min-h-[500px]">
              <AnimatePresence>
                {filteredRequests
                  .filter(r => r.status === column.id)
                  .map((request) => (
                    <motion.div
                      key={request.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group"
                    >
                      <div 
                        onClick={() => navigate(`/request/${request.id}`)}
                        className="block bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all group cursor-pointer"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-zinc-900 leading-tight group-hover:text-blue-600 transition-colors">
                              {request.company_name}
                            </h3>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${getUrgencyColor(request.urgency)}`}>
                              {getUrgencyIcon(request.urgency)}
                              <span className="text-[10px] font-bold uppercase tracking-tight">
                                {request.urgency}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <User size={12} />
                              <span>{request.responsible_name}</span>
                            </div>
                            {request.claimant_name && (
                              <div className="flex items-center gap-2 text-xs text-zinc-500 italic">
                                <User size={12} className="text-zinc-400" />
                                <span>Ref: {request.claimant_name} {request.claimant_phone && `(${request.claimant_phone})`}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              <MapPin size={12} />
                              <span className="truncate">{request.address}</span>
                            </div>
                            <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                              <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
                                {request.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <Clock size={12} />
                              <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ptBR })}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-zinc-50 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                #{request.id}
                              </div>
                              {request.budget_number && (
                                <span className="text-[10px] text-zinc-400 font-mono">PV: {request.budget_number}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link 
                                to={`/report/${request.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] font-semibold text-zinc-500 hover:text-blue-600 px-2 py-1 bg-zinc-50 hover:bg-blue-50 rounded transition-colors"
                              >
                                Relatório
                              </Link>
                              <Link 
                                to={`/agreement/${request.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] font-semibold text-zinc-500 hover:text-blue-600 px-2 py-1 bg-zinc-50 hover:bg-blue-50 rounded transition-colors"
                              >
                                Termo
                              </Link>
                              {request.claimant_phone && (
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const msg = `Olá *${request.claimant_name}*, sou da RZV Engenharia...`;
                                    window.open(`https://wa.me/${request.claimant_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                  className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                  title="WhatsApp Direto"
                                >
                                  <Phone size={14} />
                                </button>
                              )}
                              <ChevronRight size={14} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
