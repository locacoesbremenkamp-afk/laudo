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
  Check,
  Printer,
  Edit,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLUMNS = [
  { id: "Pedido Recebido", color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  { id: "Em Análise", color: "bg-yellow-500", text: "text-yellow-600", bg: "bg-yellow-50" },
  { id: "Aceito", color: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
  { id: "Agendado", color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50" },
  { id: "Aguardando Assinar Termo", color: "bg-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "Esperando Realização", color: "bg-cyan-500", text: "text-cyan-600", bg: "bg-cyan-50" },
  { id: "Serviço Concluído", color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
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
  const [printMode, setPrintMode] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Request>>({});
  const [scrollPosition, setScrollPosition] = useState(0);

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

  const updateRequestStatus = async (id: number, newStatus: string) => {
    try {
      // Guarda o estado anterior
      const previousRequests = requests;
      
      // Atualiza o estado imediatamente para feedback visual
      const updatedRequests = requests.map(r => r.id === id ? { ...r, status: newStatus } : r);
      setRequests(updatedRequests);
      
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        console.error("Erro na resposta:", res.status);
        // Reverte ao estado anterior se falhar
        setRequests(previousRequests);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      // Se não conseguir fazer o fetch, reverte
      
    }
  };

  const updateRequestData = async (id: number) => {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setRequests(requests.map(r => r.id === id ? { ...r, ...editData } : r));
        setEditingId(null);
      }
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
    }
  };

  const handlePrint = () => {
    const selectedRequests = requests.filter(r => selectedForPrint.has(r.id));
    if (selectedRequests.length === 0) {
      alert("Selecione pelo menos um card para imprimir!");
      return;
    }

    const printContent = `
      <html>
        <head>
          <title>Cards de Visitas</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .card { 
              border: 1px solid #ccc; 
              padding: 20px; 
              margin: 20px 0; 
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .card h3 { margin: 0 0 10px 0; }
            .card p { margin: 5px 0; font-size: 14px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${selectedRequests.map(r => `
            <div class="card">
              <h3>${r.company_name}</h3>
              <p><strong>Responsável:</strong> ${r.responsible_name}</p>
              <p><strong>Telefone:</strong> ${r.phone}</p>
              <p><strong>Endereço:</strong> ${r.address}</p>
              <p><strong>Status:</strong> ${r.status}</p>
              <p><strong>Descrição:</strong> ${r.description}</p>
            </div>
          `).join('')}
        </body>
      </html>
    `;
    const newWindow = window.open();
    newWindow?.document.write(printContent);
    newWindow?.print();
    setPrintMode(false);
    setSelectedForPrint(new Set());
  };

  const scroll = (direction: string) => {
    const container = document.getElementById('cards-container');
    if (container) {
      const scrollAmount = 400;
      container.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
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
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-zinc-50 min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Dashboard de Visitas</h1>
          <p className="text-zinc-500 text-sm">Gerencie e acompanhe todos os chamados técnicos e laudos</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button 
            onClick={() => setPrintMode(!printMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              printMode 
                ? 'bg-orange-500 text-white hover:bg-orange-600' 
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 shadow-sm'
            }`}
          >
            <Printer size={16} />
            {printMode ? 'Cancelar' : 'Impressão'}
          </button>
          {printMode && (
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-all shadow-sm"
            >
              <Check size={16} />
              Imprimir ({selectedForPrint.size})
            </button>
          )}
          <button 
            onClick={copyRequestLink}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? "Copiado!" : "Novo Chamado"}
          </button>
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar chamado..."
              className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full md:w-72 transition-all text-sm shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500">Carregando chamados...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle size={48} className="text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500">Nenhum chamado encontrado</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={() => scroll('left')}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-white border border-zinc-200 rounded-full shadow-lg hover:bg-zinc-50 transition-all hidden sm:flex items-center justify-center"
          >
            <ChevronLeft size={20} className="text-zinc-600" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-white border border-zinc-200 rounded-full shadow-lg hover:bg-zinc-50 transition-all hidden sm:flex items-center justify-center"
          >
            <ChevronRightIcon size={20} className="text-zinc-600" />
          </button>
          <div id="cards-container" className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 -mx-4 px-4 sm:-mx-8 sm:px-8 snap-x scrollbar-hide touch-pan-x">
          {STATUS_COLUMNS.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-[85vw] sm:w-96 flex flex-col gap-4 snap-center sm:snap-start">

              <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${column.color} shadow-sm`} />
                  <h2 className="font-semibold text-zinc-700 text-sm uppercase tracking-wider">{column.id}</h2>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {filteredRequests.filter(r => r.status === column.id).length}
                  </span>
                </div>
                <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-3 min-h-[600px] pr-1">
                <AnimatePresence mode="popLayout">
                  {filteredRequests
                    .filter(r => r.status === column.id)
                    .map((request) => (
                      <motion.div
                        key={request.id}
                        layoutId={`card-${request.id}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group relative"
                      >
                        <div 
                          onClick={() => {
                            if (printMode) {
                              const newSet = new Set(selectedForPrint);
                              if (newSet.has(request.id)) {
                                newSet.delete(request.id);
                              } else {
                                newSet.add(request.id);
                              }
                              setSelectedForPrint(newSet);
                            } else if (!editingId) {
                              navigate(`/request/${request.id}`);
                            }
                          }}
                          className={`block bg-white border border-zinc-200 rounded-xl p-4 shadow-sm transition-all ${
                            !printMode && !editingId ? 'hover:shadow-lg hover:border-blue-400 hover:scale-105 cursor-pointer' : ''
                          } ${printMode ? 'cursor-pointer' : ''} group ${printMode && selectedForPrint.has(request.id) ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <h3 className="font-bold text-zinc-900 leading-tight group-hover:text-blue-600 transition-colors text-sm">
                                    {request.company_name}
                                  </h3>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight flex-shrink-0 ${getUrgencyColor(request.urgency)}`}>
                                  {getUrgencyIcon(request.urgency)}
                                  {request.urgency}
                                </div>
                                {!printMode && (
                                  <div className="relative group/menu" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={request.status}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        updateRequestStatus(request.id, e.target.value);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[9px] font-bold px-2 py-1 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer transition-all appearance-none pr-6"
                                    >
                                      {STATUS_COLUMNS.map(col => (
                                        <option key={col.id} value={col.id}>{col.id}</option>
                                      ))}
                                    </select>
                                    <ChevronRightIcon size={12} className="absolute right-1.5 top-1.5 text-zinc-500 pointer-events-none" style={{transform: 'rotate(90deg)'}} />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center gap-2 text-zinc-600">
                                <User size={12} className="flex-shrink-0" />
                                <span className="truncate font-medium">{request.responsible_name}</span>
                              </div>
                              {request.claimant_name && (
                                <div className="flex items-center gap-2 text-zinc-500 italic">
                                  <User size={12} className="flex-shrink-0 text-zinc-400" />
                                  <span className="truncate">Ref: {request.claimant_name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-zinc-500">
                                <MapPin size={12} className="flex-shrink-0" />
                                <span className="truncate">{request.address}</span>
                              </div>
                              <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 p-2.5 rounded-lg border border-zinc-200">
                                <p className="text-[10px] text-zinc-600 line-clamp-2 leading-relaxed font-medium">
                                  {request.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-zinc-500 pt-1">
                                <Clock size={12} className="flex-shrink-0" />
                                <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ptBR })}</span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">
                                  #{request.id}
                                </div>
                                {request.budget_number && (
                                  <span className="text-[9px] text-zinc-500 font-mono bg-zinc-100 px-1.5 py-0.5 rounded">
                                    {request.budget_number}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Link 
                                  to={`/report/${request.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[9px] font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                                  title="Gerar Laudo"
                                >
                                  📄 Laudo
                                </Link>
                                <Link 
                                  to={`/agreement/${request.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[9px] font-bold text-purple-600 hover:text-purple-700 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 hover:border-purple-300"
                                  title="Gerar Termo"
                                >
                                  📋 Termo
                                </Link>
                                {!printMode && request.claimant_phone && (
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const msg = `Olá *${request.claimant_name}*, sou da RZV Engenharia...`;
                                      window.open(`https://wa.me/${request.claimant_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 hover:border-emerald-300"
                                    title="WhatsApp"
                                  >
                                    <Phone size={12} />
                                  </button>
                                )}
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
      )}
    </div>
  );
}
}
