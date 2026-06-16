// Credenciais do Supabase — lidas das variáveis de ambiente injetadas pelo Vite
// As variáveis VITE_* são substituídas em tempo de build pelo Vite
// Nunca coloque valores hardcoded aqui — use o .env.local localmente
// e as Environment Variables do Cloudflare em produção
 
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
 
if (!projectId || !publicAnonKey) {
  console.warn(
    '[Mesinha] Variáveis de ambiente do Supabase não encontradas.\n' +
    'Localmente: crie um arquivo .env.local com VITE_SUPABASE_PROJECT_ID e VITE_SUPABASE_ANON_KEY\n' +
    'Cloudflare: adicione as variáveis em Settings → Environment Variables'
  );
}
 
