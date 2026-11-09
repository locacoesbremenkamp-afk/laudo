import { supabase } from "./supabase";

/**
 * Envia o login (token do Supabase) em todas as chamadas para /api/ do próprio site.
 * As rotas internas recusam pedidos sem login; o formulário público e o quadro
 * de visualização continuam funcionando sem ele.
 */
export function installApiAuth() {
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isOwnApi = url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);
    if (!isOwnApi) return original(input, init);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return original(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    return original(input, { ...init, headers });
  };
}
