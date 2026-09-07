import { createClient } from "@/lib/supabase/server";

export interface PerfilUsuarioActual {
  nombreCompleto: string;
  rol: string;
}

/**
 * Helper de servidor: perfil (nombre + rol) del usuario logueado, o
 * null si no hay sesión válida. Usa rol_actual() (no un join directo a
 * la tabla rol) a propósito: esa función ya excluye usuarios inactivos
 * y bloqueados, así que si devuelve null acá tratamos toda la sesión
 * como inválida. Un join directo a "usuario" no alcanza para esto,
 * porque la política RLS que te deja ver tu propia fila no filtra por
 * estado.
 */
export async function obtenerUsuarioActual(): Promise<PerfilUsuarioActual | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return null;
  }

  const { data: rolActual } = await supabase.rpc("rol_actual");

  if (!rolActual) {
    return null;
  }

  const { data: perfil } = await supabase
    .from("usuario")
    .select("nombre_completo")
    .eq("id_usuario", userData.user.id)
    .single<{ nombre_completo: string }>();

  return {
    nombreCompleto: perfil?.nombre_completo ?? userData.user.email ?? "",
    rol: rolActual,
  };
}
