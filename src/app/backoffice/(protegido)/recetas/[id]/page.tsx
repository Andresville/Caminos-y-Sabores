import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import FormularioReceta, { type LineaExistente, type RecetaEditable } from "../FormularioReceta";
import type { InsumoCatalogo, UnidadCatalogo } from "../mapeo";

export default async function PaginaEditorReceta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idReceta = Number(id);

  if (!Number.isInteger(idReceta)) {
    notFound();
  }

  const supabase = await createClient();
  const usuarioActual = await obtenerUsuarioActual();
  const puedeEditarComposicion = usuarioActual?.rol === "Ayudante de cocina" || usuarioActual?.rol === "Administrador";
  const puedeEditarMargen = usuarioActual?.rol === "Asistente Comercial" || usuarioActual?.rol === "Administrador";

  const [{ data: receta, error: errorReceta }, { data: lineas }, { data: insumos }, { data: unidades }] =
    await Promise.all([
      supabase
        .from("receta")
        .select(
          "id_receta, nombre_plato, descripcion_publica, tipo_plato, cantidad_porciones, merma_pct, mano_obra_pct, imagen_chica_url, imagen_banner_url, estado, coeficiente_venta",
        )
        .eq("id_receta", idReceta)
        .single<RecetaEditable>(),
      supabase
        .from("receta_materia_prima")
        .select("id_detalle, id_materia_prima, cantidad_usada, id_unidad_receta, orden")
        .eq("id_receta", idReceta)
        .order("orden")
        .returns<LineaExistente[]>(),
      supabase
        .from("materia_prima")
        .select("id_materia_prima, nombre, costo_unitario, densidad_g_ml, id_unidad_compra")
        .eq("estado", true)
        .order("nombre")
        .returns<InsumoCatalogo[]>(),
      supabase
        .from("unidad_medida")
        .select("id_unidad, nombre, simbolo, magnitud, factor_a_base")
        .eq("activa", true)
        .order("nombre")
        .returns<UnidadCatalogo[]>(),
    ]);

  if (errorReceta || !receta) {
    notFound();
  }

  return (
    <FormularioReceta
      modo={receta}
      lineasIniciales={lineas ?? []}
      insumos={insumos ?? []}
      unidades={unidades ?? []}
      puedeEditarComposicion={puedeEditarComposicion}
      puedeEditarMargen={puedeEditarMargen}
    />
  );
}
