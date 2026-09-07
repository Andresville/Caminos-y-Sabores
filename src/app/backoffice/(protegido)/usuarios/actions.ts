"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";

export interface EstadoFormulario {
  error?: string;
}

/**
 * Alta directa de un usuario: crea la cuenta de Supabase Auth con la
 * contraseña que fija el Administrador (sin mandar mail de invitación,
 * confirmada de una) y la fila de negocio en public.usuario.
 */
export async function crearUsuario(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuarioActual = await obtenerUsuarioActual();
  if (usuarioActual?.rol !== "Administrador") {
    return { error: "No tenés permiso para crear usuarios." };
  }

  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const idRol = Number(formData.get("id_rol"));

  if (!nombreCompleto) return { error: "Ingresá el nombre completo." };
  if (!email) return { error: "Ingresá el email." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (!idRol) return { error: "Elegí un rol." };

  const admin = createAdminClient();

  const { data: nuevoUsuarioAuth, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (errorAuth || !nuevoUsuarioAuth.user) {
    return { error: errorAuth?.message ?? "No se pudo crear la cuenta." };
  }

  const supabase = await createClient();
  const { error: errorPerfil } = await supabase.from("usuario").insert({
    id_usuario: nuevoUsuarioAuth.user.id,
    nombre_completo: nombreCompleto,
    email,
    id_rol: idRol,
    estado: true,
  });

  if (errorPerfil) {
    // Sin la fila de negocio, la cuenta de Auth queda huérfana: se
    // revierte para no dejar un usuario a medio crear.
    await admin.auth.admin.deleteUser(nuevoUsuarioAuth.user.id);
    return { error: errorPerfil.message };
  }

  revalidatePath("/backoffice/usuarios");
  return {};
}

export async function actualizarUsuario(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const idUsuario = String(formData.get("id_usuario") ?? "");
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const idRol = Number(formData.get("id_rol"));
  const estado = formData.get("estado") === "true";

  if (!nombreCompleto) return { error: "Ingresá el nombre completo." };
  if (!idRol) return { error: "Elegí un rol." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuario")
    .update({ nombre_completo: nombreCompleto, id_rol: idRol, estado })
    .eq("id_usuario", idUsuario);

  if (error) return { error: error.message };

  revalidatePath("/backoffice/usuarios");
  return {};
}
