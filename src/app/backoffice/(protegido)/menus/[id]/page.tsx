import { notFound, redirect } from "next/navigation";
import Box from "@mui/material/Box";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import BotonEnlace from "@/components/BotonEnlace";
import type { ParametrosComerciales } from "../calculo";
import EditorMenu, { type LineaMenuExistente, type MenuExistente, type RecetaDisponible } from "./EditorMenu";

export default async function PaginaEditorMenu({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idMenu = Number(id);

  if (!Number.isInteger(idMenu)) {
    notFound();
  }

  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol === "Jefe de Compras") {
    redirect("/backoffice");
  }

  const puedeEditarComposicion = usuarioActual?.rol === "Chef Principal";
  const puedeEditarCoeficiente =
    usuarioActual?.rol === "Gerente Comercial" || usuarioActual?.rol === "Administrador";

  const supabase = await createClient();

  const [
    { data: menu, error: errorMenu },
    { data: lineas },
    { data: recetas },
    { data: parametros },
  ] = await Promise.all([
    supabase
      .from("menu")
      .select("id_menu, nombre_menu, descripcion, pax_minimo, coeficiente_venta, estado")
      .eq("id_menu", idMenu)
      .single<MenuExistente>(),
    supabase
      .from("menu_receta")
      .select("id_menu_receta, id_receta, tipo_plato, porciones_por_pax, orden")
      .eq("id_menu", idMenu)
      .order("orden")
      .returns<LineaMenuExistente[]>(),
    supabase
      .from("receta")
      .select("id_receta, nombre_plato, costo_por_porcion")
      .eq("estado", "ACTIVA")
      .not("costo_por_porcion", "is", null)
      .order("nombre_plato")
      .returns<RecetaDisponible[]>(),
    supabase
      .from("parametro_sistema")
      .select("clave, valor")
      .in("clave", ["GASTOS_GENERALES_PCT", "IVA_PORCENTAJE", "REDONDEO_PRECIO_FINAL"]),
  ]);

  if (errorMenu || !menu) {
    notFound();
  }

  const mapaParametros = new Map((parametros ?? []).map((p) => [p.clave, Number(p.valor)]));
  const parametrosComerciales: ParametrosComerciales = {
    gastosGeneralesPct: mapaParametros.get("GASTOS_GENERALES_PCT") ?? 0,
    ivaPorcentaje: mapaParametros.get("IVA_PORCENTAJE") ?? 0,
    redondeoPrecioFinal: mapaParametros.get("REDONDEO_PRECIO_FINAL") ?? 1,
  };

  return (
    <>
      <EncabezadoPagina titulo="Armar menú" subtitulo={menu.nombre_menu} />
      <Box sx={{ p: 4 }}>
        <BotonEnlace href="/backoffice/menus" sx={{ mb: 2 }}>
          ← Menús
        </BotonEnlace>
        <EditorMenu
          menu={menu}
          lineasIniciales={lineas ?? []}
          recetasDisponibles={recetas ?? []}
          parametrosComerciales={parametrosComerciales}
          puedeEditarComposicion={puedeEditarComposicion}
          puedeEditarCoeficiente={puedeEditarCoeficiente}
        />
      </Box>
    </>
  );
}
