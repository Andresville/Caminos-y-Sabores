"use server";

import { revalidatePath } from "next/cache";
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

/**
 * Alta o edición de un insumo en un solo paso. Si cambió el
 * costo_unitario, ese cambio pasa por actualizar_precio_materia_prima()
 * para que la validación de motivo obligatorio (cuando la variación
 * supera el umbral) y el histórico de precios se apliquen igual que
 * desde cualquier otro camino. El resto de los campos se actualiza
 * aparte.
 */
export async function guardarInsumo(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const idExistenteRaw = String(formData.get("id_materia_prima") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const idCategoria = Number(formData.get("id_categoria"));
  const idUnidadCompra = Number(formData.get("id_unidad_compra"));
  const costoUnitario = Number(formData.get("costo_unitario"));
  const existenciaActualRaw = String(formData.get("existencia_actual") ?? "").trim();
  const existenciaActual = existenciaActualRaw ? Number(existenciaActualRaw) : 0;
  const idProveedorRaw = String(formData.get("id_proveedor") ?? "");
  const idProveedor = idProveedorRaw ? Number(idProveedorRaw) : null;
  const densidadRaw = String(formData.get("densidad_g_ml") ?? "").trim();
  const densidad = densidadRaw ? Number(densidadRaw) : null;
  const estado = formData.get("estado") === "true";
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!nombre) return { error: "Ingresá el nombre del insumo." };
  if (!idCategoria) return { error: "Elegí una categoría." };
  if (!idUnidadCompra) return { error: "Elegí la unidad de compra." };
  if (!Number.isFinite(costoUnitario) || costoUnitario <= 0) {
    return { error: "El costo unitario debe ser mayor a cero." };
  }
  if (!Number.isFinite(existenciaActual) || existenciaActual < 0) {
    return { error: "La existencia actual no puede ser negativa." };
  }

  const supabase = await createClient();

  if (!idExistenteRaw) {
    const { error } = await supabase.from("materia_prima").insert({
      nombre,
      id_categoria: idCategoria,
      id_unidad_compra: idUnidadCompra,
      id_proveedor: idProveedor,
      costo_unitario: costoUnitario,
      existencia_actual: existenciaActual,
      densidad_g_ml: densidad,
    });

    if (error) return { error: mensajeAmigable(error.code, error.message) };

    revalidatePath("/backoffice/insumos");
    return {};
  }

  const id = Number(idExistenteRaw);

  const { data: actual, error: errorActual } = await supabase
    .from("materia_prima")
    .select("costo_unitario")
    .eq("id_materia_prima", id)
    .single();

  if (errorActual || !actual) {
    return { error: "No se pudo leer el insumo a editar." };
  }

  if (Number(actual.costo_unitario) !== costoUnitario) {
    const { error: errorPrecio } = await supabase.rpc("actualizar_precio_materia_prima", {
      p_id_materia_prima: id,
      p_costo_nuevo: costoUnitario,
      p_motivo: motivo || null,
    });
    if (errorPrecio) return { error: errorPrecio.message };
  }

  const { error: errorResto } = await supabase
    .from("materia_prima")
    .update({
      nombre,
      id_categoria: idCategoria,
      id_unidad_compra: idUnidadCompra,
      id_proveedor: idProveedor,
      existencia_actual: existenciaActual,
      densidad_g_ml: densidad,
      estado,
    })
    .eq("id_materia_prima", id);

  if (errorResto) return { error: mensajeAmigable(errorResto.code, errorResto.message) };

  revalidatePath("/backoffice/insumos");
  return {};
}
