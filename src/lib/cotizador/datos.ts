import Decimal from "decimal.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { costoMenuPorInvitado, type RecetaEnMenu } from "@/domain/costeo";
import { calcularPrecioMenu, type ParametrosComerciales as ParametrosMenu } from "@/app/backoffice/(protegido)/menus/calculo";
import { calcularPrecioPublico, type ParametrosComerciales } from "./calculo";

/** Orden de presentación de un menú (entrada antes que principal, etc.), independiente del orden en que el Chef haya cargado cada línea al componerlo. */
const ORDEN_TIPO_PLATO: Record<string, number> = {
  RECEPCION: 0,
  ENTRADA: 1,
  PRINCIPAL: 2,
  POSTRE: 3,
  MESA_DULCE: 4,
};

/**
 * Único punto de lectura de catálogo para el portal cliente. El
 * usuario público (anon) no tiene ningún permiso de RLS sobre estas
 * tablas, así que se usa el cliente con service_role, y estas
 * funciones nunca devuelven costo ni coeficiente de venta: solo los
 * precios públicos ya calculados.
 */

export interface ParametrosPortal extends ParametrosComerciales {
  validezCotizacionDias: number;
  coeficienteVentaDefecto: number;
}

const CLAVES_PARAMETROS = [
  "GASTOS_GENERALES_PCT",
  "IVA_PORCENTAJE",
  "REDONDEO_PRECIO_FINAL",
  "VALIDEZ_COTIZACION_DIAS",
  "COEFICIENTE_VENTA_DEFECTO",
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
    validezCotizacionDias: obtener("VALIDEZ_COTIZACION_DIAS"),
    coeficienteVentaDefecto: obtener("COEFICIENTE_VENTA_DEFECTO"),
  };
}

export interface PlatoDeMenu {
  tipoPlato: string;
  nombrePlato: string;
  descripcionPublica: string | null;
}

export interface MenuPublico {
  idMenu: number;
  nombre: string;
  descripcion: string | null;
  paxMinimo: number;
  precioPorPersona: number;
  composicion: PlatoDeMenu[];
  imagenUrl: string | null;
}

interface FilaMenuReceta {
  id_menu: number;
  id_receta: number;
  tipo_plato: string;
  porciones_por_pax: number;
  orden: number;
  receta: { costo_por_porcion: number | null; estado: string; nombre_plato: string; descripcion_publica: string | null } | null;
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

  const [{ data: composicion }, { data: fotos }] = await Promise.all([
    supabase
      .from("menu_receta")
      .select(
        "id_menu, id_receta, tipo_plato, porciones_por_pax, orden, receta:id_receta(costo_por_porcion, estado, nombre_plato, descripcion_publica)",
      )
      .in("id_menu", idsMenu)
      .order("orden")
      .returns<FilaMenuReceta[]>(),
    supabase.from("menu_foto_plato").select("id_menu, id_receta, imagen_url").in("id_menu", idsMenu),
  ]);

  const parametrosMenu: ParametrosMenu = {
    gastosGeneralesPct: parametros.gastosGeneralesPct,
    ivaPorcentaje: parametros.ivaPorcentaje,
    redondeoPrecioFinal: parametros.redondeoPrecioFinal,
  };

  const resultado: MenuPublico[] = [];

  for (const menu of menus) {
    const lineas = (composicion ?? [])
      .filter((linea) => linea.id_menu === menu.id_menu)
      .sort((a, b) => (ORDEN_TIPO_PLATO[a.tipo_plato] ?? 99) - (ORDEN_TIPO_PLATO[b.tipo_plato] ?? 99));

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

    // Primera foto de plato que tenga este menú, si alguna receta de su composición tiene una cargada.
    const primeraFoto = (fotos ?? []).find(
      (foto) => foto.id_menu === menu.id_menu && lineas.some((linea) => linea.id_receta === foto.id_receta),
    );

    resultado.push({
      idMenu: menu.id_menu,
      nombre: menu.nombre_menu,
      descripcion: menu.descripcion,
      paxMinimo: menu.pax_minimo,
      precioPorPersona: precioFinal.toNumber(),
      composicion: lineas.map((linea) => ({
        tipoPlato: linea.tipo_plato,
        nombrePlato: linea.receta!.nombre_plato,
        descripcionPublica: linea.receta!.descripcion_publica,
      })),
      imagenUrl: primeraFoto?.imagen_url ?? null,
    });
  }

  return resultado;
}

export interface MenuParaCalculo {
  idMenu: number;
  nombreMenu: string;
  coeficienteVenta: number;
  costoPorPersona: Decimal;
  paxMinimo: number;
}

/** Datos crudos (para el motor de dominio) del menú elegido en el carrito. null si no existe, está inactivo o alguna receta no tiene costo vigente. */
export async function obtenerMenuParaCalculo(idMenu: number): Promise<MenuParaCalculo | null> {
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

  const recetasDominio: RecetaEnMenu[] = lineas.map((linea) => ({
    costoPorPorcion: new Decimal(linea.receta!.costo_por_porcion!),
    porcionesPorPax: new Decimal(linea.porciones_por_pax),
  }));

  return {
    idMenu,
    nombreMenu: menu.nombre_menu,
    coeficienteVenta: menu.coeficiente_venta,
    paxMinimo: menu.pax_minimo,
    costoPorPersona: costoMenuPorInvitado(recetasDominio),
  };
}

