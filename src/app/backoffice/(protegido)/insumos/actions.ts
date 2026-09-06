"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EstadoFormulario {
  error?: string;
}

function mensajeAmigable(codigo: string | undefined, mensajeOriginal: string): string {
  if (codigo === "23505") {
    return "Ya existe un insumo con ese nombre en esa categoría.";
  }
  if (codigo === "23514") {
    return "El costo unitario debe ser mayor a cero.";
  }
  return mensajeOriginal;
}

export async function crearInsumo(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const idCategoria = Number(formData.get("id_categoria"));
  const idUnidadCompra = Number(formData.get("id_unidad_compra"));
  const costoUnitario = Number(formData.get("costo_unitario"));
  const densidadRaw = String(formData.get("densidad_g_ml") ?? "").trim();
  const densidad = densidadRaw ? Number(densidadRaw) : null;

  if (!nombre) {
    return { error: "Ingresá el nombre del insumo." };
  }
  if (!idCategoria) {
    return { error: "Elegí una categoría." };
  }
  if (!idUnidadCompra) {
    return { error: "Elegí la unidad de compra." };
  }
  if (!Number.isFinite(costoUnitario) || costoUnitario <= 0) {
    return { error: "El costo unitario debe ser mayor a cero." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("materia_prima").insert({
    nombre,
    id_categoria: idCategoria,
    id_unidad_compra: idUnidadCompra,
    costo_unitario: costoUnitario,
    densidad_g_ml: densidad,
  });

  if (error) {
    return { error: mensajeAmigable(error.code, error.message) };
  }

  revalidatePath("/backoffice/insumos");
  redirect("/backoffice/insumos");
}

export async function actualizarPrecioInsumo(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const idMateriaPrima = Number(formData.get("id_materia_prima"));
  const costoNuevo = Number(formData.get("costo_nuevo"));
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!Number.isFinite(costoNuevo) || costoNuevo <= 0) {
    return { error: "El costo nuevo debe ser mayor a cero." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("actualizar_precio_materia_prima", {
    p_id_materia_prima: idMateriaPrima,
    p_costo_nuevo: costoNuevo,
    p_motivo: motivo || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/backoffice/insumos");
  return {};
}

export async function cambiarEstadoInsumo(idMateriaPrima: number, nuevoEstado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materia_prima")
    .update({ estado: nuevoEstado })
    .eq("id_materia_prima", idMateriaPrima);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/backoffice/insumos");
}
