import { useState } from "react";
import { Send, MapPin, Camera, CheckCircle2, Loader2, X as XIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function PublicRequestForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    company_name: "",
    responsible_name: "",
    phone: "",
    role: "",
    address: "",
    lat: null as number | null,
    lng: null as number | null,
    claimant_name: "",
    claimant_phone: "",
    budget_number: "",
    description: "",
    urgency: "Média",
    suggested_date: "",
    attachments: [] as { url: string; type: string }[]
  });

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }));
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const uploadedAttachments: { url: string; type: string }[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      try {
        const base64Data = await base64Promise;
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64Data, fileName })
        });
        
        if (res.ok) {
          const data = await res.json();
          uploadedAttachments.push({
            url: data.url,
            type: file.type.startsWith('video') ? 'video' : 'image'
          });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    return uploadedAttachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Upload files first
      const uploadedAttachments = await uploadFiles();
      
      // 2. Send data to server
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          attachments: uploadedAttachments
        })
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao enviar solicitação.");
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Ocorreu um erro inesperado ao enviar sua solicitação. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl shadow-zinc-200/50 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900">Solicitação Recebida!</h2>
            <p className="text-zinc-500 text-sm">
              A <strong>RZV Engenharia</strong> agradece seu contato. Nossa equipe técnica analisará sua solicitação e entrará em contato em breve para realizar o agendamento da visita.
            </p>
          </div>
          <div className="pt-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
            >
              Fazer outra solicitação
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8 text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Solicitação de Visita Técnica</h1>
          <p className="text-zinc-500 text-sm sm:text-base">RZV Engenharia - Soluções em Engenharia</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-zinc-200/50 overflow-hidden border border-zinc-100">
          {/* Progress Bar */}
          <div className="h-1.5 bg-zinc-100 w-full flex">
            <div 
              className="h-full bg-blue-600 transition-all duration-500" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <div className="p-6 sm:p-10">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-900 flex items-center gap-2">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 bg-zinc-900 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs">1</span>
                      Dados do Solicitante
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Unidade / Empresa</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, company_name: "Casa do Serralheiro"})}
                            className={cn(
                              "py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                              formData.company_name === "Casa do Serralheiro" 
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                                : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                            )}
                          >
                            C. Serralheiro
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, company_name: "Casa da Serralheira"})}
                            className={cn(
                              "py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                              formData.company_name === "Casa da Serralheira" 
                                ? "bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-200" 
                                : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                            )}
                          >
                            C. Serralheira
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, company_name: ""})}
                            className={cn(
                              "py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                              formData.company_name !== "Casa do Serralheiro" && formData.company_name !== "Casa da Serralheira"
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-200" 
                                : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                            )}
                          >
                            Outro
                          </button>
                        </div>
                        {(formData.company_name !== "Casa do Serralheiro" && formData.company_name !== "Casa da Serralheira") && (
                          <input 
                            required
                            type="text" 
                            placeholder="Nome da Empresa / Unidade"
                            className="w-full mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                            value={formData.company_name}
                            onChange={e => setFormData({...formData, company_name: e.target.value})}
                          />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Responsável</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Seu nome completo"
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                          value={formData.responsible_name}
                          onChange={e => setFormData({...formData, responsible_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Telefone / WhatsApp</label>
                        <input 
                          required
                          type="tel" 
                          placeholder="(00) 00000-0000"
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Função na Empresa</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Gerente de Compras"
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Endereço da Visita</label>
                      <div className="relative">
                        <input 
                          required
                          type="text" 
                          placeholder="Rua, número, bairro, cidade"
                          className="w-full p-3 pl-10 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: e.target.value})}
                        />
                        <MapPin className="absolute left-3 top-3.5 text-zinc-400" size={18} />
                      </div>
                      <button 
                        type="button"
                        onClick={handleLocation}
                        className="text-[10px] sm:text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 mt-1"
                      >
                        <MapPin size={12} /> {formData.lat ? "Localização capturada!" : "Usar minha localização atual"}
                      </button>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button 
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full py-3 sm:py-4 bg-zinc-900 text-white rounded-xl sm:rounded-2xl font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      Próximo Passo
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-900 flex items-center gap-2">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 bg-zinc-900 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs">2</span>
                      Dados Técnicos
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Nome do Reclamante / Contato Local</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Nome de quem acompanhará a visita"
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                          value={formData.claimant_name}
                          onChange={e => setFormData({...formData, claimant_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Telefone do Reclamante</label>
                        <input 
                          required
                          type="tel" 
                          placeholder="(00) 00000-0000"
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                          value={formData.claimant_phone}
                          onChange={e => setFormData({...formData, claimant_phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Nº Pré-venda / Orçamento</label>
                        <input 
                          type="text" 
                          placeholder="000000"
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                          value={formData.budget_number}
                          onChange={e => setFormData({...formData, budget_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Grau de Urgência</label>
                        <select 
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none text-sm"
                          value={formData.urgency}
                          onChange={e => setFormData({...formData, urgency: e.target.value})}
                        >
                          <option>Baixa</option>
                          <option>Média</option>
                          <option>Alta</option>
                          <option>Crítica</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Data Sugerida</label>
                        <input 
                          type="date" 
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                          value={formData.suggested_date}
                          onChange={e => setFormData({...formData, suggested_date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">Descrição do Problema</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Descreva detalhadamente o ocorrido..."
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 sm:py-4 bg-zinc-100 text-zinc-600 rounded-xl sm:rounded-2xl font-semibold hover:bg-zinc-200 transition-all text-sm sm:text-base"
                    >
                      Voltar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-[2] py-3 sm:py-4 bg-zinc-900 text-white rounded-xl sm:rounded-2xl font-semibold hover:bg-zinc-800 transition-all text-sm sm:text-base"
                    >
                      Próximo Passo
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-900 flex items-center gap-2">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 bg-zinc-900 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs">3</span>
                      Anexos (Fotos/Vídeos)
                    </h2>
                    <div className="border-2 border-dashed border-zinc-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-4 hover:border-blue-500/50 transition-colors group">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-50 text-zinc-400 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <Camera size={28} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-900 text-sm sm:text-base">Clique para anexar arquivos</p>
                        <p className="text-[10px] sm:text-xs text-zinc-400">Fotos da pré-venda, produto ou local</p>
                      </div>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*,video/*"
                        className="hidden" 
                        id="file-upload"
                        onChange={handleFileChange}
                      />
                      <label 
                        htmlFor="file-upload"
                        className="inline-block px-6 py-2 bg-zinc-900 text-white text-xs sm:text-sm rounded-full cursor-pointer hover:bg-zinc-800 transition-colors"
                      >
                        Selecionar Arquivos
                      </label>
                    </div>

                    {files.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {files.map((file, i) => (
                          <div key={i} className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 relative group">
                            {file.type.startsWith('image') ? (
                              <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white text-[10px]">VIDEO</div>
                            )}
                            <button 
                              type="button"
                              onClick={() => removeFile(i)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XIcon size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 py-3 sm:py-4 bg-zinc-100 text-zinc-600 rounded-xl sm:rounded-2xl font-semibold hover:bg-zinc-200 transition-all text-sm sm:text-base"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-3 sm:py-4 bg-blue-700 text-white rounded-xl sm:rounded-2xl font-semibold hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                      Enviar Solicitação
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
