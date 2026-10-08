"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { createClient } from "@/lib/supabase/server";
import { convertirACantidadBase } from "@/domain/costeo";
import { insumoDominio, unidadDominio, type InsumoCatalogo, type UnidadCatalogo } from "../recetas/mapeo";
import type { EstadoEvento, EstadoInsumoCompra } from "./mapeo";

export interface EstadoAccion {
  error?: string;
}

export async function cambiarEstadoEvento(idEvento: number, nuevoEstado: EstadoEvento): Promise<EstadoAccion> {
  const supabase = await createClient();

  const { error } = await supabase.from("evento").update({ estado: nuevoEstado }).eq("id_evento", idEvento);

  if (error) return { error: error.message };

  revalidatePath("/backoffice/eventos");
  revalidatePath(`/backoffice/eventos/${idEvento}`);
  return {};
}

export async function actualizarDescripcionEvento(idEvento: number, descripcion: string): Promise<EstadoAccion> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("evento")
    .update({ descripcion: descripcion.trim() || null })
    .eq("id_evento", idEvento);

  if (error) return { error: error.message };

  revalidatePath(`/backoffice/eventos/${idEvento}`);
  return {};
}

export async function marcarEstadoInsumoEvento(
  idEventoInsumo: number,
  idEvento: number,
  nuevoEstado: EstadoInsumoCompra,
): Promise<EstadoAccion> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("evento_insumo")
    .update({ estado: nuevoEstado })
    .eq("id_evento_insumo", idEventoInsumo);

  if (error) return { error: error.message };

  revalidatePath(`/backoffice/eventos/${idEvento}`);
  return {};
}

interface LineaCotizacionInsumos {
  tipo_item: "MENU" | "RECETA";
  referencia_id: number;
  cantidad: number;
}

interface RecetaConLineas {
  id_receta: number;
  cantidad_porciones: number;
}

/**
 * Arma la lista de compra a partir de los menús/recetas pedidos en el
 * presupuesto que dio origen al evento y la persiste vía
 * generar_lista_compra_evento() (que además avanza el evento a "En
 * Preparación"). Todo el cálculo de cantidades/costos se hace acá en
 * TypeScript, nunca en SQL, para reusar el mismo motor de conversión de
 * unidades que ya usa el costeo de recetas — la función de base solo
 * persiste lo que ya viene calculado.
 *
 * receta.cantidad_porciones es el tamaño del LOTE completo de esa
 * receta: las cantidad_usada de receta_materia_prima ya están
 * calibradas para producir ese lote entero, no una porción. Por eso
 * cada insumo se escala por (cantidad pedida en la línea / cantidad de
 * porciones del lote) antes de sumarlo.
 */
