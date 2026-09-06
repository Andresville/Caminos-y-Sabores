import { createClient } from "@/lib/supabase/server";

export interface PerfilUsuarioActual {
  nombreCompleto: string;
  rol: string;
}

interface FilaPerfil {
  nombre_completo: string;
  rol: { nombre_rol: string } | null;
}

/** Helper de servidor: perfil (nombre + rol) del usuario logueado, o null si no hay sesión. */
export async function obtenerUsuarioActual(): Promise<PerfilUsuarioActual | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return null;
  }

  const { data: perfil } = await supabase
    .from("usuario")
    .select("nombre_completo, rol:id_rol(nombre_rol)")
    .eq("id_usuario", userData.user.id)
    .single<FilaPerfil>();

  return {
    nombreCompleto: perfil?.nombre_completo ?? userData.user.email ?? "",
    rol: perfil?.rol?.nombre_rol ?? "",
  };
}
