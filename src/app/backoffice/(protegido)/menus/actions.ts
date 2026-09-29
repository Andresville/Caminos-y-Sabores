"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EstadoFormulario {
  error?: string;
}

function mensajeAmigable(codigo: string | undefined, mensajeOriginal: string): string {
  if (codigo === "22001") {
    return "El nombre del menú es demasiado largo (máximo 100 caracteres).";
  }
  return mensajeOriginal;
}

export interface LineaMenuEntrada {
  id_receta: number;
  tipo_plato: string;
}

/**
 * Alta o edición de un menú completo (encabezado + recetas incluidas)
 * en un solo paso, vía guardar_composicion_menu() — que crea el menú
 * cuando no recibe un id existente y valida ahí mismo que la cantidad
 * mínima de personas del menú no sea menor a la de ninguna receta
 * incluida.
 */
export async function guardarMenu(datos: {
  idMenu: number | null;
  nombreMenu: string;
  descripcion: string;
  paxMinimo: number;
  imagenChicaUrl: string | null;
  imagenBannerUrl: string | null;
  estado: boolean;
  lineas: LineaMenuEntrada[];
}): Promise<EstadoFormulario> {
  if (!datos.nombreMenu.trim()) return { error: "Ingresá el nombre del menú." };
  if (!Number.isFinite(datos.paxMinimo) || datos.paxMinimo <= 0) {
    return { error: "La cantidad mínima de personas debe ser mayor a cero." };
  }
  if (datos.estado && datos.lineas.length === 0) {
    return { error: "No se puede activar un menú sin recetas incluidas." };
  }
  if (datos.estado && (!datos.imagenChicaUrl || !datos.imagenBannerUrl)) {
    return { error: "No se puede activar un menú sin sus dos fotos cargadas." };
  }

  const supabase = await createClient();

  const lineasJson = datos.lineas.map((linea) => ({
    id_receta: linea.id_receta,
    tipo_plato: linea.tipo_plato,
  }));

  const { data: resultado, error } = await supabase.rpc("guardar_composicion_menu", {
    p_id_menu: datos.idMenu,
    p_nombre_menu: datos.nombreMenu,
    p_descripcion: datos.descripcion.trim() || null,
    p_pax_minimo: datos.paxMinimo,
    p_imagen_chica_url: datos.imagenChicaUrl,
    p_imagen_banner_url: datos.imagenBannerUrl,
    p_estado: datos.estado,
    p_lineas: lineasJson,
  });

  if (error) return { error: mensajeAmigable(error.code, error.message) };

  revalidatePath("/backoffice/menus");

  if (datos.idMenu === null) {
    redirect(`/backoffice/menus/${resultado.id_menu}`);
  }

  revalidatePath(`/backoffice/menus/${datos.idMenu}`);
  return {};
}
