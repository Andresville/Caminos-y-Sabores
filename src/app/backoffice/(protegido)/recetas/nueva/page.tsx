import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import FormularioReceta from "../FormularioReceta";
import type { InsumoCatalogo, UnidadCatalogo } from "../mapeo";

export default async function PaginaNuevaReceta() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Ayudante de cocina" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice/recetas");
  }

  const supabase = await createClient();

  const [{ data: insumos }, { data: unidades }] = await Promise.all([
    supabase
      .from("materia_prima")
      .select("id_materia_prima, nombre, costo_unitario, densidad_g_ml, id_unidad_compra, estado")
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

  return (
    <FormularioReceta
      modo="nuevo"
      lineasIniciales={[]}
      insumos={insumos ?? []}
      unidades={unidades ?? []}
      puedeEditarComposicion
      puedeEditarMargen={false}
    />
  );
}