export interface PlatoPublico {
  idReceta: number;
  nombre: string;
  descripcion: string | null;
  precioPorPorcion: number;
  cantidadPorciones: number;
  /** Foto chica del catálogo (grilla de platos). */
  imagenChicaUrl: string | null;
  /** Foto banner del detalle del plato. */
  imagenBannerUrl: string | null;
}

export async function obtenerPlatosPublicos(parametros: ParametrosPortal): Promise<PlatoPublico[]> {
  const supabase = createAdminClient();

  const { data: recetas } = await supabase
    .from("receta")
    .select(
      "id_receta, nombre_plato, descripcion_publica, costo_por_porcion, coeficiente_venta, cantidad_porciones, imagen_chica_url, imagen_banner_url",
    )
    .eq("estado", "ACTIVA")
    .not("costo_por_porcion", "is", null)
    .order("nombre_plato");

  return (recetas ?? []).map((receta) => ({
    idReceta: receta.id_receta,
    nombre: receta.nombre_plato,
    descripcion: receta.descripcion_publica,
    precioPorPorcion: calcularPrecioPublico(
      { coeficienteVenta: receta.coeficiente_venta ?? parametros.coeficienteVentaDefecto, costoUnitario: receta.costo_por_porcion! },
      parametros,
      false,
    ),
    cantidadPorciones: receta.cantidad_porciones,
    imagenChicaUrl: receta.imagen_chica_url,
    imagenBannerUrl: receta.imagen_banner_url,
  }));
}

export interface IngredientePublico {
  nombre: string;
}

/** Ingredientes reales de una receta (solo nombre del insumo, sin cantidades ni costos) para mostrar en el detalle público de un plato. */
export async function obtenerIngredientesPublicosReceta(idReceta: number): Promise<IngredientePublico[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("receta_materia_prima")
    .select("orden, materia_prima:id_materia_prima(nombre)")
    .eq("id_receta", idReceta)
    .order("orden")
    .returns<{ orden: number; materia_prima: { nombre: string } | null }[]>();

  return (data ?? []).filter((fila) => fila.materia_prima).map((fila) => ({ nombre: fila.materia_prima!.nombre }));
}

export interface RecetaParaCalculo {
  idReceta: number;
  nombrePlato: string;
  coeficienteVenta: number;
  costoPorPorcion: Decimal;
  cantidadPorciones: number;
}

/** Datos crudos del plato elegido en el carrito. null si no existe, no está activa, o todavía no tiene costo calculado. Cualquier receta activa es vendible como plato suelto. */
export async function obtenerRecetaParaCalculo(idReceta: number, parametros: ParametrosPortal): Promise<RecetaParaCalculo | null> {
  const supabase = createAdminClient();

  const { data: receta } = await supabase
    .from("receta")
    .select("nombre_plato, estado, costo_por_porcion, coeficiente_venta, cantidad_porciones")
    .eq("id_receta", idReceta)
    .single();

  if (!receta || receta.estado !== "ACTIVA" || receta.costo_por_porcion == null) return null;

  return {
    idReceta,
    nombrePlato: receta.nombre_plato,
    coeficienteVenta: receta.coeficiente_venta ?? parametros.coeficienteVentaDefecto,
    costoPorPorcion: new Decimal(receta.costo_por_porcion),
    cantidadPorciones: receta.cantidad_porciones,
  };
}

export interface ServicioPublico {
  idAdicional: number;
  nombre: string;
  descripcion: string | null;
  tipoCobro: "FIJO" | "POR_PERSONA";
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
    tipoCobro: fila.tipo_cobro as "FIJO" | "POR_PERSONA",
    precioUnitario: calcularPrecioPublico(
      { coeficienteVenta: fila.coeficiente_venta, costoUnitario: fila.costo_actual },
      parametros,
      true,
    ),
  }));
}

export interface AdicionalParaCalculo {
  idAdicional: number;
  nombreServicio: string;
  tipoCobro: "FIJO" | "POR_PERSONA";
  coeficienteVenta: number;
  costoUnitario: Decimal;
}

/** Datos crudos de los adicionales elegidos en el carrito, filtrando los que hayan dejado de estar activos. */
export async function obtenerAdicionalesParaCalculo(idsAdicionales: number[]): Promise<AdicionalParaCalculo[]> {
  if (idsAdicionales.length === 0) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("servicio_adicional")
    .select("id_adicional, nombre_servicio, tipo_cobro, coeficiente_venta, costo_actual")
    .in("id_adicional", idsAdicionales)
    .eq("estado", true);

  return (data ?? []).map((fila) => ({
    idAdicional: fila.id_adicional,
    nombreServicio: fila.nombre_servicio,
    tipoCobro: fila.tipo_cobro as "FIJO" | "POR_PERSONA",
    coeficienteVenta: fila.coeficiente_venta,
    costoUnitario: new Decimal(fila.costo_actual),
  }));
}
