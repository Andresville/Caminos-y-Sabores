import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import { calcularPrecioMenu, type ParametrosComerciales } from "./calculo";
import TablaMenus, { type FilaMenu } from "./TablaMenus";

interface MenuDb {
  id_menu: number;
  nombre_menu: string;
  pax_minimo: number;
  coeficiente_venta: number;
  estado: boolean;
}

interface LineaMenuDb {
  id_menu: number;
  porciones_por_pax: number;
  receta: { costo_por_porcion: number | null } | null;
}

export default async function PaginaMenus() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol === "Jefe de Compras") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: menus, error }, { data: lineas }, { data: parametros }] = await Promise.all([
    supabase
      .from("menu")
      .select("id_menu, nombre_menu, pax_minimo, coeficiente_venta, estado")
      .order("nombre_menu")
      .returns<MenuDb[]>(),
    supabase
      .from("menu_receta")
      .select("id_menu, porciones_por_pax, receta:id_receta ( costo_por_porcion )")
      .returns<LineaMenuDb[]>(),
    supabase
      .from("parametro_sistema")
      .select("clave, valor")
      .in("clave", ["GASTOS_GENERALES_PCT", "IVA_PORCENTAJE", "REDONDEO_PRECIO_FINAL"]),
  ]);

  const mapaParametros = new Map((parametros ?? []).map((p) => [p.clave, Number(p.valor)]));
  const parametrosComerciales: ParametrosComerciales = {
    gastosGeneralesPct: mapaParametros.get("GASTOS_GENERALES_PCT") ?? 0,
    ivaPorcentaje: mapaParametros.get("IVA_PORCENTAJE") ?? 0,
    redondeoPrecioFinal: mapaParametros.get("REDONDEO_PRECIO_FINAL") ?? 1,
  };

  const filas: FilaMenu[] = (menus ?? []).map((menu) => {
    const recetasDelMenu = (lineas ?? [])
      .filter((linea) => linea.id_menu === menu.id_menu && linea.receta?.costo_por_porcion != null)
      .map((linea) => ({
        costoPorPorcion: linea.receta!.costo_por_porcion as number,
        porcionesPorPax: linea.porciones_por_pax,
      }));

    let costoPorPax: number | null = null;
    let precioPublico: number | null = null;

    if (recetasDelMenu.length > 0) {
      const resultado = calcularPrecioMenu(
        recetasDelMenu.map((r) => ({
          costoPorPorcion: new Decimal(r.costoPorPorcion),
          porcionesPorPax: new Decimal(r.porcionesPorPax),
        })),
        menu.coeficiente_venta,
        parametrosComerciales,
      );
      costoPorPax = resultado.costoPorPax.toNumber();
      precioPublico = resultado.precioFinal.toNumber();
    }

    return {
      id_menu: menu.id_menu,
      nombre_menu: menu.nombre_menu,
      pax_minimo: menu.pax_minimo,
      coeficiente_venta: menu.coeficiente_venta,
      estado: menu.estado,
      cantidad_recetas: recetasDelMenu.length,
      costo_por_pax: costoPorPax,
      precio_publico: precioPublico,
    };
  });

  return (
    <>
      <EncabezadoPagina titulo="Menús" subtitulo="Composición de menús comerciales a partir de recetas activas" />
      <Box sx={{ p: 4 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            No se pudo cargar el listado: {error.message}
          </Typography>
        )}
        <TablaMenus menus={filas} />
      </Box>
    </>
  );
}
