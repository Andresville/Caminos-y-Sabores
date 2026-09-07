"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EstadoFormulario {
  error?: string;
}

function mensajeAmigable(codigo: string | undefined, mensajeOriginal: string): string {
  if (codigo === "23514") {
    return "El costo y el coeficiente de venta deben ser válidos (costo ≥ 0, coeficiente ≥ 1).";
  }
  return mensajeOriginal;
}

export async function guardarAdicional(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const idExistenteRaw = String(formData.get("id_adicional") ?? "");
  const nombreServicio = String(formData.get("nombre_servicio") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const tipoCobro = String(formData.get("tipo_cobro") ?? "");
  const costoActual = Number(formData.get("costo_actual"));
  const coeficienteVenta = Number(formData.get("coeficiente_venta"));
  const estado = formData.get("estado") === "true";

  if (!nombreServicio) return { error: "Ingresá el nombre del servicio." };
  if (!tipoCobro) return { error: "Elegí el tipo de cobro." };
  if (!Number.isFinite(costoActual) || costoActual < 0) {
    return { error: "El costo debe ser mayor o igual a cero." };
  }
  if (!Number.isFinite(coeficienteVenta) || coeficienteVenta < 1) {
    return { error: "El coeficiente de venta debe ser mayor o igual a 1." };
  }

  const supabase = await createClient();

  if (!idExistenteRaw) {
    const { error } = await supabase.from("servicio_adicional").insert({
      nombre_servicio: nombreServicio,
      descripcion: descripcion || null,
      tipo_cobro: tipoCobro,
      costo_actual: costoActual,
      coeficiente_venta: coeficienteVenta,
    });

    if (error) return { error: mensajeAmigable(error.code, error.message) };

    revalidatePath("/backoffice/adicionales");
    return {};
  }

  const { error } = await supabase
    .from("servicio_adicional")
    .update({
      nombre_servicio: nombreServicio,
      descripcion: descripcion || null,
      tipo_cobro: tipoCobro,
      costo_actual: costoActual,
      coeficiente_venta: coeficienteVenta,
      estado,
    })
    .eq("id_adicional", Number(idExistenteRaw));

  if (error) return { error: mensajeAmigable(error.code, error.message) };

  revalidatePath("/backoffice/adicionales");
  return {};
}
