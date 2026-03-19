import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Loader2,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  FileText,
  CloudUpload,
  Copy
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toPng } from 'html-to-image';
import { jsPDF } from "jspdf";

interface Request {
  id: number;
  company_name: string;
  responsible_name: string;
  phone: string;
  address: string;
  budget_number: string;
  agreement?: any;
}

export default function AgreementTerm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const agreementRef = useRef<HTMLDivElement>(null);

  const [agreementData, setAgreementData] = useState({
    first_party: "CASA DO SERRALHEIRO LTDA",
    first_party_cnpj: "12.982.965/0001-06",
    first_party_address: "BR 262, Campo Grande, Cariacica/ES",
    claimant_name: "",
    claimant_id: "",
    claimant_address: "",
    is_legal_validated: false,
    budget_number: "",
    total_value: "0,00",
    total_value_text: "zero reais",
    commercial_ref: "fornecimento de materiais",
    product_description: "produtos de engenharia",
    service_description: "assistência técnica e reparos",
    payment_conditions: "Sem ônus para o cliente",
    execution_responsible: "Equipe Técnica",
    deadline: "30 dias úteis",
    forum: "Cariacica, ES",
    sig1_name: "CASA DO SERRALHEIRO",
    sig1_role: "Primeira Acordante",
    sig2_name: "",
    sig2_role: "Segunda Acordante",
    witness1_name: "",
    witness1_id: "",
    witness2_name: "",
    witness2_id: ""
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
        setAgreementData({
          ...agreementData,
          ...data.agreement
        });
      } else {
        // Pre-fill with request data if available
        setAgreementData(prev => ({
          ...prev,
          claimant_name: data.company_name || "",
          claimant_address: data.address || "",
          budget_number: data.budget_number || ""
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: id,
          ...agreementData
        })
      });
      alert("Termo de acordo salvo com sucesso!");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = () => {
    localStorage.setItem('agreement_template', JSON.stringify(agreementData));
    alert("Acordo salvo como modelo padrão!");
  };

  const handleLoadTemplate = () => {
    const template = localStorage.getItem('agreement_template');
    if (template) {
      setAgreementData(JSON.parse(template));
      alert("Modelo carregado com sucesso!");
    } else {
      alert("Nenhum modelo salvo encontrado.");
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleSaveToServer = async () => {
    if (!agreementRef.current) return;
    setUploadingPdf(true);
    try {
      // 1. Generate PDF
      const imgData = await toPng(agreementRef.current, {
        pixelRatio: 2,
        skipFonts: true,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfDataUri = pdf.output('datauristring');

      // 2. Upload to Server
      const fileName = `agreement-${id}-${Date.now()}.pdf`;

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: pdfDataUri, fileName })
      });

      if (!res.ok) throw new Error("Failed to upload");
      const { url } = await res.json();

      alert(`Termo salvo no servidor com sucesso!\nURL: ${url}`);
    } catch (error) {
      console.error('Error saving to server:', error);
      alert('Erro ao salvar no servidor.');
    } finally {
      setUploadingPdf(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>;
  if (!request) return <div className="p-8 text-center text-zinc-500">Chamado não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 print:p-0 print:m-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors w-fit"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Voltar</span>
        </button>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold border ${agreementData.is_legal_validated ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
            {agreementData.is_legal_validated ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            {agreementData.is_legal_validated ? 'VALIDADO' : 'PENDENTE'}
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
          <button 
            onClick={handleSaveAsTemplate}
            className="flex-1 sm:flex-none bg-zinc-900 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <Copy size={16} />
            Salvar como Modelo
          </button>
          <button 
            onClick={handleLoadTemplate}
            className="flex-1 sm:flex-none bg-white border border-zinc-200 text-zinc-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
          >
            Carregar Modelo
          </button>
          <button 
            onClick={handleDownloadPdf}
            className="flex-1 sm:flex-none bg-white border border-zinc-200 text-zinc-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={16} />
            Imprimir / PDF
          </button>
          <button 
            onClick={handleSaveToServer}
            disabled={uploadingPdf}
            className="w-full sm:w-auto bg-blue-50 text-blue-700 border border-blue-200 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploadingPdf ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
            Salvar no Supabase
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-6 print:hidden">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
          <UserCheck className="text-blue-700" size={20} />
          <h2 className="font-bold text-zinc-900">Dados do Reclamante & Validação</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da 1ª Acordante</label>
            <input 
              type="text"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={agreementData.first_party}
              onChange={e => setAgreementData({...agreementData, first_party: e.target.value})}
              placeholder="Nome da empresa"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CNPJ da 1ª Acordante</label>
            <input 
              type="text"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={agreementData.first_party_cnpj}
              onChange={e => setAgreementData({...agreementData, first_party_cnpj: e.target.value})}
              placeholder="00.000.000/0001-00"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço da 1ª Acordante</label>
            <input 
              type="text"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={agreementData.first_party_address}
              onChange={e => setAgreementData({...agreementData, first_party_address: e.target.value})}
              placeholder="Endereço completo"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da 2ª Acordante</label>
            <input 
              type="text"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={agreementData.claimant_name}
              onChange={e => setAgreementData({...agreementData, claimant_name: e.target.value})}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CPF/CNPJ da 2ª Acordante</label>
            <input 
              type="text"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={agreementData.claimant_id}
              onChange={e => setAgreementData({...agreementData, claimant_id: e.target.value})}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço da 2ª Acordante</label>
            <input 
              type="text"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={agreementData.claimant_address}
              onChange={e => setAgreementData({...agreementData, claimant_address: e.target.value})}
              placeholder="Endereço completo"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-zinc-100">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-900">Validação Jurídica</p>
            <p className="text-xs text-zinc-500">Marque se este termo já foi revisado e aprovado pelo departamento jurídico.</p>
          </div>
          <button 
            onClick={() => setAgreementData({...agreementData, is_legal_validated: !agreementData.is_legal_validated})}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-bold transition-all ${agreementData.is_legal_validated ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/20' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
          >
            {agreementData.is_legal_validated ? 'Validado' : 'Validar Agora'}
          </button>
        </div>

        <div className="pt-4 border-t border-zinc-100 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-700" size={20} />
            <h2 className="font-bold text-zinc-900">Detalhes do Acordo</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Referência Comercial</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.commercial_ref}
                onChange={e => setAgreementData({...agreementData, commercial_ref: e.target.value})}
                placeholder="Ex: fornecimento de telhas"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor do Acordo (R$)</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.total_value}
                onChange={e => setAgreementData({...agreementData, total_value: e.target.value})}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Serviços Incluídos</label>
              <textarea 
                rows={2}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                value={agreementData.service_description}
                onChange={e => setAgreementData({...agreementData, service_description: e.target.value})}
                placeholder="Descreva os serviços que serão realizados"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Condições de Pagamento</label>
              <textarea 
                rows={2}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                value={agreementData.payment_conditions}
                onChange={e => setAgreementData({...agreementData, payment_conditions: e.target.value})}
                placeholder="Ex: Sem custo, ou parcelamento em 3x..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Responsáveis pela Execução</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.execution_responsible}
                onChange={e => setAgreementData({...agreementData, execution_responsible: e.target.value})}
                placeholder="Nome da equipe ou empresa"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prazo de Execução</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.deadline}
                onChange={e => setAgreementData({...agreementData, deadline: e.target.value})}
                placeholder="Ex: 30 dias úteis"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="text-blue-700" size={20} />
            <h2 className="font-bold text-zinc-900">Assinaturas (Áreas de Responsabilidade)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Testemunha 1 (Nome)</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.witness1_name}
                onChange={e => setAgreementData({...agreementData, witness1_name: e.target.value})}
                placeholder="Nome da testemunha"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Testemunha 1 (CPF)</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.witness1_id}
                onChange={e => setAgreementData({...agreementData, witness1_id: e.target.value})}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Testemunha 2 (Nome)</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.witness2_name}
                onChange={e => setAgreementData({...agreementData, witness2_name: e.target.value})}
                placeholder="Nome da testemunha"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Testemunha 2 (CPF)</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.witness2_id}
                onChange={e => setAgreementData({...agreementData, witness2_id: e.target.value})}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Assinatura 1</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none mb-2"
                value={agreementData.sig1_name}
                onChange={e => setAgreementData({...agreementData, sig1_name: e.target.value})}
                placeholder="Nome"
              />
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.sig1_role}
                onChange={e => setAgreementData({...agreementData, sig1_role: e.target.value})}
                placeholder="Cargo / Papel"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Assinatura 2</label>
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none mb-2"
                value={agreementData.sig2_name}
                onChange={e => setAgreementData({...agreementData, sig2_name: e.target.value})}
                placeholder="Nome (Deixe vazio para usar o da 2ª Acordante)"
              />
              <input 
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={agreementData.sig2_role}
                onChange={e => setAgreementData({...agreementData, sig2_role: e.target.value})}
                placeholder="Cargo / Papel"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 print:overflow-visible print:mx-0 print:px-0">
        <div ref={agreementRef} className="bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden print:border-none print:shadow-none min-w-[320px] print:w-full print:rounded-none">
          <div className="p-8 sm:p-12 space-y-8 font-serif text-zinc-900 leading-relaxed">
            <div className="text-center space-y-2 border-b border-zinc-200 pb-6">
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight">TERMO DE ACORDO EXTRAJUDICIAL</h1>
              <p className="text-xs text-zinc-500 font-sans">Resolução em quitação referente ao chamado #{request.id}</p>
            </div>

            <div className="space-y-6 text-sm sm:text-base text-justify">
              <p>
                Pelo presente instrumento particular, de um lado <strong className="uppercase">{agreementData.first_party}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº <strong>{agreementData.first_party_cnpj}</strong>, com sede na {agreementData.first_party_address}, doravante denominada <strong>PRIMEIRA ACORDANTE</strong>, e de outro lado:
              </p>

              <p>
                <strong className="uppercase">{agreementData.claimant_name || "____________________"}</strong>,<br />
                pessoa física / jurídica, inscrita no CPF/CNPJ nº <strong>{agreementData.claimant_id || "____________________"}</strong>, com endereço em {agreementData.claimant_address || "____________________"}, doravante denominado <strong>SEGUNDO ACORDANTE</strong>,
              </p>

              <p>
                têm entre si justo e acordado o presente TERMO DE ACORDO EXTRAJUDICIAL, que se regerá pelas cláusulas e condições seguintes.
              </p>

              <div className="py-4 text-center">⸻</div>

              <section className="space-y-4">
                <h3 className="font-bold uppercase tracking-wider text-center">I – DO OBJETO DA TRANSAÇÃO E DO PRESENTE ACORDO</h3>
                
                <div className="space-y-4">
                  <p>
                    <strong>Cláusula 1ª</strong><br />
                    As partes mantiveram relação comercial referente a <strong>{agreementData.commercial_ref || "____________________"}</strong>, vinculada ao pedido/contrato nº <strong>{agreementData.budget_number || "______"}</strong>, no valor total de <strong>R$ {agreementData.total_value || "_________"}</strong>, referente a <strong>{agreementData.product_description || "____________________"}</strong>.
                  </p>

                  <p>
                    <strong>Cláusula 2ª</strong><br />
                    Para resolução do presente impasse e quitação da relação comercial, as partes ajustam que:
                  </p>

                  <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-100 italic whitespace-pre-wrap">
                    {agreementData.service_description || "______________________\n\n______________________\n\n______________________"}
                  </div>

                  <p>
                    Podendo envolver, entre outras medidas:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>substituição de produto</li>
                    <li>prestação de serviço</li>
                    <li>pintura, reparo ou manutenção</li>
                    <li>pagamento parcial ou integral</li>
                    <li>outra forma de composição acordada entre as partes.</li>
                  </ul>
                </div>
              </section>

              <div className="py-4 text-center">⸻</div>

              <section className="space-y-4">
                <p>
                  <strong>Cláusula 3ª</strong><br />
                  Caso o presente termo não seja assinado pelo segundo acordante no prazo de 3 (três) dias úteis, contados da data de seu envio, o presente acordo será considerado automaticamente sem efeito, não gerando qualquer obrigação para a PRIMEIRA ACORDANTE.
                </p>
              </section>

              <div className="py-4 text-center">⸻</div>

              <section className="space-y-4">
                <h3 className="font-bold uppercase tracking-wider text-center">II – DAS CONDIÇÕES GERAIS E DISPOSIÇÕES FINAIS</h3>
                
                <div className="space-y-4">
                  <p>
                    <strong>Cláusula 4ª</strong><br />
                    Cumpridas as obrigações estabelecidas neste termo, as partes dão entre si plena, geral e irrevogável quitação, nada mais podendo reclamar uma da outra a qualquer título, relativamente ao objeto tratado neste instrumento.
                  </p>

                  <p>
                    <strong>Cláusula 5ª</strong><br />
                    Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o foro da comarca de <strong>{agreementData.forum}</strong>, renunciando a qualquer outro, por mais privilegiado que seja.
                  </p>
                </div>
              </section>

              <div className="py-4 text-center">⸻</div>

              <p>
                E, por estarem justas e acordadas, assinam o presente instrumento em 02 (duas) vias de igual teor, na presença das testemunhas abaixo.
              </p>

              <p className="pt-4">
                Cariacica/ES, {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
              </p>

              <div className="py-4 text-center">⸻</div>

              <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-16">
                <div className="space-y-4">
                  <div className="border-b border-zinc-900 pb-1"></div>
                  <div className="text-center">
                    <p className="font-bold uppercase text-sm">{agreementData.first_party}</p>
                    <p className="text-xs text-zinc-500">Primeira Acordante</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-zinc-900 pb-1"></div>
                  <div className="text-center">
                    <p className="font-bold uppercase text-sm">{agreementData.sig2_name || agreementData.claimant_name || "SEGUNDO ACORDANTE"}</p>
                    <p className="text-xs text-zinc-500">Segundo Acordante</p>
                    {agreementData.claimant_id && <p className="text-[10px] text-zinc-400">CPF/CNPJ: {agreementData.claimant_id}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-zinc-900 pb-1"></div>
                  <div className="text-center">
                    <p className="font-bold uppercase text-sm">{agreementData.witness1_name || "TESTEMUNHA 1"}</p>
                    {agreementData.witness1_id && <p className="text-[10px] text-zinc-400">CPF: {agreementData.witness1_id}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-zinc-900 pb-1"></div>
                  <div className="text-center">
                    <p className="font-bold uppercase text-sm">{agreementData.witness2_name || "TESTEMUNHA 2"}</p>
                    {agreementData.witness2_id && <p className="text-[10px] text-zinc-400">CPF: {agreementData.witness2_id}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 text-center space-y-1">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
              Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
            </p>
            <p className="text-[9px] text-blue-600/50 font-bold uppercase tracking-widest">
              Responsável Técnico: ES-044985/D
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
