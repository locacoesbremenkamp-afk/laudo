import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  MoreHorizontal,
  Copy,
  Check,
  Printer
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Request {
  id: number;
  company_name: string;
  responsible_name: string;
  phone: string;
  role: string;
  address: string;
  lat: number;
  lng: number;
  claimant_name: string;
  claimant_phone: string;
  budget_number: string;
  description: string;
  urgency: string;
  suggested_date: string;
  status: string;
  created_at: string;
  attachments: { url: string; type: string }[];
  report?: any;
  agreement?: any;
}


export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const res = await fetch(`/api/requests/${id}`);
      const data = await res.json();
      setRequest(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMessageTemplate = () => {
    if (!request) return "";
    return `Olá *${request.claimant_name}*, tudo bem?
    
Sou da *RZV Engenharia* e estou entrando em contato referente à solicitação de *Visita Técnica* (Chamado #${request.id}) realizada para a unidade *${request.company_name}*.

Para que possamos agendar o melhor horário e garantir um atendimento eficiente, por gentileza, nos envie as seguintes informações:

✅ *Breve relato ou fotos adicionais do ocorrido*
📍 *Localização exata (link do Google Maps ou endereço completo)*
⏰ *Sugestões de dias e horários para a visita*

Estamos à disposição para qualquer dúvida.

Atenciosamente,

*Renzo Vetorazzi*
Engenheiro Civil - RZV Engenharia`;
  };

  const sendWhatsApp = () => {
    if (!request) return;
    const message = getMessageTemplate();
    const phone = request.claimant_phone || request.phone;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = async () => {
    const message = getMessageTemplate();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = message;
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

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>;
  if (!request) return <div className="p-8 text-center text-zinc-500">Chamado não encontrado.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 print:p-0 print:m-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors w-fit"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Voltar</span>
        </button>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button 
            onClick={() => window.print()}
            className="flex-1 sm:flex-none bg-white border border-zinc-200 text-zinc-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 print:hidden"
          >
            <Printer size={16} />
            Imprimir
          </button>
          <button 
            onClick={copyToClipboard}
            className="flex-1 sm:flex-none bg-white border border-zinc-200 text-zinc-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? <Check size={16} className="text-blue-500" /> : <Copy size={16} />}
            {copied ? "Copiado!" : "Copiar Texto"}
          </button>
          <button 
            onClick={sendWhatsApp}
            className="flex-1 sm:flex-none bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            WhatsApp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 print:block">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8 print:space-y-4">
          <section className="bg-white rounded-xl sm:rounded-2xl border border-zinc-200 overflow-hidden shadow-sm print:border-none print:shadow-none">
            <div className="p-4 sm:p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                <FileText size={18} className="text-blue-500" />
                Detalhes da Solicitação
              </h2>
              <span className="text-[10px] font-mono text-zinc-400">ID: #{request.id}</span>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-1 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Empresa / Unidade</p>
                  <p className="font-bold text-zinc-900 text-sm sm:text-base">{request.company_name}</p>
                </div>
                <div className="space-y-1 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Responsável (Solicitante)</p>
                  <p className="font-bold text-zinc-900 text-sm sm:text-base">{request.responsible_name}</p>
                  <p className="text-[10px] text-zinc-500 italic">{request.role}</p>
                </div>
                <div className="space-y-1 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Telefone Solicitante</p>
                  <p className="font-bold text-zinc-900 text-sm sm:text-base">{request.phone}</p>
                </div>
                <div className="space-y-1 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Reclamante / Contato Local</p>
                  <p className="font-bold text-blue-900 text-sm sm:text-base">{request.claimant_name}</p>
                </div>
                <div className="space-y-1 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Telefone Reclamante</p>
                  <p className="font-bold text-blue-900 text-sm sm:text-base">{request.claimant_phone || "N/A"}</p>
                </div>
                <div className="space-y-1 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Nº Orçamento / PV</p>
                  <p className="font-mono font-bold text-zinc-900 text-sm sm:text-base">{request.budget_number || "---"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Endereço</p>
                <div className="flex items-start gap-2">
                  <p className="font-medium text-zinc-700 text-sm sm:text-base">{request.address}</p>
                  {request.lat && (
                    <a 
                      href={`https://www.google.com/maps?q=${request.lat},${request.lng}`} 
                      target="_blank" 
                      className="text-blue-600 hover:text-blue-700 mt-1"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Descrição do Problema</p>
                <div className="bg-zinc-50 p-3 sm:p-4 rounded-xl border border-zinc-100 text-zinc-700 text-sm sm:text-base whitespace-pre-wrap">
                  {request.description}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl sm:rounded-2xl border border-zinc-200 overflow-hidden shadow-sm print:hidden">
            <div className="p-4 sm:p-6 border-b border-zinc-100">
              <h2 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                <CheckCircle2 size={18} className="text-blue-500" />
                Anexos
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              {request.attachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {request.attachments.map((att, i) => (
                    <div key={i} className="aspect-square rounded-lg sm:rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 group relative">
                      {att.type === 'image' ? (
                        <img 
                          src={att.url} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://picsum.photos/seed/error/400/400";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white font-bold text-xs">VIDEO</div>
                      )}
                      <a 
                        href={att.url} 
                        download={`anexo-${request.id}-${i}`}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-[10px] sm:text-sm"
                      >
                        Ver Original
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-zinc-500 italic">Nenhum anexo enviado.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6 sm:space-y-8 print:mt-8">
          <section className="bg-white rounded-xl sm:rounded-2xl border border-zinc-200 overflow-hidden shadow-sm print:border-none print:shadow-none">
            <div className="p-4 sm:p-6 border-b border-zinc-100">
              <h2 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                <AlertCircle size={18} className="text-blue-500" />
                Informações de Visita
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-500">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Data Sugerida</p>
                  <p className="font-medium text-zinc-900">{request.suggested_date ? format(new Date(request.suggested_date), "dd/MM/yyyy") : "Não informada"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-500">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Criado em</p>
                  <p className="font-medium text-zinc-900 text-xs sm:text-sm">{format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
              </div>
              <div className="pt-4">
                <Link 
                  to={`/report/${request.id}`}
                  className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <FileText size={16} />
                  {request.report ? "Ver Relatório Técnico" : "Gerar Relatório Técnico"}
                </Link>
              </div>
            </div>
          </section>

          <section className="bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6 space-y-4 print:hidden">
            <h3 className="font-bold text-blue-900 text-sm sm:text-base">Ações Rápidas</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-between">
                <span>Agendar no Google Calendar</span>
                <ExternalLink size={14} />
              </button>
              <Link 
                to={`/agreement/${request.id}`}
                className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-between"
              >
                <span>{request.agreement ? "Ver Termo de Acordo" : "Gerar Termo de Acordo"}</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
