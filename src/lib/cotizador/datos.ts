import Decimal from "decimal.js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecetaEnMenu } from "@/domain/costeo";
import { calcularPrecioMenu, type ParametrosComerciales as ParametrosMenu } from "@/app/backoffice/(protegido)/menus/calculo";
import {
  calcularPrecioAdicional,
  type AdicionalSeleccionado,
  type MenuSeleccionado,
  type ParametrosComerciales,
  type TipoCobroAdicional,
} from "./calculo";

/**
 * Único punto de lectura de catálogo para el portal público. El
 * usuario público (anon) no tiene ningún permiso de RLS sobre estas
 * tablas, así que se usa el cliente con service_role, y estas
 * funciones nunca devuelven costo ni coeficiente de venta: solo los
 * precios públicos ya calculados.
 */

export interface ParametrosPortal extends ParametrosComerciales {
  paxMinimoEvento: number;
  paxMaximoAutomatico: number;
  validezCotizacionDias: number;
}

const CLAVES_PARAMETROS = [
  "GASTOS_GENERALES_PCT",
  "IVA_PORCENTAJE",
  "REDONDEO_PRECIO_FINAL",
  "PAX_POR_MOZO",
  "COSTO_MOZO_EVENTO",
  "COEFICIENTE_VENTA_DEFECTO",
  "PAX_MINIMO_EVENTO",
  "PAX_MAXIMO_AUTOMATICO",
  "VALIDEZ_COTIZACION_DIAS",
] as const;

export async function obtenerParametrosPortal(): Promise<ParametrosPortal> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("parametro_sistema").select("clave, valor").in("clave", CLAVES_PARAMETROS);

  const valores = new Map((data ?? []).map((fila) => [fila.clave, Number(fila.valor)]));
  const obtener = (clave: string) => valores.get(clave) ?? 0;

  return {
    gastosGeneralesPct: obtener("GASTOS_GENERALES_PCT"),
    ivaPorcentaje: obtener("IVA_PORCENTAJE"),
    redondeoPrecioFinal: obtener("REDONDEO_PRECIO_FINAL"),
    paxPorMozo: obtener("PAX_POR_MOZO"),
    costoMozoEvento: obtener("COSTO_MOZO_EVENTO"),
    coeficienteVentaDefecto: obtener("COEFICIENTE_VENTA_DEFECTO"),
    paxMinimoEvento: obtener("PAX_MINIMO_EVENTO"),
    paxMaximoAutomatico: obtener("PAX_MAXIMO_AUTOMATICO"),
    validezCotizacionDias: obtener("VALIDEZ_COTIZACION_DIAS"),
  };
}

export interface MenuPublico {
  idMenu: number;
  nombre: string;
  descripcion: string | null;
  paxMinimo: number;
  precioPorPersona: number;
  composicion: string[];
}

interface FilaMenuReceta {
  id_menu: number;
  tipo_plato: string;
  porciones_por_pax: number;
  orden: number;
  receta: { costo_por_porcion: number | null; estado: string } | null;
}

export async function obtenerMenusPublicos(parametros: ParametrosPortal): Promise<MenuPublico[]> {
  const supabase = createAdminClient();

  const { data: menus } = await supabase
    .from("menu")
    .select("id_menu, nombre_menu, descripcion, coeficiente_venta, pax_minimo")
    .eq("estado", true)
    .order("nombre_menu");

  if (!menus || menus.length === 0) return [];

  const idsMenu = menus.map((m) => m.id_menu);

  const { data: composicion } = await supabase
    .from("menu_receta")
    .select("id_menu, tipo_plato, porciones_por_pax, orden, receta:id_receta(costo_por_porcion, estado)")
    .in("id_menu", idsMenu)
    .order("orden")
    .returns<FilaMenuReceta[]>();

  const parametrosMenu: ParametrosMenu = {
    gastosGeneralesPct: parametros.gastosGeneralesPct,
    ivaPorcentaje: parametros.ivaPorcentaje,
    redondeoPrecioFinal: parametros.redondeoPrecioFinal,
  };

  const resultado: MenuPublico[] = [];

  for (const menu of menus) {
    const lineas = (composicion ?? []).filter((linea) => linea.id_menu === menu.id_menu);

    // Un menú con alguna receta sin costo calculado (o inactiva) no se publica en el portal.
    const tieneRecetaSinCosto = lineas.some(
      (linea) => !linea.receta || linea.receta.estado !== "ACTIVA" || linea.receta.costo_por_porcion == null,
    );
    if (lineas.length === 0 || tieneRecetaSinCosto) continue;

    const recetasDominio: RecetaEnMenu[] = lineas.map((linea) => ({
      costoPorPorcion: new Decimal(linea.receta!.costo_por_porcion!),
      porcionesPorPax: new Decimal(linea.porciones_por_pax),
    }));

    const { precioFinal } = calcularPrecioMenu(recetasDominio, menu.coeficiente_venta, parametrosMenu);

    resultado.push({
      idMenu: menu.id_menu,
      nombre: menu.nombre_menu,
      descripcion: menu.descripcion,
      paxMinimo: menu.pax_minimo,
      precioPorPersona: precioFinal.toNumber(),
      composicion: lineas.map((linea) => linea.tipo_plato),
    });
  }

  return resultado;
}

