import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import FormularioInsumo, { type InsumoEditable } from "../FormularioInsumo";

export default async function PaginaEditarInsumo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Ayudante de compras" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice/insumos");
  }

  const supabase = await createClient();

  const [{ data: insumo }, { data: categorias }, { data: unidades }, { data: proveedores }] = await Promise.all([
    supabase
      .from("materia_prima")
      .select(
        `id_materia_prima, nombre, costo_unitario, precio_bulto, cantidad_bulto, densidad_g_ml, estado, ultima_actualizacion,
         id_categoria, id_unidad_compra, id_proveedor,
         categoria:id_categoria ( nombre ),
         unidad_compra:id_unidad_compra ( simbolo, magnitud, factor_a_base ),
         proveedor:id_proveedor ( razon_social )`,
      )
      .eq("id_materia_prima", id)
      .maybeSingle(),
    supabase.from("categoria_insumo").select("id_categoria, nombre").eq("activa", true).order("nombre"),
    supabase
      .from("unidad_medida")
      .select("id_unidad, nombre, simbolo, magnitud, factor_a_base, es_unidad_base")
      .eq("activa", true)
      .order("nombre"),
    supabase.from("proveedor").select("id_proveedor, razon_social").eq("activo", true).order("razon_social"),
  ]);

  if (!insumo) notFound();

  return (
    <FormularioInsumo
      modo={insumo as unknown as InsumoEditable}
      categorias={categorias ?? []}
      unidades={unidades ?? []}
      proveedores={proveedores ?? []}
    />
  );
}
