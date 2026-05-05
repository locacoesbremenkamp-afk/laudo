import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Palette,
  DollarSign,
  Package
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toPng } from 'html-to-image';
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "motion/react";

interface Request {
  id: number;
  company_name: string;
  responsible_name: string;
  phone: string;
  address: string;
  budget_number: string;
  agreement?: any;
}

interface ResolutionItem {
  id: string;
  type: "painting" | "credit" | "material";
  description: string;
  value?: string;
}

export default function AgreementTerm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const agreementRef = useRef<HTMLDivElement>(null);

  const [resolutionItems, setResolutionItems] = useState<ResolutionItem[]>([]);
  const [showAddResolution, setShowAddResolution] = useState(false);
  const [selectedType, setSelectedType] = useState<"painting" | "credit" | "material">("painting");
  const [resolutionInput, setResolutionInput] = useState("");

  const [agreementData, setAgreementData] = useState({
    first_party_cnpj: "12.982.965/0001-06",
    first_party_address: "BR 262, Campo Grande, Cariacica/ES",
    claimant_name: "Renzo Vetorazzi",
    claimant_cnpj: "50110906000137",
    claimant_address: "",
    budget_number: "",
    total_value: "",
    signature_date: format(new Date(), "dd/MM/yyyy"),
    representative_name: "",
    representative_cpf: "",
    witness1_name: "",
    witness1_cpf: "",
    witness2_name: "",
    witness2_cpf: ""
  });

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const res = await fetch(`/api/requests/${id}`);
      const data = await res.json();
      setRequest(data);
      
      if (data.agreement) {
        setAgreementData(prev => ({
          ...prev,
          ...data.agreement
        }));
        if (data.agreement.resolutionItems) {
          setResolutionItems(data.agreement.resolutionItems);
        }
      } else {
        // Puxar dados automaticamente do cadastro
        setAgreementData(prev => ({
          ...prev,
          claimant_name: data.company_name || "",
          claimant_address: data.address || "",
          claimant_cnpj: data.cnpj || "",
          budget_number: data.budget_number || "",
          total_value: data.total_value || ""
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addResolutionItem = () => {
    if (!resolutionInput.trim()) {
      alert("Por favor, preencha o campo!");
      return;
    }
    const newItem: ResolutionItem = {
      id: Date.now().toString(),
      type: selectedType,
      description: selectedType === "material" ? resolutionInput : "",
      value: selectedType !== "material" ? resolutionInput : ""
    };
    setResolutionItems([...resolutionItems, newItem]);
    setResolutionInput("");
  };

  const removeResolutionItem = (id: string) => {
    setResolutionItems(resolutionItems.filter(item => item.id !== id));
  };

  const updateResolutionItem = (id: string, updates: Partial<ResolutionItem>) => {
    setResolutionItems(resolutionItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const getResolutionTitle = (type: string) => {
    switch(type) {
      case "painting": return "Serviço de Pintura";
      case "credit": return "Crédito na Casa do Serralheiro";
      case "material": return "Envio de Material";
      default: return "Resolução";
    }
  };

  const getResolutionIcon = (type: string) => {
    switch(type) {
      case "painting": return <Palette size={16} />;
      case "credit": return <DollarSign size={16} />;
      case "material": return <Package size={16} />;
      default: return <Plus size={16} />;
    }
  };

  const buildClauseTwo = () => {
    if (resolutionItems.length === 0) return "Não especificado";
    
    return resolutionItems.map(item => {
      switch(item.type) {
        case "painting":
          return `• Serviço de pintura de recobrimento na superfície afetada${item.value ? ` com custo de R$ ${item.value}` : ''}`;
        case "credit":
          return `• Crédito na Casa do Serralheiro no valor de R$ ${item.value || 'a definir'}`;
        case "material":
          return `• Envio de material: ${item.description}`;
        default:
          return item.description;
      }
    }).join("\n");
  };

  const generatePDF = async () => {
    if (!agreementRef.current) return;
    try {
      const imgData = await toPng(agreementRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        quality: 0.95,
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height / imgProps.width) * imgWidth;
      
      const totalPages = Math.ceil(imgHeight / pageHeight);
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        
        const yOffset = -(i * pageHeight);
        pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
      }
      
      pdf.save(`Termo-Acordo-${id}.pdf`);
    } catch (error: any) {
      alert(`❌ Erro ao gerar PDF:\n\n${error?.message}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/requests/${id}/agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...agreementData,
          resolutionItems
        })
      });

      if (!res.ok) throw new Error("Erro ao salvar");
      alert("✅ Termo de acordo salvo com sucesso!\n\nLocal: Banco de dados do cliente (Chamado #" + id + ")\n\nOs dados estão registrados no cadastro e podem ser consultados a qualquer momento.");
    } catch (error: any) {
      alert(`❌ Erro ao salvar: ${error?.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-4 shadow-sm border border-zinc-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-zinc-600" />
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-zinc-900">
              Termo de Acordo
            </h1>
            {request && (
              <p className="text-sm text-zinc-500">
                {request?.company_name} • Chamado #{request?.id}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2"
            title={showPreview ? "Editar" : "Pré-visualizar"}
          >
            {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Edição */}
        {!showPreview && (
          <div className="lg:col-span-1 space-y-4">
            {/* Seção: Dados da Empresa */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-zinc-200">
              <h3 className="font-bold text-zinc-900 mb-4 text-sm uppercase tracking-wider">
                Dados do Cliente (2ª Acordante)
              </h3>
              <p className="text-xs text-zinc-500 italic mb-3">💡 Campos opcionais - deixe em branco se não aplicável</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Empresa/Pessoa</label>
                  <input
                    type="text"
                    value={agreementData.claimant_name}
                    onChange={(e) => setAgreementData({...agreementData, claimant_name: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">CNPJ ou CPF</label>
                  <input
                    type="text"
                    value={agreementData.claimant_cnpj}
                    onChange={(e) => setAgreementData({...agreementData, claimant_cnpj: e.target.value})}
                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Endereço</label>
                  <textarea
                    value={agreementData.claimant_address}
                    onChange={(e) => setAgreementData({...agreementData, claimant_address: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Valor Total (R$)</label>
                  <input
                    type="text"
                    value={agreementData.total_value}
                    onChange={(e) => setAgreementData({...agreementData, total_value: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Seção: Resoluções */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-zinc-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">
                  Formas de Resolução
                </h3>
                <button
                  onClick={() => setShowAddResolution(!showAddResolution)}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              {showAddResolution && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-4 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg space-y-4 shadow-md"
                >
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-3 uppercase tracking-widest">Selecione o tipo de resolução</label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: "painting", label: "🎨 Serviço de Pintura", desc: "Pintura de recobrimento na superfície" },
                        { id: "credit", label: "💵 Crédito na Casa", desc: "Crédito em conta para futuras compras" },
                        { id: "material", label: "📦 Envio de Material", desc: "Fornecimento de material específico" }
                      ].map(({ id, label, desc }) => (
                        <button
                          key={id}
                          onClick={() => setSelectedType(id as any)}
                          className={`p-3 rounded-lg text-sm font-bold transition-all border-2 text-left ${
                            selectedType === id
                              ? "bg-white border-blue-600 text-blue-700 shadow-md ring-2 ring-blue-200"
                              : "bg-white border-blue-200 text-zinc-700 hover:border-blue-400"
                          }`}
                        >
                          <div className="font-bold">{label}</div>
                          <div className="text-xs text-zinc-500 font-normal">{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t-2 border-blue-200 pt-4">
                    <label className="text-xs font-bold text-zinc-700 block mb-2 uppercase tracking-widest">
                      {selectedType === "material" ? "Descrição do material" : "Valor/Detalhe"}
                    </label>
                    <input
                      type="text"
                      value={resolutionInput}
                      onChange={(e) => setResolutionInput(e.target.value)}
                      placeholder={
                        selectedType === "credit" ? "Ex: 500,00" : 
                        selectedType === "painting" ? "Ex: pintura epóxi completa" :
                        "Descrever o material..."
                      }
                      className="w-full px-4 py-3 border-2 border-blue-300 bg-white rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm font-medium"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addResolutionItem();
                          setShowAddResolution(false);
                        }
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        addResolutionItem();
                        setShowAddResolution(false);
                      }}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-md hover:shadow-lg"
                    >
                      ✓ Adicionar Resolução
                    </button>
                    <button
                      onClick={() => setShowAddResolution(false)}
                      className="flex-1 py-3 bg-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-400 transition-colors font-bold text-sm"
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                <AnimatePresence>
                  {resolutionItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                          {getResolutionIcon(item.type)}
                          {getResolutionTitle(item.type)}
                        </div>
                        <button
                          onClick={() => removeResolutionItem(item.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {item.type === "material" ? (
                        <textarea
                          value={item.description}
                          onChange={(e) => updateResolutionItem(item.id, { description: e.target.value })}
                          placeholder="Descrever o material a ser enviado..."
                          className="w-full px-2 py-1.5 border border-blue-300 bg-white rounded text-xs resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                          rows={2}
                        />
                      ) : (
                        <input
                          type="text"
                          value={item.value}
                          onChange={(e) => updateResolutionItem(item.id, { value: e.target.value })}
                          placeholder={item.type === "credit" ? "Ex: 500,00" : "Valor ou descrição"}
                          className="w-full px-2 py-1.5 border border-blue-300 bg-white rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {resolutionItems.length === 0 && !showAddResolution && (
                <p className="text-xs text-zinc-500 italic text-center py-4">
                  Nenhuma resolução adicionada ainda
                </p>
              )}
            </div>

            {/* Seção: Assinaturas */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-zinc-200">
              <h3 className="font-bold text-zinc-900 mb-4 text-sm uppercase tracking-wider">
                Assinaturas
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Representante</label>
                  <input
                    type="text"
                    value={agreementData.representative_name}
                    onChange={(e) => setAgreementData({...agreementData, representative_name: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">CPF</label>
                  <input
                    type="text"
                    value={agreementData.representative_cpf}
                    onChange={(e) => setAgreementData({...agreementData, representative_cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Testemunha 1</label>
                  <input
                    type="text"
                    value={agreementData.witness1_name}
                    onChange={(e) => setAgreementData({...agreementData, witness1_name: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">CPF</label>
                  <input
                    type="text"
                    value={agreementData.witness1_cpf}
                    onChange={(e) => setAgreementData({...agreementData, witness1_cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Testemunha 2</label>
                  <input
                    type="text"
                    value={agreementData.witness2_name}
                    onChange={(e) => setAgreementData({...agreementData, witness2_name: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">CPF</label>
                  <input
                    type="text"
                    value={agreementData.witness2_cpf}
                    onChange={(e) => setAgreementData({...agreementData, witness2_cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="grid grid-cols-2 gap-3 sticky bottom-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold disabled:opacity-50"
              >
                <Save size={18} />
                <span className="hidden sm:inline">Salvar</span>
              </button>
              <button
                onClick={generatePDF}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors font-bold"
              >
                <Download size={18} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Pré-visualização */}
        {showPreview && (
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg p-4 border border-zinc-200 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-4 text-sm text-center uppercase">Pré-visualização</h3>
              <div className="space-y-2 text-xs text-zinc-600">
                <div>
                  <strong className="text-zinc-900">Cliente:</strong>
                  <p>{agreementData.claimant_name || "—"}</p>
                </div>
                <div>
                  <strong className="text-zinc-900">CNPJ:</strong>
                  <p>{agreementData.claimant_cnpj || "—"}</p>
                </div>
                <div>
                  <strong className="text-zinc-900">Endereço:</strong>
                  <p>{agreementData.claimant_address || "—"}</p>
                </div>
                <div className="border-t pt-2">
                  <strong className="text-zinc-900">Resoluções:</strong>
                  <p className="whitespace-pre-wrap text-zinc-700 mt-1">{buildClauseTwo()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documento Renderizado */}
        <div className="lg:col-span-2">
          <div 
            ref={agreementRef}
            className="bg-white rounded-lg sm:p-8 shadow-lg border border-zinc-200 print:rounded-none print:shadow-none print:border-0"
            style={{ 
              fontFamily: 'Georgia, serif',
              padding: '20mm 15mm',
            }}
          >
            <style>{`
              @media print {
                @page {
                  margin: 20mm 15mm 20mm 15mm;
                  size: A4;
                }
                
                body {
                  margin: 0;
                  padding: 0;
                }
                
                .print\\:rounded-none {
                  border-radius: 0 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                
                div {
                  orphans: 3;
                  widows: 3;
                }
                
                p {
                  orphans: 2;
                  widows: 2;
                  margin: 0.5rem 0;
                  line-height: 1.6;
                }
                
                h1, h2 {
                  page-break-after: avoid;
                  orphans: 2;
                  widows: 2;
                }
                
                .page-break {
                  page-break-after: always;
                }
              }
            `}</style>
            {/* Cabeçalho */}
            <div className="text-center mb-8 border-b-2 border-zinc-300 pb-4 print:mb-6 print:pb-3 print:border-zinc-400">
              <h1 className="text-lg sm:text-xl font-bold mb-2 print:text-base print:mb-1">TERMO DE ACORDO EXTRAJUDICIAL</h1>
              <p className="text-xs sm:text-sm text-zinc-600 print:text-xs print:m-0 print:text-zinc-700">Resolução de conflitos e quitação de relações extrajudicial</p>
            </div>

            {/* Corpo do documento */}
            <div className="space-y-4 text-xs sm:text-sm text-justify leading-relaxed text-zinc-800 print:space-y-3 print:text-xs print:leading-snug">
              {/* Preâmbulo */}
              {agreementData.claimant_name ? (
                <p className="print:m-0">
                  Pelo presente instrumento particular, de um lado, <strong>CASA DO SERRALHEIRO LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>{agreementData.first_party_cnpj}</strong>, com sede na <strong>{agreementData.first_party_address}</strong>, e de outro lado, <strong>{agreementData.claimant_name}</strong>, inscrita no CNPJ/CPF sob o nº <strong>{agreementData.claimant_cnpj || "_______________"}</strong>, com sede à <strong>{agreementData.claimant_address || "_______________"}</strong>, ajustam o presente termo de acordo com efeitos de resolução e quitação de relações jurídicas, que se regerá pelas condições seguintes:
                </p>
              ) : (
                <p className="print:m-0">
                  Pelo presente instrumento particular, <strong>CASA DO SERRALHEIRO LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>{agreementData.first_party_cnpj}</strong>, com sede na <strong>{agreementData.first_party_address}</strong>, ajusta o presente termo de acordo com efeitos de resolução e quitação de relações jurídicas, que se regerá pelas condições seguintes:
                </p>
              )}

              {/* Seções */}
              <div className="border-t-2 border-zinc-300 pt-4 mt-4 print:border-t print:pt-3 print:mt-3">
                <h2 className="font-bold text-center uppercase text-xs sm:text-sm mb-3 print:text-xs print:mb-2 print:leading-tight">
                  I - DO OBJETO DA TRANSAÇÃO E DO PRESENTE ACORDO
                </h2>

                <div className="space-y-3 print:space-y-2">
                  <div>
                    <p className="font-bold mb-1 print:mb-0.5">Cláusula 1ª.</p>
                    <p className="print:m-0">
                      As partes acima qualificadas mantiveram relação jurídica de compra e venda de produtos, vinculada ao orçamento/chamado nº <strong>{agreementData.budget_number || "_______________"}</strong>, no valor total de <strong>R$ {agreementData.total_value || "_______________"}</strong>.
                    </p>
                  </div>

                  <div>
                    <p className="font-bold mb-1 print:mb-0.5">Cláusula 2ª. - FORMAS DE RESOLUÇÃO</p>
                    <p className="mb-2 print:m-0 print:mb-1">
                      Para a resolução do presente impasse e a quitação da relação em questão, a primeira acordante compromete-se a realizar:
                    </p>
                    <div className="ml-4 space-y-1 text-xs sm:text-sm print:ml-3 print:space-y-0.5 print:text-xs print:leading-tight">
                      {resolutionItems.length > 0 ? (
                        <>
                          {resolutionItems.map((item, idx) => (
                            <p key={item.id} className="text-zinc-700 print:m-0">
                              {idx + 1}. {getResolutionTitle(item.type)}
                              {item.type === "material" && (
                                <>: <span className="font-semibold">{item.description || "a definir"}</span></>
                              )}
                              {item.type === "credit" && (
                                <>: <span className="font-semibold">R$ {item.value || "a definir"}</span></>
                              )}
                              {item.type === "painting" && item.value && (
                                <>: <span className="font-semibold">{item.value}</span></>
                              )}
                            </p>
                          ))}
                        </>
                      ) : (
                        <p className="italic text-zinc-500">_______________________________________________</p>
                      )}
                    </div>
                    <p className="mt-2 print:m-0 print:mt-1">
                      no prazo de até <strong>30 dias úteis</strong> após a assinatura do presente termo, conforme estipulado entre as partes, de modo a atender integralmente as condições acordadas.
                    </p>
                  </div>

                  <div>
                    <p className="font-bold mb-1 print:mb-0.5">Cláusula 3ª.</p>
                    <p className="print:m-0">
                      Fica acordado entre as partes que, caso o presente termo não seja assinado pela segunda acordante no prazo de 7 dias úteis a contar da data de envio para sua devida assinatura, o referido acordo será automaticamente desconsiderado, sendo interpretado como renúncia ao mesmo, não gerando, assim, qualquer vínculo ou obrigação entre as partes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Disposições Finais */}
              <div className="border-t-2 border-zinc-300 pt-4 print:border-t print:pt-3">
                <h2 className="font-bold text-center uppercase text-xs sm:text-sm mb-3 print:text-xs print:mb-2">
                  II - DAS CONDIÇÕES GERAIS E DAS DISPOSIÇÕES FINAIS
                </h2>

                <div className="space-y-3 print:space-y-2">
                  <div>
                    <p className="font-bold mb-1 print:mb-0.5">Cláusula 4ª.</p>
                    <p className="print:m-0">
                      As partes acordantes, de livre e espontânea vontade, ajustam o presente termo em comutatividade e paridade, encerrando, após o cumprimento das obrigações aqui estabelecidas, qualquer relação jurídica ou fática preexistente, nada mais podendo ser exigido, a qualquer título.
                    </p>
                  </div>

                  <div>
                    <p className="font-bold mb-1 print:mb-0.5">Cláusula 5ª.</p>
                    <p className="print:m-0">
                      {agreementData.claimant_name 
                        ? "As partes elegem o foro da Comarca de Cariacica/ES para dirimir quaisquer controvérsias oriundas deste instrumento."
                        : "A Casa do Serralheiro LTDA elege o foro da Comarca de Cariacica/ES para dirimir quaisquer controvérsias oriundas deste instrumento."
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Assinaturas */}
              <div className="border-t-2 border-zinc-300 pt-6 mt-6 print:border-t print:pt-4 print:mt-4">
                <p className="text-center mb-6 italic text-xs sm:text-sm print:mb-4 print:mt-2">
                  E, por estarem justas e acordadas, assinam o presente instrumento em {agreementData.claimant_name ? "02 (duas)" : "01 (uma)"} via{agreementData.claimant_name ? "s" : ""} de igual teor e forma, na presença de testemunhas.
                </p>

                <p className="text-center font-bold mb-10 text-xs sm:text-sm print:mb-6 print:text-xs">
                  Cariacica/ES, {agreementData.signature_date}
                </p>

                {/* Assinante 1 */}
                <div className="mb-8 print:mb-6">
                  <p className="text-center font-bold text-xs sm:text-sm print:text-xs">CASA DO SERRALHEIRO LTDA</p>
                  <div style={{ height: '40px' }} className="print:h-10"></div>
                  <p className="text-center text-xs sm:text-sm print:text-xs print:m-0">
                    {agreementData.representative_name || "___________________________________"}
                  </p>
                  <p className="text-center text-xs sm:text-sm print:text-xs print:m-0">CPF: {agreementData.representative_cpf || "_______________"}</p>
                </div>

                {/* Assinante 2 - Apenas se preenchida */}
                {agreementData.claimant_name && (
                  <div className="mb-8 print:mb-6">
                    <p className="text-center font-bold text-xs sm:text-sm print:text-xs">SEGUNDA ACORDANTE</p>
                    <p className="text-center text-xs sm:text-sm print:text-xs">{agreementData.claimant_name}</p>
                    <div style={{ height: '40px' }} className="print:h-10"></div>
                    <p className="text-center text-xs sm:text-sm print:text-xs print:m-0">
                      {agreementData.representative_name || "___________________________________"}
                    </p>
                    <p className="text-center text-xs sm:text-sm print:text-xs print:m-0">CPF: {agreementData.representative_cpf || "_______________"}</p>
                  </div>
                )}

                {/* Testemunhas */}
                <div className="grid grid-cols-2 gap-4 print:gap-3">
                  <div>
                    <p className="text-center font-bold text-xs sm:text-sm print:text-xs">TESTEMUNHA 1</p>
                    <div style={{ height: '40px' }} className="print:h-10"></div>
                    <p className="text-center text-xs sm:text-sm print:text-xs print:m-0">
                      {agreementData.witness1_name || "___________________________________"}
                    </p>
                    <p className="text-center text-xs sm:text-sm print:text-xs print:m-0">CPF: {agreementData.witness1_cpf || "_______________"}</p>
                  </div>
                  <div>
                    <p className="text-center font-bold text-xs sm:text-sm print:text-xs">TESTEMUNHA 2</p>
                    <div style={{ height: '40px' }} className="print:h-10"></div>
                    <p className="text-center text-xs sm:text-sm print:text-xs print:m-0">
                      {agreementData.witness2_name || "___________________________________"}
                    </p>
                    <p className="text-center text-xs sm:text-sm print:text-xs print:m-0">CPF: {agreementData.witness2_cpf || "_______________"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
