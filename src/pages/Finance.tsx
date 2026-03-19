import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Wallet, Plus, Trash2, FileText, Download, Search, User, MapPin, Calendar, Receipt, Calculator, Printer } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { toPng } from 'html-to-image';
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Request {
  id: string;
  company_name: string;
  responsible_name: string;
  phone: string;
  address: string;
  description: string;
  budget_number?: string;
}

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  type: 'visit' | 'painting' | 'custom';
  requestId?: string; // Reference to the linked report (request)
}

interface FinanceData {
  clientName: string;
  cnpj: string;
  requester: string;
  observation: string;
  serviceDescription: string;
  requestId?: string;
  companyType?: 'serralheiro' | 'serralheira' | 'other';
}

interface PreSale {
  id: number;
  service_type: string;
  area_m2: number;
  unit_value: number;
  total_value: number;
  observations: string;
}

interface TechnicalVisit {
  id: number;
  visit_date: string;
  technician_name: string;
  observations: string;
  value: number;
}

export default function Finance() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [financeData, setFinanceData] = useState<FinanceData>({
    clientName: "",
    cnpj: "",
    requester: "",
    observation: "",
    serviceDescription: "",
    companyType: 'other'
  });
  
  // Painting inputs
  const [paintingArea, setPaintingArea] = useState<number>(0);
  
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyTypeChange = (type: 'serralheiro' | 'serralheira' | 'other') => {
    let clientName = "";
    let cnpj = "";
    
    if (type === 'serralheiro') {
      clientName = "Casa do Serralheiro";
      cnpj = "00.000.000/0001-00"; // Placeholder
    } else if (type === 'serralheira') {
      clientName = "Casa da Serralheira";
      cnpj = "11.111.111/0001-11"; // Placeholder
    }

    setFinanceData(prev => ({
      ...prev,
      companyType: type,
      clientName: clientName || prev.clientName,
      cnpj: cnpj || prev.cnpj
    }));
  };

  const handleSelectReport = async (requestId: string) => {
    if (!requestId) {
      setSelectedRequest(null);
      setFinanceData(prev => ({
        ...prev,
        requestId: undefined,
        clientName: "",
        requester: ""
      }));
      setItems([]);
      return;
    }

    const req = requests.find(r => r.id.toString() === requestId);
    if (!req) return;

    setSelectedRequest(req);
    setFinanceData(prev => ({
      ...prev,
      clientName: req.company_name,
      requester: req.responsible_name,
      requestId: req.id.toString()
    }));

    // Fetch related data (visits, pre-sales) to populate items automatically
    try {
      const [visitsRes, preSalesRes] = await Promise.all([
        fetch(`/api/requests/${requestId}/visits`),
        fetch(`/api/requests/${requestId}/pre-sales`)
      ]);

      const visits: TechnicalVisit[] = await visitsRes.json();
      const preSales: PreSale[] = await preSalesRes.json();

      const newItems: OrderItem[] = [];

      visits.forEach(v => {
        newItems.push({
          id: `visit-${v.id}`,
          description: `Visita Técnica - ${v.technician_name || 'Técnico'} (${format(new Date(v.visit_date), 'dd/MM/yyyy')})`,
          quantity: 1,
          unitValue: v.value || 150,
          totalValue: v.value || 150,
          type: 'visit',
          requestId: requestId
        });
      });

      preSales.forEach(ps => {
        newItems.push({
          id: `presale-${ps.id}`,
          description: `${ps.service_type} (${ps.area_m2}m²)`,
          quantity: ps.area_m2,
          unitValue: ps.unit_value || 20,
          totalValue: ps.total_value,
          type: ps.service_type.toLowerCase().includes('pintura') ? 'painting' : 'custom',
          requestId: requestId
        });
      });

      setItems(newItems);
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  const addItem = (type: 'visit' | 'painting' | 'custom') => {
    let newItem: OrderItem;
    
    if (type === 'visit') {
      newItem = {
        id: Math.random().toString(36).substr(2, 9),
        description: 'Visita Técnica Especializada',
        quantity: 1,
        unitValue: 150,
        totalValue: 150,
        type: 'visit'
      };
    } else if (type === 'painting') {
      const total = paintingArea * 20;
      newItem = {
        id: Math.random().toString(36).substr(2, 9),
        description: `Serviço de Pintura (${paintingArea}m²)`,
        quantity: paintingArea,
        unitValue: 20,
        totalValue: total,
        type: 'painting'
      };
    } else {
      newItem = {
        id: Math.random().toString(36).substr(2, 9),
        description: 'Novo Serviço',
        quantity: 1,
        unitValue: 0,
        totalValue: 0,
        type: 'custom'
      };
    }
    
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemValue = (id: string, value: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, unitValue: value, totalValue: value * item.quantity };
      }
      return item;
    }));
  };

  const totalAmount = items.reduce((acc, item) => acc + item.totalValue, 0);

  const handleGeneratePDF = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-3">
            <Wallet className="text-blue-600" />
            Financeiro
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">
            Geração de Relatórios Financeiros e Ordens de Compra
          </p>
        </div>
        {isCreating && (
          <button
            onClick={handleGeneratePDF}
            disabled={generating || items.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 font-bold text-sm print:hidden"
          >
            <Printer size={20} />
            Imprimir / PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 print:hidden">
        {/* Selection Panel */}
        <div className="lg:col-span-1 space-y-6">
          <button
            onClick={() => setIsCreating(true)}
            className={`w-full p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${
              isCreating 
                ? "bg-blue-50 border-blue-200 ring-4 ring-blue-500/10" 
                : "bg-white border-dashed border-zinc-200 hover:border-blue-400 hover:bg-zinc-50"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCreating ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-400"}`}>
              <FileText size={24} />
            </div>
            <div className="text-center">
              <p className="font-bold text-zinc-900">Gerar relatório financeiro</p>
              <p className="text-xs text-zinc-500 mt-1">Criar novo documento financeiro</p>
            </div>
          </button>

          {isCreating && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-zinc-200 space-y-6"
            >
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                  <User size={18} className="text-blue-500" />
                  Dados do Relatório
                </h3>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Empresa</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleCompanyTypeChange('serralheiro')}
                      className={cn(
                        "py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                        financeData.companyType === 'serralheiro' 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                          : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                      )}
                    >
                      C. Serralheiro
                    </button>
                    <button
                      onClick={() => handleCompanyTypeChange('serralheira')}
                      className={cn(
                        "py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                        financeData.companyType === 'serralheira' 
                          ? "bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-200" 
                          : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                      )}
                    >
                      C. Serralheira
                    </button>
                    <button
                      onClick={() => handleCompanyTypeChange('other')}
                      className={cn(
                        "py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                        financeData.companyType === 'other' 
                          ? "bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-200" 
                          : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                      )}
                    >
                      Outro
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Cliente</label>
                  <input
                    type="text"
                    value={financeData.clientName}
                    onChange={(e) => setFinanceData({...financeData, clientName: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CNPJ</label>
                  <input
                    type="text"
                    value={financeData.cnpj}
                    onChange={(e) => setFinanceData({...financeData, cnpj: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Vincular a um laudo? (Opcional)</label>
                  <select
                    value={financeData.requestId || ""}
                    onChange={(e) => handleSelectReport(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                  >
                    <option value="">Sem laudo vinculado</option>
                    {requests.map(req => (
                      <option key={req.id} value={req.id}>#{req.id} - {req.company_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Solicitante</label>
                  <input
                    type="text"
                    value={financeData.requester}
                    onChange={(e) => setFinanceData({...financeData, requester: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Serviço</label>
                  <textarea
                    value={financeData.serviceDescription}
                    onChange={(e) => setFinanceData({...financeData, serviceDescription: e.target.value})}
                    placeholder="Descrição do serviço prestado..."
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm min-h-[80px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observação</label>
                  <textarea
                    value={financeData.observation}
                    onChange={(e) => setFinanceData({...financeData, observation: e.target.value})}
                    placeholder="Observações adicionais..."
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm min-h-[80px]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 space-y-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                  <Plus size={18} className="text-blue-500" />
                  Adicionar Itens
                </h3>
                
                <button
                  onClick={() => addItem('visit')}
                  className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-700 text-sm font-medium flex items-center justify-between transition-all"
                >
                  <span>Visita Técnica</span>
                  <Plus size={16} />
                </button>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Serviço de Pintura</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        placeholder="Metragem (m²)"
                        value={paintingArea || ''}
                        onChange={(e) => setPaintingArea(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">m²</span>
                    </div>
                    <button
                      onClick={() => addItem('painting')}
                      disabled={!paintingArea}
                      className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => addItem('custom')}
                  className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-700 text-sm font-medium flex items-center justify-between transition-all"
                >
                  <span>Outro Serviço</span>
                  <Plus size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-2 space-y-6">
          {!isCreating ? (
            <div className="h-full min-h-[300px] sm:min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-zinc-200 p-8 sm:p-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4 text-zinc-400">
                <Receipt size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-zinc-900">Área Financeira</h3>
              <p className="text-zinc-500 mt-2 max-w-xs mx-auto text-xs sm:text-sm">
                Clique em "Gerar relatório financeiro" para começar a criar um novo documento.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Items List */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-zinc-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-bold text-zinc-900 text-base sm:text-lg flex items-center gap-2">
                    <Receipt size={20} className="text-blue-500" />
                    Itens do Relatório
                  </h3>
                  <div className="text-left sm:text-right bg-blue-50 p-3 rounded-xl sm:bg-transparent sm:p-0">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Total Geral</p>
                    <p className="text-xl sm:text-2xl font-black text-blue-600">
                      {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {items.length === 0 ? (
                    <p className="text-center py-8 text-zinc-400 italic text-xs sm:text-sm">Nenhum item adicionado ainda.</p>
                  ) : (
                    items.map((item, index) => (
                      <div key={item.id} className="bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
                        <div className="bg-zinc-100/50 px-4 py-2 border-b border-zinc-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Serviço #{index + 1}</span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição do Item</label>
                              <textarea
                                value={item.description}
                                rows={3}
                                onChange={(e) => {
                                  setItems(items.map(i => i.id === item.id ? { ...i, description: e.target.value } : i));
                                }}
                                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold text-zinc-900 outline-none focus:border-blue-500 transition-all resize-y"
                                placeholder="Descreva o serviço..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Vincular Laudo</label>
                              <select
                                value={item.requestId || ""}
                                onChange={(e) => {
                                  setItems(items.map(i => i.id === item.id ? { ...i, requestId: e.target.value } : i));
                                }}
                                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-zinc-900"
                              >
                                <option value="">Sem laudo</option>
                                {requests.map(req => (
                                  <option key={req.id} value={req.id}>#{req.id} - {req.company_name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quantidade</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const qty = Number(e.target.value);
                                    setItems(items.map(i => i.id === item.id ? { ...i, quantity: qty, totalValue: qty * i.unitValue } : i));
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 outline-none focus:border-blue-500 transition-all"
                                />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">{item.type === 'painting' ? 'm²' : 'un'}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor Unitário</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">R$</span>
                                <input
                                  type="number"
                                  value={item.unitValue}
                                  onChange={(e) => updateItemValue(item.id, Number(e.target.value))}
                                  className="w-full pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 outline-none focus:border-blue-500 transition-all text-right"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="pt-2 flex justify-end items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Subtotal:</span>
                            <span className="font-black text-blue-600">
                              {item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-zinc-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                <div className="flex justify-between items-start mb-6 sm:mb-8">
                  <div>
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Visualização Prévia</h4>
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">Relatório Financeiro</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-zinc-400">{format(new Date(), "dd/MM/yyyy")}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Cliente</p>
                      <p className="font-bold text-zinc-900 text-sm sm:text-base">{financeData.clientName}</p>
                      <p className="text-[10px] sm:text-xs text-zinc-500">CNPJ: {financeData.cnpj}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Solicitante</p>
                      <p className="text-xs sm:text-sm font-bold text-zinc-900">{financeData.requester || '---'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="text-xs py-2 border-b border-zinc-100 last:border-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-zinc-900 line-clamp-2 pr-4">{item.description}</span>
                          <span className="font-black text-blue-600 whitespace-nowrap">
                            {item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        {item.requestId && (
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Ref: Laudo #{item.requestId}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex justify-between items-center">
                    <span className="text-[10px] sm:text-sm font-bold text-zinc-400 uppercase tracking-widest">Total Estimado</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600">
                      {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* PDF Preview (Visible only during print) */}
      <div className="hidden print:block">
        <div 
          ref={reportRef}
          className="w-full bg-white p-0 font-sans text-zinc-900"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-4 border-blue-600 pb-8 mb-8">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl",
                financeData.companyType === 'serralheiro' ? "bg-blue-600" : 
                financeData.companyType === 'serralheira' ? "bg-pink-600" : "bg-zinc-900"
              )}>
                RZV
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase">
                  Relatório <span className="text-blue-600">Financeiro</span>
                </h1>
                <p className="text-zinc-500 font-bold text-xs tracking-[0.2em] uppercase">RZV Engenharia & Consultoria</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Data de Emissão</p>
              <p className="text-lg font-bold text-zinc-900">{format(new Date(), "dd/MM/yyyy")}</p>
              <p className="text-zinc-500 text-[10px] mt-1 uppercase tracking-widest font-bold">Nº {financeData.requestId?.padStart(4, '0') || '0000'}</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Dados do Cliente</h3>
              <div className="space-y-2">
                <p className="text-lg font-bold text-zinc-900">{financeData.clientName}</p>
                <p className="text-sm text-zinc-600 font-bold">CNPJ: {financeData.cnpj}</p>
                <div className="flex items-center gap-2 text-zinc-600 text-sm mt-2">
                  <User size={14} className="text-blue-500" />
                  <span>Solicitante: {financeData.requester}</span>
                </div>
              </div>
            </div>
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Informações da Empresa</h3>
              <div className="space-y-2 text-sm text-zinc-600">
                <p className="font-bold text-zinc-900">RZV Engenharia LTDA</p>
                <p>CNPJ: 00.000.000/0001-00</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">CREA/ES ES-044985/D</p>
                <p>contato@rzvengenharia.com.br</p>
              </div>
            </div>
          </div>

          {/* Service Description */}
          {(financeData.serviceDescription || financeData.observation) && (
            <div className="mb-12 space-y-6">
              {financeData.serviceDescription && (
                <div>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Serviço Prestado</h3>
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{financeData.serviceDescription}</p>
                </div>
              )}
              {financeData.observation && (
                <div>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Observações</h3>
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{financeData.observation}</p>
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className="mb-12">
            <div className="w-full border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200">
                    <th className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest w-16">Item</th>
                    <th className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição detalhada</th>
                    <th className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right w-24">Qtd</th>
                    <th className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right w-32">Unitário</th>
                    <th className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-4 text-sm font-bold text-zinc-400 align-top">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-bold text-zinc-900 mb-1 whitespace-pre-wrap">{item.description}</p>
                        {item.requestId && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase tracking-wider">
                            <FileText size={10} />
                            Ref: Laudo #{item.requestId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-zinc-600 text-right align-top whitespace-nowrap">
                        {item.quantity} {item.type === 'painting' ? 'm²' : 'un'}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-zinc-600 text-right align-top whitespace-nowrap">
                        {item.unitValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-blue-600 text-right align-top whitespace-nowrap">
                        {item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 flex justify-end">
              <div className="w-64 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-zinc-900">{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="h-px bg-zinc-100"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-zinc-900 uppercase tracking-widest">Valor Total</span>
                  <span className="text-2xl font-black text-blue-600">
                    {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-12 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-12">
              <div className="flex flex-col items-center justify-end">
                <div className="w-full border-b border-zinc-300 mb-2"></div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Responsável RZV</p>
              </div>
              <div className="flex flex-col items-center justify-end">
                <div className="w-full border-b border-zinc-300 mb-2"></div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Assinatura Cliente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
