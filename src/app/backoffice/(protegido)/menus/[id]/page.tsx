import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import FormularioMenu, { type LineaExistente, type MenuEditable, type RecetaDisponible } from "../FormularioMenu";

export default async function PaginaEditorMenu({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idMenu = Number(id);

  if (!Number.isInteger(idMenu)) {
    notFound();
  }

  const usuarioActual = await obtenerUsuarioActual();
  const puedeEditar = usuarioActual?.rol === "Ayudante de cocina" || usuarioActual?.rol === "Administrador";

  const supabase = await createClient();

  const [{ data: menu, error: errorMenu }, { data: lineas }, { data: recetas }, { data: coeficienteVentaDefectoRpc }] =
    await Promise.all([
      supabase
        .from("menu")
        .select("id_menu, nombre_menu, descripcion, pax_minimo, imagen_chica_url, imagen_banner_url, estado")
        .eq("id_menu", idMenu)
        .single<MenuEditable>(),
      supabase
        .from("menu_receta")
        .select("id_menu_receta, id_receta, tipo_plato, orden")
        .eq("id_menu", idMenu)
        .order("orden")
        .returns<LineaExistente[]>(),
      // Trae también las inactivas: si el menú ya incluía una receta que después se desactivó (p. ej. en cascada al desactivar un insumo), tiene que poder seguir mostrándola (no se borra sola).
      supabase
        .from("receta")
        .select("id_receta, nombre_plato, cantidad_porciones, costo_por_porcion, coeficiente_venta, estado")
        .order("nombre_plato")
        .returns<RecetaDisponible[]>(),
      supabase.rpc("obtener_coeficiente_venta_defecto"),
    ]);

  if (errorMenu || !menu) {
    notFound();
  }

  const coeficienteVentaDefecto = typeof coeficienteVentaDefectoRpc === "number" ? coeficienteVentaDefectoRpc : 1;

  return (
    <FormularioMenu
      modo={menu}
      lineasIniciales={lineas ?? []}
      recetasDisponibles={recetas ?? []}
      coeficienteVentaDefecto={coeficienteVentaDefecto}
      puedeEditar={puedeEditar}
    />
  );
}
