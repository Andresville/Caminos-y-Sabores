import { createClient } from "@/lib/supabase/server";

export interface ClienteActual {
  idCliente: string;
  nombreCompleto: string;
  email: string;
  telefono: string | null;
}

/** Identidad del cliente logueado (portal público), o null si no hay sesión. Independiente de obtenerUsuarioActual() (staff) — son dos sistemas de cuentas separados. */
export async function obtenerClienteActual(): Promise<ClienteActual | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: cliente } = await supabase
    .from("cliente")
    .select("id_cliente, nombre_completo, email, telefono")
    .eq("id_cliente", userData.user.id)
    .single();

  if (!cliente) return null;

  return {
    idCliente: cliente.id_cliente,
    nombreCompleto: cliente.nombre_completo,
    email: cliente.email,
    telefono: cliente.telefono,
  };
}
