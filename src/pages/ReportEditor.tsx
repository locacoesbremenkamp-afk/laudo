import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Sparkles, 
  Save, 
  Printer, 
  Loader2, 
  FileText,
  AlertTriangle,
  Stethoscope,
  Camera,
  Eraser,
  CloudUpload
} from "lucide-react";
import { Type } from "@google/genai";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignaturePad, SignaturePadRef } from "../components/SignaturePad";
import { toPng } from 'html-to-image';
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";

interface Request {
  id: number;
  company_name: string;
  responsible_name: string;
  description: string;
  budget_number: string;
  address: string;
  attachments: { url: string; type: string }[];
  report?: any;
}

export default function ReportEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sigCanvas = useRef<SignaturePadRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [signatureImage, setSignatureImage] = useState("");
  const [canvasWidth, setCanvasWidth] = useState(500);
  const reportRef = useRef<HTMLDivElement>(null);

  const [reportData, setReportData] = useState({
    visit_date: format(new Date(), "yyyy-MM-dd"),
    diagnosis: "Variante A (Patologias observadas): Observou-se presença de patologias leves, como acúmulo de particulados nas superfícies das telhas, corrosão superficial em pontos isolados de fixação e deformações mínimas em elementos estruturais.\n\nVariante B (Sem patologias): Não foram observadas patologias relevantes nas telhas ou elementos estruturais, com superfícies em bom estado de conservação geral.",
    technical_opinion: "Variante A (Patologias observadas): Sob a ótica da engenharia de estruturas metálicas e coberturas, as patologias leves observadas decorrem de exposição prolongada a intempéries e ausência de manutenção pós-fornecimento. Os materiais fornecidos pela Casa do Serralheiro atendem aos parâmetros nominais das normas técnicas.\n\nVariante B (Sem patologias): Sob a ótica da engenharia de estruturas metálicas e coberturas, não há indícios de patologias ou falhas nos materiais fornecidos pela Casa do Serralheiro, que se encontram em conformidade plena com as normas técnicas.",
    recommendation: "Realizar limpeza geral das superfícies das telhas e elementos estruturais para remoção de particulados.\n\nAplicar tratamento de superfície anticorrosivo (ex.: modificador molecular direto na ferrugem) em pontos isolados, se aplicável.\n\nOferecer, como bonificação de boa-fé, crédito em conta ou fornecimento de tinta protetiva para manutenção pelo Reclamante.\n\nImplementar plano de manutenção preventiva com inspeções semestrais de limpeza e fixações.\n\nRealizar avaliação pós-tratamento para validar a integridade da cobertura.",
    signature: "",
    custom_photos: [] as { url: string, description: string }[],
    json_data: {
      objective: "O presente laudo técnico tem por objetivo apresentar os resultados da inspeção e diagnóstico realizados na cobertura metálica termoacústica nas dependências do Reclamante, visando identificar as patologias observadas nas telhas metálicas e demais materiais fornecidos, avaliar se a instalação atende às normas técnicas aplicáveis e às condições de garantia, e propor visão técnica sobre as falhas operacionais relatadas.",
      documents: "Manuais técnicos de operação e manutenção do fabricante dos materiais metálicos, perfis e telhas termoacústicas; Projetos de instalação da cobertura metálica (plantas, cortes e elevações); Histórico de manutenções preventivas e corretivas da edificação (incompleto/ausente).",
      methodology: "A metodologia adotada consistiu em inspeção visual in loco dos componentes metálicos na superfície das telhas e estrutura da cobertura metálica, medições de espessura, alinhamento, fixação dos perfis e telhas, avaliação de patologias como corrosão, deformações e infiltrações, e análise baseada em verificação de conformidade com especificações de instalação de telhados metálicos.",
      standards: "ABNT NBR 14762:2010 - Telhas metálicas de aço - Requisitos e métodos de ensaio; ABNT NBR 10821-2:2014 - Sistemas de telhas - Projeto e execução de coberturas - Parte 2: Telhas metálicas; ABNT NBR 15575-4:2022 - Desempenho de edifícios habitacionais - Parte 4: Sistemas de coberturas; NR-18 - Condições e meio ambiente de trabalho na indústria da construção.",
      materials_description: "Cobertura metálica composta por telhas simples ou termoacústicas e elementos de estrutura metálica suportantes, vendidos pela Casa do Serralheiro.",
      conformity: "Variante A (Patologias observadas): A cobertura metálica e os materiais inspecionados encontram-se em estado de Conformidade geral com as normas técnicas e condições de garantia, apesar de patologias leves externas.\n\nVariante B (Sem patologias): A cobertura metálica e os materiais inspecionados encontram-se em estado de Conformidade plena com as normas técnicas e condições de garantia.",
      conclusion: "Variante A (Patologias observadas): Foi verificado que a cobertura metálica termoacústica segue as normas técnicas da ABNT. As patologias leves identificadas não podem ser atribuídas aos materiais ou fornecimento pela Casa do Serralheiro, decorrentes de uso prolongado e manutenção externa.\n\nVariante B (Sem patologias): Foi verificado que a cobertura metálica termoacústica segue integralmente as normas técnicas da ABNT, sem patologias observadas nos materiais fornecidos pela Casa do Serralheiro."
    }
  });

  useEffect(() => {
    fetchRequest();
    
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth - 4;
        setCanvasWidth(width > 0 ? width : 300);
      }
    };
    
    window.addEventListener('resize', updateWidth);
    updateWidth();
    return () => window.removeEventListener('resize', updateWidth);
  }, [id]);

  const fetchRequest = async () => {
    try {
      const res = await fetch(`/api/requests/${id}`);
      const data = await res.json();
      setRequest(data);
      if (data.report) {
        setReportData({
          visit_date: data.report.visit_date || format(new Date(), "yyyy-MM-dd"),
          diagnosis: data.report.diagnosis || reportData.diagnosis,
          technical_opinion: data.report.technical_opinion || reportData.technical_opinion,
          recommendation: data.report.recommendation || reportData.recommendation,
          signature: data.report.signature || "",
          custom_photos: data.report.custom_photos || [],
          json_data: data.report.json_data || reportData.json_data
        });
        if (data.report.signature && sigCanvas.current) {
          setTimeout(() => {
            sigCanvas.current?.fromDataURL(data.report.signature);
          }, 100);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateWithAI = async () => {
    if (!request) return;
    
    if (!window.confirm("Isso irá gerar um novo conteúdo para o laudo e substituirá os campos atuais. Deseja continuar?")) {
      return;
    }

    setAiLoading(true);
    try {
      const prompt = `
        Você é um engenheiro civil/mecânico sênior da RZV Engenharia, especialista em coberturas metálicas e telhas termoacústicas.
        Preciso gerar um laudo técnico profissional e detalhado para o chamado #${request.id}.
        
        DADOS DO CLIENTE:
        Empresa: ${request.company_name}
        Endereço: ${request.address}
        
        PROBLEMA RELATADO PELO CLIENTE:
        "${request.description}"
        
        NOTAS DE CAMPO / DIAGNÓSTICO PRELIMINAR (se houver):
        "${reportData.diagnosis}"
        
        TAREFA:
        Elabore o LAUDO TÉCNICO COMPLETO preenchendo os seguintes campos.
        Se o diagnóstico preliminar for escasso, use sua expertise para deduzir causas prováveis baseadas no problema relatado.

        CAMPOS A GERAR (JSON):
        - objective: Objetivo do laudo.
        - documents: Documentos analisados (ex: normas, projetos).
        - methodology: Metodologia utilizada (ex: inspeção visual).
        - standards: Normas técnicas aplicáveis (NBRs).
        - materials_description: Descrição dos materiais.
        - diagnosis: Análise detalhada do problema e causas.
        - technical_opinion: Parecer técnico fundamentado.
        - conformity: Avaliação de conformidade.
        - conclusion: Conclusão final.
        - recommendation: Lista de recomendações numerada e prática.

        REGRAS:
        - Linguagem: Formal, técnica, impessoal (terceira pessoa).
        - Formato: Retorne estritamente um objeto JSON com as chaves correspondentes.
        - Não inclua introduções ou conclusões fora do JSON.
      `;

      const payload = {
        model: "gemini-1.5-pro",
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          temperature: 0.7,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              objective: { type: Type.STRING },
              documents: { type: Type.STRING },
              methodology: { type: Type.STRING },
              standards: { type: Type.STRING },
              materials_description: { type: Type.STRING },
              diagnosis: { type: Type.STRING },
              technical_opinion: { type: Type.STRING },
              conformity: { type: Type.STRING },
              conclusion: { type: Type.STRING },
              recommendation: { type: Type.STRING }
            }
          }
        }
      };

      const response = await fetch("/api/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao conectar com API");
      }

      const text = data.text || "{}";
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanText);
      setReportData(prev => ({
        ...prev,
        diagnosis: result.diagnosis || prev.diagnosis,
        technical_opinion: result.technical_opinion || prev.technical_opinion,
        recommendation: result.recommendation || prev.recommendation,
        json_data: {
          ...prev.json_data,
          objective: result.objective || prev.json_data.objective,
          documents: result.documents || prev.json_data.documents,
          methodology: result.methodology || prev.json_data.methodology,
          standards: result.standards || prev.json_data.standards,
          materials_description: result.materials_description || prev.json_data.materials_description,
          conformity: result.conformity || prev.json_data.conformity,
          conclusion: result.conclusion || prev.json_data.conclusion
        }
      }));
    } catch (error) {
      alert("Erro ao gerar conteúdo com IA: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddCustomPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: dataUrl, fileName: `custom-${id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}` })
          });
          if (res.ok) {
            const { url } = await res.json();
            setReportData(prev => ({
              ...prev,
              custom_photos: [...(prev.custom_photos || []), { url, description: "" }]
            }));
          } else {
            alert("Erro ao enviar a imagem para o servidor.");
          }
        } catch (err) {
          console.error(err);
          alert("Erro catastrófico ao enviar imagem.");
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeCustomPhoto = (index: number) => {
    setReportData(prev => ({
      ...prev,
      custom_photos: prev.custom_photos.filter((_, i) => i !== index)
    }));
  };

  const updateCustomPhotoDesc = (index: number, desc: string) => {
    setReportData(prev => ({
      ...prev,
      custom_photos: prev.custom_photos.map((photo, i) => i === index ? { ...photo, description: desc } : photo)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const signature = sigCanvas.current?.isEmpty() ? "" : sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: id,
          ...reportData,
          signature
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar no banco");
      }
      alert("Relatório técnico salvo com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert("❌ Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const syncSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setSignatureImage(sigCanvas.current.getTrimmedCanvas().toDataURL("image/png"));
    } else {
      setSignatureImage("");
    }
  };

  const handleDownloadPdf = () => {
    syncSignature();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSaveToServer = async () => {
    if (!reportRef.current) return;
    setUploadingPdf(true);
    syncSignature();
    setIsGeneratingPdf(true);
    await new Promise(r => setTimeout(r, 100)); // wait for DOM
    try {
      // 1. Generate PDF
      const imgData = await toPng(reportRef.current, {
        pixelRatio: 2,
        skipFonts: true,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const pdfDataUri = pdf.output('datauristring');

      // 2. Upload to Server
      const fileName = `report-${id}-${Date.now()}.pdf`;

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: pdfDataUri, fileName })
      });

      if (!res.ok) throw new Error("Failed to upload");
      const { url } = await res.json();

      alert(`Relatório salvo no servidor com sucesso!\nURL: ${url}`);
    } catch (error) {
      console.error('Error saving to server:', error);
      alert('Erro ao salvar no servidor.');
    } finally {
      setIsGeneratingPdf(false);
      setUploadingPdf(false);
    }
  };

  const handleSaveToSupabase = async () => {
    if (!reportRef.current) return;
    setUploadingPdf(true);
    syncSignature();
    setIsGeneratingPdf(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      // 1. Generate PDF
      const imgData = await toPng(reportRef.current, {
        pixelRatio: 2,
        skipFonts: true,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const pdfBlob = pdf.output('blob');

      // 2. Upload to Supabase
      const fileName = `report-${id}-${Date.now()}.pdf`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('rzv-engenharia')
        .upload(filePath, pdfBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('rzv-engenharia')
        .getPublicUrl(filePath);

      alert(`Relatório salvo no Supabase com sucesso!\nURL: ${publicUrl}`);
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      alert('Erro ao salvar no Supabase. Verifique se o bucket "rzv-engenharia" existe e está público.');
    } finally {
      setIsGeneratingPdf(false);
      setUploadingPdf(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando formulário...</div>;
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
            onClick={generateWithAI}
            disabled={aiLoading}
            className="flex-1 sm:flex-none bg-zinc-900 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-emerald-400" />}
            Gerar Laudo com IA
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
          <button 
            onClick={handleDownloadPdf}
            className="flex-1 sm:flex-none bg-white border border-zinc-200 text-zinc-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={16} />
            Imprimir / PDF
          </button>
          <button 
            onClick={handleSaveToSupabase}
            disabled={uploadingPdf}
            className="flex-1 sm:flex-none bg-blue-50 text-blue-700 border border-blue-200 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploadingPdf ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
            Salvar no Supabase
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 print:overflow-visible print:mx-0 print:px-0">
        <div ref={reportRef} className={`bg-white border sm:rounded-3xl border-zinc-200 rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden print:border-none print:shadow-none min-w-[320px] print:w-[210mm] print:rounded-none mx-auto print:overflow-visible ${isGeneratingPdf ? 'w-[210mm]' : 'w-full'}`}>
          
          {/* VISUALIZAÇÃO DE EDIÇÃO (ESCONDIDA NA IMPRESSÃO) */}
          <div className={`print:hidden ${isGeneratingPdf ? 'hidden' : 'block'}`}>
            <div className="bg-zinc-950 p-10 sm:p-16 text-white flex flex-col md:flex-row justify-between items-center gap-10 border-b-8 border-blue-600 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full -mr-48 -mt-48" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 blur-[80px] rounded-full -ml-32 -mb-32" />
              
              <div className="space-y-6 text-center md:text-left relative z-10">
                <div className="flex items-center justify-center md:justify-start gap-6">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl border-2 border-blue-500/20">
                    <span className="text-zinc-950 font-black text-2xl tracking-tighter">RZV</span>
                  </div>
                  <div className="h-12 w-px bg-zinc-800 hidden md:block" />
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase">
                    RZV <span className="text-blue-500">ENGENHARIA</span>
                  </h1>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-zinc-100 tracking-tight uppercase">Laudo Técnico de Inspeção</h2>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.4em] flex items-center justify-center md:justify-start gap-2">
                    <span className="w-8 h-px bg-blue-600" />
                    Engenharia Diagnóstica e Consultiva
                  </p>
                </div>
              </div>
              <div className="text-center md:text-right space-y-4 relative z-10">
                <div className="bg-zinc-900/80 p-6 rounded-[2rem] border border-zinc-800 backdrop-blur-xl shadow-2xl">
                  <p className="font-black text-white mb-1 text-sm tracking-widest">RZV Engenharia Ltda.</p>
                  <p className="text-zinc-500 text-xs">rzvengenharia@gmail.com</p>
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-blue-500 font-mono font-black text-lg">LAUDO Nº {id?.padStart(4, '0')}</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 sm:p-20 space-y-16 sm:space-y-24">
              <section className="space-y-10">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">01</div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-900">Identificação e Localização</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-zinc-50/50 p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Contratante / Cliente</label>
                    <p className="text-2xl font-black text-zinc-900 tracking-tight">{request.company_name}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Local da Inspeção</label>
                    <p className="text-sm text-zinc-600 font-bold leading-relaxed">{request.address}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data da Vistoria</label>
                    <input 
                      type="date" 
                      className="w-full font-black text-zinc-900 bg-white border border-zinc-200 rounded-2xl p-4 focus:ring-8 focus:ring-blue-500/5 outline-none text-sm transition-all shadow-sm"
                      value={reportData.visit_date}
                      onChange={e => setReportData({...reportData, visit_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Responsável Técnico</label>
                    <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                      <p className="font-black text-zinc-900 text-sm">RZV Engenharia</p>
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">CREA/ES ES-044985/D</p>
                    </div>
                  </div>
                </div>
              </section>

              {[
                { step: "02", title: "Objetivo", key: "objective", color: "blue" },
                { step: "03", title: "Documentos Analisados", key: "documents", color: "blue" },
                { step: "04", title: "Metodologia", key: "methodology", color: "blue" },
                { step: "05", title: "Normas Técnicas Aplicáveis", key: "standards", color: "blue" },
                { step: "06", title: "Descrição dos Materiais Inspecionados", key: "materials_description", color: "blue" },
                { step: "07", title: "Análise Técnica e Patologias Identificadas", key: "diagnosis", color: "zinc", icon: Stethoscope },
                { step: "08", title: "Parecer Técnico", key: "technical_opinion", color: "zinc", icon: FileText },
                { step: "09", title: "Avaliação de Conformidade", key: "conformity", color: "blue" },
                { step: "10", title: "Conclusão", key: "conclusion", color: "blue" },
                { step: "11", title: "Recomendações", key: "recommendation", color: "orange", icon: AlertTriangle },
              ].map((section) => (
                <section key={section.key} className="space-y-4">
                  {section.icon ? (
                    <div className="flex items-center gap-3 text-zinc-900">
                      <div className={`w-8 h-8 ${section.color === "orange" ? "bg-orange-500" : section.color === "zinc" ? "bg-zinc-900" : "bg-blue-700"} text-white rounded-lg flex items-center justify-center`}>
                        <section.icon size={18} />
                      </div>
                      <h3 className="font-black uppercase tracking-wider text-sm">{section.step}. {section.title}</h3>
                    </div>
                  ) : (
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 border-b border-blue-100 pb-2">{section.step}. {section.title}</h3>
                  )}
                  <textarea 
                    rows={section.key === 'diagnosis' ? 5 : section.key === 'technical_opinion' ? 6 : section.key === 'recommendation' ? 5 : 3}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-700 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none leading-relaxed"
                    value={(reportData as any)[section.key] !== undefined ? (reportData as any)[section.key] : (reportData.json_data as any)[section.key]}
                    onChange={e => {
                      if (['diagnosis', 'technical_opinion', 'recommendation'].includes(section.key)) {
                        setReportData({...reportData, [section.key]: e.target.value});
                      } else {
                        setReportData({...reportData, json_data: {...reportData.json_data, [section.key]: e.target.value}});
                      }
                    }}
                  />
                </section>
              ))}

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-zinc-900">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                      <Camera size={18} />
                    </div>
                    <h3 className="font-black uppercase tracking-wider text-sm">Registro Fotográfico</h3>
                  </div>
                  <label className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-zinc-800 transition-colors shadow-lg">
                    Adicionar FOTOS
                    <input type="file" accept="image/*" multiple onChange={handleAddCustomPhoto} className="hidden" />
                  </label>
                </div>

                {(request.attachments.length > 0 || (reportData.custom_photos && reportData.custom_photos.length > 0)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {request.attachments.filter(a => a.type === 'image').map((att, i) => (
                      <div key={`req-img-${i}`} className="space-y-3">
                        <div className="aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                          <img 
                            src={att.url} 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "https://picsum.photos/seed/error/800/600";
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold text-center">ANEXO ORIGINAL DO CHAMADO</p>
                      </div>
                    ))}
                    
                    {reportData.custom_photos && reportData.custom_photos.map((photo, i) => (
                      <div key={`custom-img-${i}`} className="space-y-3 group bg-white border border-zinc-100 p-3 rounded-2xl shadow-sm hover:border-zinc-300 transition-all">
                        <div className="aspect-video rounded-xl overflow-hidden bg-zinc-50 flex items-center justify-center relative">
                          <img 
                            src={photo.url} 
                            className="w-full h-full object-contain" 
                          />
                          <button onClick={() => removeCustomPhoto(i)} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eraser size={14} />
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Digite a descrição da foto..."
                          className="w-full px-4 py-2 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-all"
                          value={photo.description}
                          onChange={(e) => updateCustomPhotoDesc(i, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="pt-12 border-t border-zinc-100 flex flex-col items-center space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Assinatura Digital do Responsável</h3>
                </div>
                
                <div className="relative group w-full flex justify-center" ref={containerRef}>
                  <div className="border-2 border-dashed border-zinc-200 rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-50 group-hover:border-emerald-500/30 transition-colors w-full max-w-[500px]">
                    <SignaturePad 
                      ref={sigCanvas}
                      penColor="#09090b"
                      canvasProps={{
                        width: canvasWidth > 500 ? 500 : canvasWidth,
                        height: 200,
                        className: "signature-canvas cursor-crosshair mx-auto"
                      }}
                    />
                  </div>
                  <button 
                    onClick={clearSignature}
                    className="absolute top-2 right-2 sm:right-auto sm:left-[calc(50%+210px)] p-2 bg-white text-zinc-400 hover:text-red-500 rounded-full shadow-sm border border-zinc-100 transition-colors"
                  >
                    <Eraser size={16} />
                  </button>
                </div>

                <div className="text-center">
                  <p className="font-black text-zinc-900 text-lg">RZV ENGENHARIA</p>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Responsável Técnico Autorizado</p>
                </div>
              </section>

              <footer className="pt-8 text-center border-t border-zinc-50">
                <p className="text-[9px] text-zinc-300 uppercase tracking-[0.3em]">
                  Documento gerado eletronicamente em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")} • RZV Engenharia
                </p>
              </footer>
            </div>
          </div>

          {/* DEDICATED PRINT VIEW (HIDDEN ON SCREEN, VISIBLE ON PRINT OR EXPORT) */}
          <div className={`hidden print:block ${isGeneratingPdf ? '!block' : ''} bg-white text-black p-8 sm:p-12 font-sans w-full max-w-[210mm] mx-auto`}>
            {/* Clean White/Black layout */}
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8 mt-4 break-inside-avoid">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border-2 border-black flex items-center justify-center font-black text-2xl tracking-tighter bg-white text-black">
                  RZV
                </div>
                <div>
                  <h1 className="text-3xl font-black uppercase text-black tracking-tighter leading-none">RZV Engenharia</h1>
                  <h2 className="text-lg font-bold text-zinc-700 mt-1 uppercase">Laudo Técnico de Inspeção</h2>
                </div>
              </div>
              <div className="text-right text-[10px] text-black uppercase font-bold tracking-widest">
                <p className="text-sm mb-1 font-black">Laudo Nº {id?.padStart(4, '0')}</p>
                <p>{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                <p className="mt-1 lowercase text-zinc-600 font-normal tracking-normal">rzvengenharia@gmail.com</p>
              </div>
            </div>

            <div className="space-y-8 text-sm leading-relaxed text-black">
              <section className="grid grid-cols-2 gap-4 border border-black p-6 break-inside-avoid">
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-300 pb-1 mb-1">Contratante / Cliente</p>
                  <p className="font-bold text-black text-base">{request.company_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-300 pb-1 mb-1">Local da Inspeção</p>
                  <p className="font-bold text-black">{request.address}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-300 pb-1 mb-1">Data da Vistoria</p>
                  <p className="font-bold text-black">{reportData.visit_date.split('-').reverse().join('/')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-300 pb-1 mb-1">Responsável Técnico</p>
                  <p className="font-bold text-black">RZV Engenharia - CREA/ES ES-044985/D</p>
                </div>
              </section>

              {[
                { title: "02. Objetivo", content: reportData.json_data.objective },
                { title: "03. Documentos Analisados", content: reportData.json_data.documents },
                { title: "04. Metodologia", content: reportData.json_data.methodology },
                { title: "05. Normas Técnicas Aplicáveis", content: reportData.json_data.standards },
                { title: "06. Descrição dos Materiais Inspecionados", content: reportData.json_data.materials_description },
                { title: "07. Análise Técnica e Patologias Identificadas", content: reportData.diagnosis },
                { title: "08. Parecer Técnico", content: reportData.technical_opinion },
                { title: "09. Avaliação de Conformidade", content: reportData.json_data.conformity },
                { title: "10. Conclusão", content: reportData.json_data.conclusion },
                { title: "11. Recomendações", content: reportData.recommendation },
              ].map((section, idx) => (
                <section key={idx} className="space-y-2 break-inside-avoid">
                  <h3 className="font-black uppercase text-black border-b border-black pb-1 bg-zinc-100 px-2 py-1">{section.title}</h3>
                  <p className="whitespace-pre-wrap text-black px-2 mt-2">{section.content}</p>
                </section>
              ))}

              {(request.attachments.length > 0 || (reportData.custom_photos && reportData.custom_photos.length > 0)) && (
                <section className="space-y-4 break-before-page">
                  <h3 className="font-black uppercase text-black border-b border-black pb-1 bg-zinc-100 px-2 py-1">Registro Fotográfico</h3>
                  <div className="grid grid-cols-2 gap-6 p-2">
                    {request.attachments.filter(a => a.type === 'image').map((att, i) => (
                      <div key={`print-req-img-${i}`} className="space-y-2 break-inside-avoid">
                        <img 
                          src={att.url} 
                          className="w-full h-48 object-contain border border-black p-1" 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                        <p className="text-[10px] text-black uppercase font-bold text-center">Figura: Anexo Original</p>
                      </div>
                    ))}

                    {reportData.custom_photos && reportData.custom_photos.map((photo, i) => (
                      <div key={`print-custom-img-${i}`} className="space-y-2 break-inside-avoid">
                        <img 
                          src={photo.url} 
                          className="w-full h-48 object-contain border border-black p-1" 
                        />
                        <p className="text-[10px] text-black uppercase font-bold text-center">{photo.description || 'Imagem sem descrição'}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="pt-16 mt-16 flex flex-col items-center space-y-4 break-inside-avoid">
                {signatureImage && (
                  <img src={signatureImage} className="h-24 object-contain" />
                )}
                {!signatureImage && <div className="h-24 w-64"></div>}
                
                <div className="text-center w-80 border-t border-black pt-2">
                  <p className="font-black text-black text-lg">RZV ENGENHARIA</p>
                  <p className="text-xs text-black uppercase tracking-widest mt-1">Responsável Técnico Autorizado</p>
                </div>
              </section>

              <footer className="pt-12 text-center text-black">
                <p className="text-[10px] uppercase tracking-[0.3em] border-t border-zinc-200 pt-4">
                  Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")} • RZV Engenharia
                </p>
              </footer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
