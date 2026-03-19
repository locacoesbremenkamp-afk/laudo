import { motion } from "motion/react";
import { 
  ClipboardList, 
  BarChart3, 
  LayoutDashboard, 
  MessageSquare, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Globe,
  Smartphone,
  Cpu
} from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const features = [
    {
      title: "Módulo de Solicitação Público",
      description: "Formulário intuitivo em 3 etapas com geolocalização automática e suporte para anexos multimídia.",
      icon: Globe,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "Dashboard Administrativo",
      description: "Visualização estilo Kanban para organizar o fluxo de trabalho por status e prioridade.",
      icon: LayoutDashboard,
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      title: "Integração com WhatsApp",
      description: "Geração automática de mensagens personalizadas para agilizar o contato com o cliente.",
      icon: MessageSquare,
      color: "text-green-500",
      bg: "bg-green-50"
    },
    {
      title: "Laudo Técnico com IA",
      description: "Assistente Gemini para preenchimento automático de pareceres e recomendações técnicas.",
      icon: Cpu,
      color: "text-purple-500",
      bg: "bg-purple-50"
    },
    {
      title: "Analytics e Resultados",
      description: "Gráficos detalhados de volume mensal, distribuição de status e métricas de produtividade.",
      icon: BarChart3,
      color: "text-orange-500",
      bg: "bg-orange-50"
    },
    {
      title: "Arquitetura Robusta",
      description: "Backend Node.js com SQLite e Frontend React para máxima performance e confiabilidade.",
      icon: ShieldCheck,
      color: "text-zinc-500",
      bg: "bg-zinc-50"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-12 sm:pt-32 sm:pb-16 lg:pt-48 lg:pb-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_50%,#eff6ff_0%,white_100%)]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
              <Zap size={14} />
              Arquitetura Full-Stack Robusta
            </span>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-zinc-900 tracking-tight mb-8">
              Rzv Engenharia <br />
              <span className="text-blue-700">Gestão de Visitas</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-600 mb-10 leading-relaxed">
              A solução definitiva para gestão técnica, desde a solicitação do cliente até a emissão do laudo final com auxílio de Inteligência Artificial.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/request"
                className="w-full sm:w-auto px-10 py-4 bg-blue-700 text-white rounded-2xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
              >
                Abrir Chamado Técnico
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-10 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-2xl font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
              >
                <LayoutDashboard size={20} />
                Acessar Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Principais Funcionalidades</h2>
            <p className="text-zinc-600">Desenvolvido para atender todas as necessidades de gestão técnica</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-zinc-200 hover:border-blue-500/30 transition-all hover:shadow-xl group"
              >
                <div className={`w-12 h-12 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>
                <p className="text-zinc-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-zinc-900 rounded-[3rem] p-8 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full -ml-32 -mb-32" />
            
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 relative z-10">
              Pronto para otimizar sua gestão técnica?
            </h2>
            <p className="text-zinc-400 mb-10 text-lg relative z-10">
              Comece agora mesmo a gerenciar seus chamados de forma profissional e eficiente.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <Link
                to="/request"
                className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
              >
                Acesse o formulário de chamados aqui
              </Link>
            </div>
            <p className="mt-6 text-blue-500/60 text-sm font-mono relative z-10">
              {window.location.origin}/request
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="font-bold text-zinc-900 tracking-tighter text-xl">
            RZV <span className="text-blue-500">ENG</span>
          </span>
          <p className="mt-4 text-zinc-500 text-sm">
            © 2026 Rzv Engenharia – Gestão de Visitas. Todos os direitos reservados.
          </p>
          <Link to="/dashboard" className="mt-4 inline-block text-[10px] text-zinc-300 hover:text-zinc-500 transition-colors uppercase tracking-widest">
            Acesso Administrativo
          </Link>
        </div>
      </footer>
    </div>
  );
}
