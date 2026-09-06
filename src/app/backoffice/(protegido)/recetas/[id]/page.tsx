import { notFound } from "next/navigation";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import BotonEnlace from "@/components/BotonEnlace";
import EditorReceta, { type LineaExistente, type RecetaExistente } from "./EditorReceta";
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
  const soloLectura = usuarioActual?.rol !== "Chef Principal";

  const [
    { data: receta, error: errorReceta },
    { data: lineas },
    { data: insumos },
    { data: unidades },
    { data: parametro },
  ] = await Promise.all([
    supabase
      .from("receta")
      .select(
        "id_receta, nombre_plato, tipo_plato, cantidad_porciones, estado, costo_total_calculado, costo_por_porcion, fecha_ultimo_calculo",
      )
      .eq("id_receta", idReceta)
      .single<RecetaExistente>(),
    supabase
      .from("receta_materia_prima")
      .select("id_detalle, id_materia_prima, cantidad_usada, id_unidad_receta, porcentaje_merma, orden")
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
    supabase.from("parametro_sistema").select("valor").eq("clave", "COEFICIENTE_VENTA_DEFECTO").single(),
  ]);

  if (errorReceta || !receta) {
    notFound();
  }

  const coeficienteVentaDefecto = parametro ? Number(parametro.valor) : null;

  return (
    <>
      <BotonEnlace href="/backoffice/recetas" sx={{ mb: 1 }}>
        ← Recetas
      </BotonEnlace>
      <Typography variant="h4" gutterBottom>
        Editor de receta
      </Typography>
      <EditorReceta
        receta={receta}
        lineasIniciales={lineas ?? []}
        insumos={insumos ?? []}
        unidades={unidades ?? []}
        coeficienteVentaDefecto={coeficienteVentaDefecto}
        soloLectura={soloLectura}
      />
    </>
  );
}
