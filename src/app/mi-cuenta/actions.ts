"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EstadoCuenta {
  error?: string;
  exito?: boolean;
}

export async function actualizarDatosCliente(_estadoPrevio: EstadoCuenta, formData: FormData): Promise<EstadoCuenta> {
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!nombreCompleto) return { error: "Ingresá tu nombre y apellido." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Tu sesión expiró. Volvé a iniciar sesión." };

  const { error } = await supabase
    .from("cliente")
    .update({ nombre_completo: nombreCompleto, telefono: telefono || null })
    .eq("id_cliente", userData.user.id);

  if (error) return { error: error.message };

  revalidatePath("/mi-cuenta");
  return { exito: true };
}

export async function actualizarPasswordCliente(_estadoPrevio: EstadoCuenta, formData: FormData): Promise<EstadoCuenta> {
  const nuevaPassword = String(formData.get("nueva_password") ?? "");
  const confirmarPassword = String(formData.get("confirmar_password") ?? "");

  if (nuevaPassword.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (nuevaPassword !== confirmarPassword) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nuevaPassword });

  if (error) return { error: error.message };

  return { exito: true };
}
