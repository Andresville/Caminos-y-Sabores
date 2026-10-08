import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import DetalleCompra, { type CompraDetalle, type InsumoCompra } from "./DetalleCompra";

export default async function PaginaDetalleCompra({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idEvento = Number(id);

  if (!Number.isInteger(idEvento)) {
    notFound();
  }

  const usuarioActual = await obtenerUsuarioActual();
  if (usuarioActual?.rol !== "Asistente Comercial" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: evento, error: errorEvento }, { data: insumos }] = await Promise.all([
    supabase
      .from("evento")
      .select("id_evento, cotizacion:id_cotizacion ( tipo_evento, fecha_evento )")
      .eq("id_evento", idEvento)
      .single<CompraDetalle>(),
    supabase
      .from("evento_insumo")
      .select(
        "id_evento_insumo, cantidad_necesaria, costo_estimado, estado, orden, materia_prima:id_materia_prima ( nombre, unidad_compra:id_unidad_compra ( simbolo ) )",
      )
      .eq("id_evento", idEvento)
      .order("orden")
      .returns<InsumoCompra[]>(),
  ]);

  if (errorEvento || !evento || !insumos || insumos.length === 0) {
    notFound();
  }

  return <DetalleCompra evento={evento} insumos={insumos} />;
}
