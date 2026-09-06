"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EstadoFormulario {
  error?: string;
}

export async function crearMenu(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const nombreMenu = String(formData.get("nombre_menu") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const paxMinimo = Number(formData.get("pax_minimo"));

  if (!nombreMenu) return { error: "Ingresá el nombre del menú." };
  if (!Number.isFinite(paxMinimo) || paxMinimo <= 0) {
    return { error: "El pax mínimo debe ser mayor a cero." };
  }

  const supabase = await createClient();

  const { data: coeficienteDefecto, error: errorParametro } = await supabase.rpc(
    "obtener_coeficiente_venta_defecto",
  );

  if (errorParametro || typeof coeficienteDefecto !== "number") {
    return { error: "No se pudo leer el coeficiente de venta por defecto." };
  }

  const { data, error } = await supabase
    .from("menu")
    .insert({
      nombre_menu: nombreMenu,
      descripcion: descripcion || null,
      pax_minimo: paxMinimo,
      coeficiente_venta: coeficienteDefecto,
      estado: false,
    })
    .select("id_menu")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se pudo crear el menú." };
  }

  revalidatePath("/backoffice/menus");
  redirect(`/backoffice/menus/${data.id_menu}`);
}

export interface LineaMenuEntrada {
  id_receta: number;
  tipo_plato: string;
  porciones_por_pax: number;
}

export async function guardarComposicionMenu(datos: {
  idMenu: number;
  nombreMenu: string;
  descripcion: string;
  paxMinimo: number;
  estado: boolean;
  lineas: LineaMenuEntrada[];
}): Promise<EstadoFormulario> {
  if (!datos.nombreMenu.trim()) return { error: "Ingresá el nombre del menú." };
  if (!Number.isFinite(datos.paxMinimo) || datos.paxMinimo <= 0) {
    return { error: "El pax mínimo debe ser mayor a cero." };
  }

  const supabase = await createClient();

  const lineasJson = datos.lineas.map((linea) => ({
    id_receta: linea.id_receta,
    tipo_plato: linea.tipo_plato,
    porciones_por_pax: linea.porciones_por_pax,
  }));

  const { error } = await supabase.rpc("guardar_composicion_menu", {
    p_id_menu: datos.idMenu,
    p_nombre_menu: datos.nombreMenu,
    p_descripcion: datos.descripcion || null,
    p_pax_minimo: datos.paxMinimo,
    p_estado: datos.estado,
    p_lineas: lineasJson,
  });

  if (error) return { error: error.message };

  revalidatePath("/backoffice/menus");
  revalidatePath(`/backoffice/menus/${datos.idMenu}`);
  return {};
}

export async function actualizarCoeficienteMenu(
  idMenu: number,
  coeficienteVenta: number,
): Promise<EstadoFormulario> {
  if (!Number.isFinite(coeficienteVenta) || coeficienteVenta < 1) {
    return { error: "El coeficiente de venta debe ser mayor o igual a 1." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu")
    .update({ coeficiente_venta: coeficienteVenta })
    .eq("id_menu", idMenu);

  if (error) return { error: error.message };

  revalidatePath("/backoffice/menus");
  revalidatePath(`/backoffice/menus/${idMenu}`);
  return {};
}
