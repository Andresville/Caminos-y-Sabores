import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import FormularioInsumo from "../FormularioInsumo";

export default async function PaginaNuevoInsumo() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice/insumos");
  }

  const supabase = await createClient();

  const [{ data: categorias }, { data: unidades }, { data: proveedores }] = await Promise.all([
    supabase.from("categoria_insumo").select("id_categoria, nombre").eq("activa", true).order("nombre"),
    supabase
      .from("unidad_medida")
      .select("id_unidad, nombre, simbolo, magnitud, factor_a_base, es_unidad_base")
      .eq("activa", true)
      .order("nombre"),
    supabase.from("proveedor").select("id_proveedor, razon_social").eq("activo", true).order("razon_social"),
  ]);

  return (
    <FormularioInsumo
      modo="nuevo"
      categorias={categorias ?? []}
      unidades={unidades ?? []}
      proveedores={proveedores ?? []}
    />
  );
}