/** Datos crudos (para el motor de dominio) del menú elegido en el wizard. null si no existe, está inactivo o alguna receta no tiene costo vigente. */
export async function obtenerMenuParaCalculo(
  idMenu: number,
): Promise<(MenuSeleccionado & { paxMinimo: number }) | null> {
  const supabase = createAdminClient();

  const { data: menu } = await supabase
    .from("menu")
    .select("nombre_menu, coeficiente_venta, pax_minimo, estado")
    .eq("id_menu", idMenu)
    .single();

  if (!menu || !menu.estado) return null;

  const { data: lineas } = await supabase
    .from("menu_receta")
    .select("porciones_por_pax, receta:id_receta(costo_por_porcion, estado)")
    .eq("id_menu", idMenu)
    .returns<Pick<FilaMenuReceta, "porciones_por_pax" | "receta">[]>();

  if (!lineas || lineas.length === 0) return null;
  const tieneRecetaSinCosto = lineas.some(
    (linea) => !linea.receta || linea.receta.estado !== "ACTIVA" || linea.receta.costo_por_porcion == null,
  );
  if (tieneRecetaSinCosto) return null;

  return {
    idMenu,
    nombreMenu: menu.nombre_menu,
    coeficienteVenta: menu.coeficiente_venta,
    paxMinimo: menu.pax_minimo,
    recetas: lineas.map((linea) => ({
      costoPorPorcion: new Decimal(linea.receta!.costo_por_porcion!),
      porcionesPorPax: new Decimal(linea.porciones_por_pax),
    })),
  };
}

/** Datos crudos de los adicionales elegidos en el wizard, filtrando los que hayan dejado de estar activos. */
export async function obtenerAdicionalesParaCalculo(idsAdicionales: number[]): Promise<AdicionalSeleccionado[]> {
  if (idsAdicionales.length === 0) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("servicio_adicional")
    .select("id_adicional, nombre_servicio, coeficiente_venta, tipo_cobro, costo_actual")
    .in("id_adicional", idsAdicionales)
    .eq("estado", true);

  return (data ?? []).map((fila) => ({
    idAdicional: fila.id_adicional,
    nombreServicio: fila.nombre_servicio,
    coeficienteVenta: fila.coeficiente_venta,
    tipoCobro: fila.tipo_cobro as TipoCobroAdicional,
    costoUnitario: fila.costo_actual,
  }));
}

export interface ServicioPublico {
  idAdicional: number;
  nombre: string;
  descripcion: string | null;
  tipoCobro: TipoCobroAdicional;
  precioUnitario: number;
}

export async function obtenerServiciosPublicos(parametros: ParametrosPortal): Promise<ServicioPublico[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("servicio_adicional")
    .select("id_adicional, nombre_servicio, descripcion, tipo_cobro, costo_actual, coeficiente_venta")
    .eq("estado", true)
    .order("nombre_servicio");

  return (data ?? []).map((fila) => ({
    idAdicional: fila.id_adicional,
    nombre: fila.nombre_servicio,
    descripcion: fila.descripcion,
    tipoCobro: fila.tipo_cobro as TipoCobroAdicional,
    precioUnitario: calcularPrecioAdicional(
      { coeficienteVenta: fila.coeficiente_venta, costoUnitario: fila.costo_actual },
      parametros,
    ),
  }));
}