export async function solicitarListaDeCompra(idEvento: number): Promise<EstadoAccion> {
  const supabase = await createClient();

  const { data: evento, error: errorEvento } = await supabase
    .from("evento")
    .select("id_cotizacion")
    .eq("id_evento", idEvento)
    .single();

  if (errorEvento || !evento) return { error: "No se pudo leer el evento." };

  const { data: lineas, error: errorLineas } = await supabase
    .from("cotizacion_detalle")
    .select("tipo_item, referencia_id, cantidad")
    .eq("id_cotizacion", evento.id_cotizacion)
    .in("tipo_item", ["MENU", "RECETA"])
    .returns<LineaCotizacionInsumos[]>();

  if (errorLineas) return { error: "No se pudieron leer los menús/recetas del presupuesto." };
  if (!lineas || lineas.length === 0) {
    return { error: "El presupuesto de este evento no tiene menús ni recetas con insumos." };
  }

  const idsMenu = [...new Set(lineas.filter((l) => l.tipo_item === "MENU").map((l) => l.referencia_id))];

  const { data: menuRecetas, error: errorMenuRecetas } =
    idsMenu.length > 0
      ? await supabase.from("menu_receta").select("id_menu, id_receta").in("id_menu", idsMenu)
      : { data: [], error: null };

  if (errorMenuRecetas) return { error: "No se pudieron leer las recetas de los menús del evento." };

  // Cada (receta, cantidad pedida) a procesar: una línea RECETA aporta una, una línea MENU aporta una por cada receta que contiene el menú.
  const pedidos: { idReceta: number; cantidadPedida: Decimal }[] = [];
  for (const linea of lineas) {
    if (linea.tipo_item === "RECETA") {
      pedidos.push({ idReceta: linea.referencia_id, cantidadPedida: new Decimal(linea.cantidad) });
    } else {
      const recetasDelMenu = (menuRecetas ?? []).filter((mr) => mr.id_menu === linea.referencia_id);
      for (const mr of recetasDelMenu) {
        pedidos.push({ idReceta: mr.id_receta, cantidadPedida: new Decimal(linea.cantidad) });
      }
    }
  }

  if (pedidos.length === 0) {
    return { error: "No se encontraron recetas para armar la lista de compra." };
  }

  const idsReceta = [...new Set(pedidos.map((p) => p.idReceta))];

  const [{ data: recetas, error: errorRecetas }, { data: lineasReceta, error: errorLineasReceta }] =
    await Promise.all([
      supabase.from("receta").select("id_receta, cantidad_porciones").in("id_receta", idsReceta).returns<RecetaConLineas[]>(),
      supabase
        .from("receta_materia_prima")
        .select("id_receta, id_materia_prima, cantidad_usada, id_unidad_receta")
        .in("id_receta", idsReceta),
    ]);

  if (errorRecetas || errorLineasReceta || !recetas || !lineasReceta) {
    return { error: "No se pudieron leer los insumos de las recetas del evento." };
  }

  const idsInsumo = [...new Set(lineasReceta.map((l) => l.id_materia_prima))];

  const [{ data: insumosDb, error: errorInsumos }, { data: unidadesDb, error: errorUnidades }] = await Promise.all([
    idsInsumo.length > 0
      ? supabase
          .from("materia_prima")
          .select("id_materia_prima, nombre, costo_unitario, densidad_g_ml, id_unidad_compra, estado")
          .in("id_materia_prima", idsInsumo)
          .returns<InsumoCatalogo[]>()
      : Promise.resolve({ data: [], error: null }),
    supabase.from("unidad_medida").select("id_unidad, nombre, simbolo, magnitud, factor_a_base").returns<UnidadCatalogo[]>(),
  ]);

  if (errorInsumos || errorUnidades) {
    return { error: "No se pudieron leer los insumos o las unidades de medida." };
  }

  const unidades = unidadesDb ?? [];
  const insumosPorId = new Map((insumosDb ?? []).map((i) => [i.id_materia_prima, i]));
  const recetasPorId = new Map(recetas.map((r) => [r.id_receta, r]));

  const acumuladoBase = new Map<number, Decimal>();

  for (const pedido of pedidos) {
    const receta = recetasPorId.get(pedido.idReceta);
    if (!receta || receta.cantidad_porciones <= 0) continue;

    const factor = pedido.cantidadPedida.dividedBy(receta.cantidad_porciones);
    const lineasDeEstaReceta = lineasReceta.filter((l) => l.id_receta === pedido.idReceta);

    for (const linea of lineasDeEstaReceta) {
      const insumoDb = insumosPorId.get(linea.id_materia_prima);
      const unidadDb = unidades.find((u) => u.id_unidad === linea.id_unidad_receta);
      if (!insumoDb || !unidadDb) continue;

      const insumo = insumoDominio(insumoDb, unidades);
      if (!insumo) continue;

      try {
        const cantidadEscalada = new Decimal(linea.cantidad_usada).times(factor);
        const cantidadBase = convertirACantidadBase(cantidadEscalada, unidadDominio(unidadDb), insumo);
        const acumulado = acumuladoBase.get(linea.id_materia_prima) ?? new Decimal(0);
        acumuladoBase.set(linea.id_materia_prima, acumulado.plus(cantidadBase));
      } catch {
        // Insumo con unidades incompatibles (sin densidad cargada): se omite de la lista, no puede bloquear el evento entero.
        continue;
      }
    }
  }

  if (acumuladoBase.size === 0) {
    return { error: "No se pudo calcular ningún insumo para la lista de compra." };
  }

  const lineasRpc = [...acumuladoBase.entries()].map(([idMateriaPrima, cantidadBase]) => {
    const insumoDb = insumosPorId.get(idMateriaPrima)!;
    const insumo = insumoDominio(insumoDb, unidades)!;
    const cantidadEnUnidadCompra = cantidadBase.dividedBy(insumo.unidadCompra.factorABase);
    const costoEstimado = cantidadEnUnidadCompra.times(insumo.costoUnitario);
    return {
      id_materia_prima: idMateriaPrima,
      cantidad_necesaria: cantidadEnUnidadCompra.toNumber(),
      costo_estimado: costoEstimado.toNumber(),
    };
  });

  const { error: errorRpc } = await supabase.rpc("generar_lista_compra_evento", {
    p_id_evento: idEvento,
    p_lineas: lineasRpc,
  });

  if (errorRpc) return { error: errorRpc.message };

  revalidatePath("/backoffice/eventos");
  revalidatePath(`/backoffice/eventos/${idEvento}`);
  return {};
}
