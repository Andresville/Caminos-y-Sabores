"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import { createClient } from "@/lib/supabase/server";
import { costearReceta, type LineaReceta } from "@/domain/costeo";
import { insumoDominio, unidadDominio, type InsumoCatalogo, type UnidadCatalogo } from "./mapeo";

export interface EstadoFormulario {
  error?: string;
}

export async function crearReceta(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const nombrePlato = String(formData.get("nombre_plato") ?? "").trim();
  const tipoPlato = String(formData.get("tipo_plato") ?? "");
  const cantidadPorciones = Number(formData.get("cantidad_porciones"));

  if (!nombrePlato) return { error: "Ingresá el nombre del plato." };
  if (!tipoPlato) return { error: "Elegí el tipo de plato." };
  if (!Number.isFinite(cantidadPorciones) || cantidadPorciones <= 0) {
    return { error: "La cantidad de porciones debe ser mayor a cero." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receta")
    .insert({ nombre_plato: nombrePlato, tipo_plato: tipoPlato, cantidad_porciones: cantidadPorciones })
    .select("id_receta")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se pudo crear la receta." };
  }

  revalidatePath("/backoffice/recetas");
  redirect(`/backoffice/recetas/${data.id_receta}`);
}

export interface LineaEntrada {
  id_materia_prima: number;
  cantidad_usada: number;
  id_unidad_receta: number;
  porcentaje_merma: number;
}

/**
 * Recalcula el costo con el motor de dominio a partir de datos frescos
 * de la base (nunca confía en un costo calculado por el cliente) y
 * persiste todo de forma atómica vía guardar_receta_completa().
 */
export async function guardarReceta(datos: {
  idReceta: number;
  nombrePlato: string;
  tipoPlato: string;
  cantidadPorciones: number;
  estado: string;
  lineas: LineaEntrada[];
}): Promise<EstadoFormulario> {
  if (!datos.nombrePlato.trim()) return { error: "Ingresá el nombre del plato." };
  if (!datos.tipoPlato) return { error: "Elegí el tipo de plato." };
  if (!Number.isFinite(datos.cantidadPorciones) || datos.cantidadPorciones <= 0) {
    return { error: "La cantidad de porciones debe ser mayor a cero." };
  }
  if (datos.estado === "ACTIVA" && datos.lineas.length === 0) {
    return { error: "No se puede activar una receta sin insumos cargados." };
  }

  const supabase = await createClient();

  const idsInsumos = [...new Set(datos.lineas.map((l) => l.id_materia_prima))];

  const [{ data: insumosDb, error: errorInsumos }, { data: unidadesDb, error: errorUnidades }] =
    await Promise.all([
      idsInsumos.length > 0
        ? supabase
            .from("materia_prima")
            .select("id_materia_prima, nombre, costo_unitario, densidad_g_ml, id_unidad_compra")
            .in("id_materia_prima", idsInsumos)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("unidad_medida").select("id_unidad, nombre, simbolo, magnitud, factor_a_base"),
    ]);

  if (errorInsumos || errorUnidades) {
    return { error: "No se pudieron leer los insumos o unidades para calcular el costo." };
  }

  const unidades = (unidadesDb ?? []) as UnidadCatalogo[];
  const insumos = (insumosDb ?? []) as InsumoCatalogo[];

  const lineasDominio: LineaReceta[] = [];
  for (const linea of datos.lineas) {
    const insumoDb = insumos.find((i) => i.id_materia_prima === linea.id_materia_prima);
    const unidadReceta = unidades.find((u) => u.id_unidad === linea.id_unidad_receta);
    if (!insumoDb || !unidadReceta) {
      return { error: "Alguna línea tiene un insumo o una unidad inválidos." };
    }
    const insumo = insumoDominio(insumoDb, unidades);
    if (!insumo) {
      return { error: `El insumo "${insumoDb.nombre}" no tiene una unidad de compra válida.` };
    }
    lineasDominio.push({
      insumo,
      cantidadUsada: new Decimal(linea.cantidad_usada),
      unidadReceta: unidadDominio(unidadReceta),
      porcentajeMerma: new Decimal(linea.porcentaje_merma),
    });
  }

  let costoTotal = new Decimal(0);
  let costoPorPorcion = new Decimal(0);
  try {
    const resultado = costearReceta({
      cantidadPorciones: datos.cantidadPorciones,
      lineas: lineasDominio,
    });
    costoTotal = resultado.costoTotal;
    costoPorPorcion = resultado.costoPorPorcion;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo calcular el costo de la receta.",
    };
  }

  const lineasJson = datos.lineas.map((linea) => ({
    id_materia_prima: linea.id_materia_prima,
    cantidad_usada: linea.cantidad_usada,
    id_unidad_receta: linea.id_unidad_receta,
    porcentaje_merma: linea.porcentaje_merma,
  }));

  const { error } = await supabase.rpc("guardar_receta_completa", {
    p_id_receta: datos.idReceta,
    p_nombre_plato: datos.nombrePlato,
    p_tipo_plato: datos.tipoPlato,
    p_cantidad_porciones: datos.cantidadPorciones,
    p_estado: datos.estado,
    p_lineas: lineasJson,
    p_costo_total: costoTotal.toNumber(),
    p_costo_por_porcion: costoPorPorcion.toNumber(),
  });

  if (error) return { error: error.message };

  revalidatePath("/backoffice/recetas");
  revalidatePath(`/backoffice/recetas/${datos.idReceta}`);
  return {};
}
