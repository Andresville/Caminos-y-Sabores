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

function mensajeAmigable(codigo: string | undefined, mensajeOriginal: string): string {
  if (codigo === "22001") {
    return "El nombre de la receta es demasiado largo (máximo 100 caracteres).";
  }
  return mensajeOriginal;
}

/** Solo Asistente Comercial/Administrador definen el margen de una receta cuando se vende suelta como "plato" — Cocina no edita esto. Toda receta activa se publica automáticamente; esto solo define el margen propio y el coeficiente que resulta. */
export async function actualizarVentaIndividualReceta(datos: {
  idReceta: number;
  coeficienteVenta: number | null;
  descripcionPublica: string | null;
}): Promise<EstadoFormulario> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("actualizar_venta_individual_receta", {
    p_id_receta: datos.idReceta,
    p_coeficiente_venta: datos.coeficienteVenta,
    p_descripcion_publica: datos.descripcionPublica,
  });

  if (error) return { error: error.message };

  revalidatePath("/backoffice/recetas");
  revalidatePath(`/backoffice/recetas/${datos.idReceta}`);
  return {};
}

export interface LineaEntrada {
  id_materia_prima: number;
  cantidad_usada: number;
  id_unidad_receta: number;
}

/**
 * Alta o edición de una receta completa (encabezado + ingredientes) en
 * un solo paso. Recalcula el costo con el motor de dominio a partir de
 * datos frescos de la base (nunca confía en un costo calculado por el
 * cliente) y persiste todo de forma atómica vía
 * guardar_receta_completa() — que crea la receta cuando no recibe un
 * id existente.
 */
export async function guardarReceta(datos: {
  idReceta: number | null;
  nombrePlato: string;
  descripcionPublica: string;
  tipoPlato: string;
  cantidadPorciones: number;
  mermaPct: number;
  manoObraPct: number;
  imagenChicaUrl: string | null;
  imagenBannerUrl: string | null;
  estado: string;
  lineas: LineaEntrada[];
}): Promise<EstadoFormulario> {
  if (!datos.nombrePlato.trim()) return { error: "Ingresá el nombre de la receta." };
  if (!datos.tipoPlato) return { error: "Elegí el tipo de plato." };
  if (!Number.isFinite(datos.cantidadPorciones) || datos.cantidadPorciones <= 0) {
    return { error: "La cantidad mínima de platos debe ser mayor a cero." };
  }
  if (!Number.isFinite(datos.mermaPct) || datos.mermaPct < 0 || datos.mermaPct >= 100) {
    return { error: "La merma debe ser un porcentaje entre 0 y 100." };
  }
  if (!Number.isFinite(datos.manoObraPct) || datos.manoObraPct < 0) {
    return { error: "La mano de obra debe ser un porcentaje mayor o igual a 0." };
  }
  if (datos.estado === "ACTIVA" && datos.lineas.length === 0) {
    return { error: "No se puede activar una receta sin insumos cargados." };
  }
  if (datos.estado === "ACTIVA" && (!datos.imagenChicaUrl || !datos.imagenBannerUrl)) {
    return { error: "No se puede activar una receta sin sus dos fotos cargadas." };
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
    });
  }

  let costoTotal = new Decimal(0);
  let costoPorPorcion = new Decimal(0);
  try {
    const resultado = costearReceta({
      cantidadPorciones: datos.cantidadPorciones,
      mermaPct: new Decimal(datos.mermaPct),
      manoObraPct: new Decimal(datos.manoObraPct),
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
  }));

  const { data: resultado, error } = await supabase.rpc("guardar_receta_completa", {
    p_id_receta: datos.idReceta,
    p_nombre_plato: datos.nombrePlato,
    p_descripcion_publica: datos.descripcionPublica.trim() || null,
    p_tipo_plato: datos.tipoPlato,
    p_cantidad_porciones: datos.cantidadPorciones,
    p_merma_pct: datos.mermaPct,
    p_mano_obra_pct: datos.manoObraPct,
    p_imagen_chica_url: datos.imagenChicaUrl,
    p_imagen_banner_url: datos.imagenBannerUrl,
    p_estado: datos.estado,
    p_lineas: lineasJson,
    p_costo_total: costoTotal.toNumber(),
    p_costo_por_porcion: costoPorPorcion.toNumber(),
  });

  if (error) return { error: mensajeAmigable(error.code, error.message) };

  revalidatePath("/backoffice/recetas");

  if (datos.idReceta === null) {
    redirect(`/backoffice/recetas/${resultado.id_receta}`);
  }

  revalidatePath(`/backoffice/recetas/${datos.idReceta}`);
  return {};
}
