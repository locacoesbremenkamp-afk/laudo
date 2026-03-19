import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BarChart3, PlusCircle, Menu, X, ChevronRight, LogOut, ShieldCheck, Copy, Check, Wallet, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

// Pages
import Dashboard from "./pages/Dashboard";
import PublicRequestForm from "./pages/PublicRequestForm";
import RequestDetail from "./pages/RequestDetail";
import Analytics from "./pages/Analytics";
import ReportEditor from "./pages/ReportEditor";
import AgreementTerm from "./pages/AgreementTerm";
import LandingPage from "./pages/LandingPage";
import Finance from "./pages/Finance";
import DatabasePage from "./pages/Database";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Supabase não configurado. Verifique as variáveis de ambiente.");
      return;
    }

    setAuthLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Erro ao entrar. Verifique suas credenciais.");
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-zinc-200"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Acesso Restrito</h2>
            <p className="text-zinc-500 mt-2">Entre com seu e-mail para continuar</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <p className="font-bold mb-1">Configuração Pendente</p>
              <p>As credenciais do Supabase não foram encontradas. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs mt-2 ml-1 bg-red-50 p-2 rounded-lg border border-red-100"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={authLoading || !isSupabaseConfigured}
              className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Entrar no Sistema"}
            </button>
            <Link 
              to="/" 
              className="block text-center text-zinc-400 hover:text-zinc-600 text-sm transition-colors"
            >
              Voltar para o Início
            </Link>
          </form>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Financeiro", path: "/finance", icon: Wallet },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Banco de Dados", path: "/database", icon: Database },
  ];

  // Don't show sidebar on public request form or landing page
  if (location.pathname === "/request" || location.pathname === "/") return null;

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
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "bg-zinc-950 text-zinc-400 border-r border-zinc-800 transition-all duration-300 flex flex-col h-screen fixed md:sticky top-0 z-50 print:hidden",
        isOpen ? "w-72 translate-x-0 shadow-2xl" : "w-0 -translate-x-full md:w-20 md:translate-x-0 overflow-hidden"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-800 min-w-[288px] md:min-w-0">
          <span className={cn("font-bold text-white tracking-tighter text-xl transition-all", !isOpen && "md:opacity-0 md:scale-0")}>
            RZV <span className="text-blue-500">ENG</span>
          </span>
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors hidden md:block text-zinc-500 hover:text-white">
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors md:hidden text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {isOpen && (
          <div className="px-6 py-2 flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", isSupabaseConfigured ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-600")} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Supabase {isSupabaseConfigured ? "Conectado" : "Pendente"}
            </span>
          </div>
        )}
        
        <nav className="flex-1 p-4 space-y-2 min-w-[288px] md:min-w-0">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 768 && setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl transition-all group relative",
                location.pathname === item.path 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "hover:bg-zinc-900 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(
                location.pathname === item.path ? "text-white" : "group-hover:text-white"
              )} />
              <span className={cn("font-semibold transition-all duration-300", !isOpen && "md:opacity-0 md:translate-x-4")}>
                {item.name}
              </span>
              {location.pathname === item.path && !isOpen && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-blue-600 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800 min-w-[288px] md:min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <Link 
              to="/request" 
              className={cn(
                "flex-1 flex items-center gap-3 p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-all border border-zinc-800 hover:border-zinc-700",
                !isOpen && "md:justify-center"
              )}
            >
              <PlusCircle size={20} />
              <span className={cn("text-xs font-bold uppercase tracking-wider transition-all", !isOpen && "md:hidden")}>Link de Chamado</span>
            </Link>
            {isOpen && (
              <button 
                onClick={copyRequestLink}
                className={cn(
                  "p-3 rounded-xl transition-all border",
                  copied ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-zinc-500 hover:text-white hover:bg-zinc-800 border-zinc-800"
                )}
                title="Copiar Link"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            )}
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all w-full text-zinc-500 hover:bg-red-500/10 hover:text-red-500 group border border-transparent hover:border-red-500/20",
              !isOpen && "md:justify-center"
            )}
          >
            <LogOut size={20} className="group-hover:text-red-500" />
            <span className={cn("font-bold text-xs uppercase tracking-wider transition-all", !isOpen && "md:hidden")}>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <BrowserRouter>
      <AppContent isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
    </BrowserRouter>
  );
}

function AppContent({ isSidebarOpen, setIsSidebarOpen }: { isSidebarOpen: boolean, setIsSidebarOpen: (v: boolean) => void }) {
  const location = useLocation();
  const isPublicRoute = location.pathname === "/request" || location.pathname === "/";

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans selection:bg-blue-100 selection:text-blue-900 print:block print:min-h-0 print:bg-white">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 overflow-auto relative print:overflow-visible print:h-auto">
        {/* Mobile Header */}
        {!isPublicRoute && (
          <div className="md:hidden bg-white border-b border-zinc-200 p-4 flex items-center justify-between sticky top-0 z-30 print:hidden">
            <span className="font-bold text-zinc-900 tracking-tighter text-lg">RZV <span className="text-blue-500">ENG</span></span>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
          </div>
        )}
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/request" element={<PublicRequestForm />} />
          <Route path="/request/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
          <Route path="/report/:id" element={<ProtectedRoute><ReportEditor /></ProtectedRoute>} />
          <Route path="/agreement/:id" element={<ProtectedRoute><AgreementTerm /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
          <Route path="/database" element={<ProtectedRoute><DatabasePage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
