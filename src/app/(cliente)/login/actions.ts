"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirigirSeguro } from "@/lib/cliente-portal/redirigirSeguro";

export interface EstadoAuth {
  error?: string;
  mensaje?: string;
}

export async function registrarCliente(_estadoPrevio: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmarPassword = String(formData.get("confirmar_password") ?? "");
  const aceptaTerminos = formData.get("acepta_terminos") === "true";
  const destino = redirigirSeguro(formData.get("redirect")?.toString());

  if (!nombreCompleto) return { error: "Ingresá tu nombre y apellido." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Ingresá un email válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirmarPassword) return { error: "Las contraseñas no coinciden." };
  if (!aceptaTerminos) return { error: "Tenés que aceptar los Términos y Condiciones para continuar." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };
  if (!data.user) return { error: "No se pudo crear la cuenta. Volvé a intentar." };

  // Se usa el cliente de administrador solo para guardar el perfil: si el
  // proyecto exige confirmar el email, todavía no hay sesión propia del
  // usuario para que la política de RLS "propio" lo deje insertar.
  const admin = createAdminClient();
  const { error: errorPerfil } = await admin.from("cliente").insert({
    id_cliente: data.user.id,
    nombre_completo: nombreCompleto,
    email,
    telefono: telefono || null,
  });

  if (errorPerfil) {
    return { error: "La cuenta se creó pero no pudimos guardar tus datos. Escribinos para que lo resolvamos." };
  }

  if (!data.session) {
    return { mensaje: "Te enviamos un email para confirmar tu cuenta. Confirmalo y después iniciá sesión." };
  }

  redirect(destino);
}

export async function iniciarSesionCliente(_estadoPrevio: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const destino = redirigirSeguro(formData.get("redirect")?.toString());

  if (!email || !password) return { error: "Ingresá tu email y tu contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Email o contraseña incorrectos." };

  redirect(destino);
}

export async function cerrarSesionCliente(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
