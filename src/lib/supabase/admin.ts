import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service_role key: bypassa RLS por completo. Nunca se
 * expone al navegador (SUPABASE_SERVICE_ROLE_KEY no tiene el prefijo
 * NEXT_PUBLIC_, así que Next.js jamás la incluye en el bundle del
 * cliente). Usar solo en Server Actions que ya verificaron el rol del
 * usuario que llama, y solo para lo que estrictamente necesita
 * privilegios de administrador (alta de cuentas de Supabase Auth).
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
