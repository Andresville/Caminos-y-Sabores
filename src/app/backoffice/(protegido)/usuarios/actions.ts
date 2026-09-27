"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";

export interface EstadoFormulario {
  error?: string;
}

/**
 * Borrado real de una cuenta (no reversible): elimina primero la fila
 * de negocio y después la cuenta de Supabase Auth. auditoria.id_usuario
 * queda en null para esa persona (on delete set null), el resto del
 * registro de auditoría se conserva intacto.
 */
export async function eliminarUsuario(idUsuario: string): Promise<EstadoFormulario> {
  const usuarioActual = await obtenerUsuarioActual();
  if (usuarioActual?.rol !== "Administrador") {
    return { error: "No tenés permiso para eliminar usuarios." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user?.id === idUsuario) {
    return { error: "No podés eliminar tu propia cuenta." };
  }

  const { error: errorPerfil } = await supabase.from("usuario").delete().eq("id_usuario", idUsuario);
  if (errorPerfil) return { error: errorPerfil.message };

  const admin = createAdminClient();
  const { error: errorAuth } = await admin.auth.admin.deleteUser(idUsuario);
  if (errorAuth) return { error: errorAuth.message };

  revalidatePath("/backoffice/usuarios");
  return {};
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
  const estado = formData.get("estado") !== "false";

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
    estado,
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
