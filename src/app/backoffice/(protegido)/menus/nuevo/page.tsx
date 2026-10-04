import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import FormularioMenu, { type RecetaDisponible } from "../FormularioMenu";

export default async function PaginaNuevoMenu() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Ayudante de cocina" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice/menus");
  }

  const supabase = await createClient();

  const [{ data: recetas }, { data: coeficienteVentaDefectoRpc }] = await Promise.all([
    supabase
      .from("receta")
      .select("id_receta, nombre_plato, cantidad_porciones, costo_por_porcion, coeficiente_venta, estado")
      .eq("estado", "ACTIVA")
      .order("nombre_plato")
      .returns<RecetaDisponible[]>(),
    supabase.rpc("obtener_coeficiente_venta_defecto"),
  ]);

  const coeficienteVentaDefecto = typeof coeficienteVentaDefectoRpc === "number" ? coeficienteVentaDefectoRpc : 1;

  return (
    <FormularioMenu
      modo="nuevo"
      lineasIniciales={[]}
      recetasDisponibles={recetas ?? []}
      coeficienteVentaDefecto={coeficienteVentaDefecto}
      puedeEditar
    />
  );
}
