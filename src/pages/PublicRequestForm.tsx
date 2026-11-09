import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, MapPin, Camera, CheckCircle2, Loader2, X as XIcon, Download, Share2, Printer, Plus, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import { cn } from "../lib/utils";
import { uploadFile } from "../lib/storage";
import { COMPANIES, UNITS, isKnownCompany } from "../lib/companies";
import { TicketCard, type Ticket } from "../components/TicketCard";

const OTHER = "__outro__";

const inputCls =
  "w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm";
const labelCls = "text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-500";

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}

function Chip({ active, onClick, children, tone = "blue" }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: string }) {
  const activeCls =
    tone === "pink" ? "bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-200"
    : tone === "dark" ? "bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-200"
    : "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "py-2.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all",
        active ? activeCls : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
      )}
    >
      {children}
    </button>
  );
}

export default function PublicRequestForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [stepError, setStepError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [companyChoice, setCompanyChoice] = useState<string>("");
  const [formData, setFormData] = useState({
    company_name: "",
    unit: "",
    responsible_name: "",
    phone: "",
    address: "",
    lat: null as number | null,
    lng: null as number | null,
    claimant_name: "",
    claimant_phone: "",
    budget_number: "",
    description: "",
    urgency: "Média",
    suggested_date: "",
  });
  const set = (patch: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...patch }));

  // Prévias das fotos (liberadas ao trocar a lista para não acumular memória)
  const previews = useMemo(() => files.map((f) => (f.type.startsWith("image") ? URL.createObjectURL(f) : "")), [files]);
  useEffect(() => () => previews.forEach((p) => p && URL.revokeObjectURL(p)), [previews]);

  const chooseCompany = (choice: string) => {
    setCompanyChoice(choice);
    setStepError("");
    if (choice === OTHER) set({ company_name: "", unit: "" });
    else set({ company_name: choice, unit: isKnownCompany(formData.company_name) ? formData.unit : "" });
  };

  const handleLocation = () => {
    navigator.geolocation?.getCurrentPosition((position) =>
      set({ lat: position.coords.latitude, lng: position.coords.longitude })
    );
  };

  const validate = (s: number) => {
    if (s === 1) {
      if (!companyChoice) return "Escolha a empresa.";
      if (companyChoice === OTHER && !formData.company_name.trim()) return "Digite o nome da empresa.";
      if (companyChoice !== OTHER && !formData.unit) return "Escolha a unidade.";
      if (companyChoice === OTHER && !formData.unit.trim()) return "Digite a unidade (cidade ou filial).";
      if (!formData.responsible_name.trim()) return "Informe o nome do responsável.";
      if (!formData.phone.trim()) return "Informe o telefone do responsável.";
    }
    if (s === 2) {
      if (!formData.claimant_name.trim()) return "Informe o nome do reclamante.";
      if (!formData.claimant_phone.trim()) return "Informe o telefone do reclamante.";
      if (!formData.description.trim()) return "Descreva o problema.";
    }
    return "";
  };

  const goTo = (next: number) => {
    if (next > step) {
      const err = validate(step);
      if (err) return setStepError(err);
    }
    setStepError("");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadFiles = async () => {
    const uploaded: { url: string; type: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Enviando arquivo ${i + 1} de ${files.length}...`);
      try {
        const res = await uploadFile(file, "uploads");
        uploaded.push({ url: res.url, type: res.type });
      } catch (error: any) {
        console.error("Error uploading file:", error);
        // Interrompe para não salvar a solicitação sem as fotos.
        throw new Error(`Não foi possível enviar "${file.name}".\n${error?.message || ""}`);
      }
    }
    setUploadProgress("");
    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(1) || validate(2);
    if (err) {
      setStepError(err);
      setStep(validate(1) ? 1 : 2);
      return;
    }
    setLoading(true);
    try {
      const attachments = await uploadFiles();
      setUploadProgress("Registrando chamado...");
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, attachments }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao enviar solicitação.");
      setTicket({
        ...formData,
        id: data.id,
        created_at: new Date().toISOString(),
        attachmentCount: files.length,
        thumbs: previews.filter(Boolean),
      });
      window.scrollTo({ top: 0 });
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Ocorreu um erro inesperado ao enviar sua solicitação. Por favor, tente novamente.");
    } finally {
      setUploadProgress("");
      setLoading(false);
    }
  };

  if (ticket) return <TicketScreen ticket={ticket} />;

  const showUnits = companyChoice && companyChoice !== OTHER;

  return (
    <div className="min-h-screen bg-zinc-50 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8 text-center space-y-2">
          <p className="text-[11px] font-bold tracking-[0.2em] text-blue-700">RZV ENGENHARIA</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Solicitação de Visita Técnica</h1>
          <p className="text-zinc-500 text-sm sm:text-base">Preencha os dados abaixo. Ao final você recebe o card do chamado para enviar pelo WhatsApp.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-zinc-200/50 overflow-hidden border border-zinc-100">
          <div className="h-1.5 bg-zinc-100 w-full flex">
            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <div className="px-6 sm:px-10 pt-5 flex gap-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            {["Solicitante", "Problema", "Anexos"].map((s, i) => (
              <span key={s} className={cn(step === i + 1 && "text-blue-700")}>{i + 1}. {s}</span>
            ))}
          </div>

          <div className="p-6 sm:p-10 pt-5 sm:pt-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <Field label="Empresa">
                    <div className="grid grid-cols-3 gap-2">
                      {COMPANIES.map((c) => (
                        <Chip key={c.name} tone={c.color} active={companyChoice === c.name} onClick={() => chooseCompany(c.name)}>
                          {c.short}
                        </Chip>
                      ))}
                      <Chip tone="dark" active={companyChoice === OTHER} onClick={() => chooseCompany(OTHER)}>Outra</Chip>
                    </div>
                  </Field>

                  {showUnits && (
                    <Field label="Unidade">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {UNITS.map((u) => (
                          <Chip key={u} active={formData.unit === u} onClick={() => { set({ unit: u }); setStepError(""); }}>{u}</Chip>
                        ))}
                      </div>
                    </Field>
                  )}

                  {companyChoice === OTHER && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Nome da empresa">
                        <input type="text" className={inputCls} placeholder="Ex: Santiago Engenharia" value={formData.company_name} onChange={(e) => set({ company_name: e.target.value })} />
                      </Field>
                      <Field label="Unidade">
                        <input type="text" className={inputCls} placeholder="Cidade ou filial" value={formData.unit} onChange={(e) => set({ unit: e.target.value })} />
                      </Field>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Responsável">
                      <input type="text" className={inputCls} placeholder="Seu nome completo" value={formData.responsible_name} onChange={(e) => set({ responsible_name: e.target.value })} />
                    </Field>
                    <Field label="Telefone / WhatsApp">
                      <input type="tel" className={inputCls} placeholder="(27) 99999-9999" value={formData.phone} onChange={(e) => set({ phone: e.target.value })} />
                    </Field>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nome do reclamante">
                      <input type="text" className={inputCls} placeholder="Cliente que fez a reclamação" value={formData.claimant_name} onChange={(e) => set({ claimant_name: e.target.value })} />
                    </Field>
                    <Field label="Contato / Telefone">
                      <input type="tel" className={inputCls} placeholder="(27) 99999-9999" value={formData.claimant_phone} onChange={(e) => set({ claimant_phone: e.target.value })} />
                    </Field>
                    <Field label="Nº Pré-venda">
                      <input type="text" className={inputCls} placeholder="Ex: 123456" value={formData.budget_number} onChange={(e) => set({ budget_number: e.target.value })} />
                    </Field>
                    <Field label="Grau de urgência">
                      <select className={cn(inputCls, "appearance-none")} value={formData.urgency} onChange={(e) => set({ urgency: e.target.value })}>
                        <option>Baixa</option>
                        <option>Média</option>
                        <option>Alta</option>
                        <option>Crítica</option>
                      </select>
                    </Field>
                    <Field label="Data sugerida da visita">
                      <input type="date" className={inputCls} value={formData.suggested_date} onChange={(e) => set({ suggested_date: e.target.value })} />
                    </Field>
                    <Field label="Endereço da visita (opcional)">
                      <div className="relative">
                        <input type="text" className={cn(inputCls, "pl-10")} placeholder="Rua, número, bairro, cidade" value={formData.address} onChange={(e) => set({ address: e.target.value })} />
                        <MapPin className="absolute left-3 top-3.5 text-zinc-400" size={18} />
                      </div>
                      <button type="button" onClick={handleLocation} className="text-[11px] text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {formData.lat ? "Localização capturada!" : "Usar minha localização atual"}
                      </button>
                    </Field>
                  </div>
                  <Field label="Descrição do problema">
                    <textarea rows={5} className={cn(inputCls, "resize-none")} placeholder="Descreva o que aconteceu: produto, local, quando começou..." value={formData.description} onChange={(e) => set({ description: e.target.value })} />
                  </Field>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <label htmlFor="file-upload" className="block border-2 border-dashed border-zinc-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-3 hover:border-blue-500/50 transition-colors group cursor-pointer">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-50 text-zinc-400 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Camera size={28} />
                    </div>
                    <p className="font-medium text-zinc-900 text-sm sm:text-base">Anexar fotos e arquivos</p>
                    <ul className="text-xs text-zinc-500 space-y-0.5">
                      <li>Foto ou PDF da pré-venda</li>
                      <li>Dados relevantes (nota, pedido, medidas)</li>
                      <li>Fotos do problema, de perto e de longe</li>
                    </ul>
                    <span className="inline-block px-6 py-2 bg-zinc-900 text-white text-xs sm:text-sm rounded-full group-hover:bg-zinc-800 transition-colors">
                      Selecionar arquivos
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => { const sel = e.target.files; if (sel) setFiles((prev) => [...prev, ...Array.from(sel)]); e.target.value = ""; }}
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {files.map((file, i) => (
                        <div key={i} className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 relative group">
                          {previews[i] ? (
                            <img src={previews[i]} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-zinc-900 text-white text-[10px] p-2 text-center">
                              <span className="font-bold">{file.type.startsWith("video") ? "VÍDEO" : file.type === "application/pdf" ? "PDF" : "ARQUIVO"}</span>
                              <span className="opacity-70 line-clamp-2 break-all">{file.name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                            aria-label={`Remover ${file.name}`}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full shadow sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <XIcon size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {stepError && (
              <p role="alert" className="mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{stepError}</p>
            )}

            <div className="flex gap-3 pt-6">
              {step > 1 && (
                <button type="button" onClick={() => goTo(step - 1)} className="flex-1 py-3 sm:py-4 bg-zinc-100 text-zinc-600 rounded-xl sm:rounded-2xl font-semibold hover:bg-zinc-200 transition-all text-sm sm:text-base">
                  Voltar
                </button>
              )}
              {step < 3 ? (
                <button type="button" onClick={() => goTo(step + 1)} className="flex-[2] py-3 sm:py-4 bg-zinc-900 text-white rounded-xl sm:rounded-2xl font-semibold hover:bg-zinc-800 transition-all text-sm sm:text-base">
                  Próximo passo
                </button>
              ) : (
                <button type="submit" disabled={loading} className="flex-[2] py-3 sm:py-4 bg-blue-700 text-white rounded-xl sm:rounded-2xl font-semibold hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base">
                  {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                  {uploadProgress || (loading ? "Enviando..." : "Enviar solicitação")}
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
            <Lock size={12} /> Área da RZV Engenharia
          </Link>
        </div>
      </div>
    </div>
  );
}

function TicketScreen({ ticket }: { ticket: Ticket }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"" | "download" | "share">("");
  const fileName = `chamado-${ticket.id}.png`;

  const render = async () => {
    if (!cardRef.current) throw new Error("Card não encontrado");
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
    return dataUrl;
  };

  const download = async () => {
    setBusy("download");
    try {
      const dataUrl = await render();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert("Não foi possível gerar a imagem. Tire um print da tela como alternativa.");
    } finally {
      setBusy("");
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      const dataUrl = await render();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const text = `Chamado Técnico #${ticket.id} — RZV Engenharia`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: text, text });
      } else {
        // Computador: baixa a imagem e abre o WhatsApp Web com o texto do chamado.
        await download();
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\nO card do chamado foi baixado; anexe a imagem nesta conversa.`)}`, "_blank");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        alert("Não foi possível compartilhar. Use o botão Baixar card.");
      }
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 py-6 sm:py-10 px-4 print:bg-white print:p-0">
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center space-y-2 print:hidden">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={30} />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Chamado #{ticket.id} aberto</h2>
          <p className="text-zinc-500 text-sm">Baixe o card abaixo e envie para a RZV Engenharia pelo WhatsApp.</p>
        </div>

        <div className="flex justify-center overflow-x-auto pb-1">
          <TicketCard ref={cardRef} t={ticket} />
        </div>

        <div className="grid grid-cols-2 gap-2 print:hidden">
          <button onClick={share} disabled={!!busy} className="col-span-2 py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {busy === "share" ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />} Enviar pelo WhatsApp
          </button>
          <button onClick={download} disabled={!!busy} className="py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60">
            {busy === "download" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Baixar card
          </button>
          <button onClick={() => window.print()} className="py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-medium hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 text-sm">
            <Printer size={16} /> Imprimir
          </button>
          <button onClick={() => window.location.reload()} className="col-span-2 py-3 text-zinc-500 hover:text-zinc-800 text-sm flex items-center justify-center gap-1.5">
            <Plus size={16} /> Abrir outro chamado
          </button>
        </div>
      </div>
    </div>
  );
}
