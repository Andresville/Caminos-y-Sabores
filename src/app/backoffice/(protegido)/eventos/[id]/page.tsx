import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import DetalleEvento, { type EventoDetalle, type LineaCotizacion, type RecetaDeMenu, type InsumoEvento } from "./DetalleEvento";

export default async function PaginaDetalleEvento({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: evento, error: errorEvento } = await supabase
    .from("evento")
    .select(
      `id_evento, descripcion, estado, id_cotizacion,
       cotizacion:id_cotizacion (
         tipo_evento, nombre_cliente, email_cliente, telefono_cliente, direccion_evento,
         fecha_evento, cantidad_pax, subtotal_neto, monto_iva, monto_total
       )`,
    )
    .eq("id_evento", idEvento)
    .single<EventoDetalle>();

  if (errorEvento || !evento) {
    notFound();
  }

  const [{ data: lineas }, { data: insumosEvento }] = await Promise.all([
    supabase
      .from("cotizacion_detalle")
      .select("id_detalle, tipo_item, referencia_id, descripcion, cantidad, subtotal")
      .eq("id_cotizacion", evento.id_cotizacion)
      .order("orden")
      .returns<LineaCotizacion[]>(),
    supabase
      .from("evento_insumo")
      .select(
        "id_evento_insumo, cantidad_necesaria, costo_estimado, estado, orden, materia_prima:id_materia_prima ( nombre, unidad_compra:id_unidad_compra ( simbolo ) )",
      )
      .eq("id_evento", idEvento)
      .order("orden")
      .returns<InsumoEvento[]>(),
  ]);

  const idsMenu = [...new Set((lineas ?? []).filter((l) => l.tipo_item === "MENU").map((l) => l.referencia_id))];

  const { data: menuRecetas } =
    idsMenu.length > 0
      ? await supabase
          .from("menu_receta")
          .select("id_menu, receta:id_receta ( nombre_plato )")
          .in("id_menu", idsMenu)
          .returns<RecetaDeMenu[]>()
      : { data: [] as RecetaDeMenu[] };

  return (
    <DetalleEvento
      evento={evento}
      lineas={lineas ?? []}
      menuRecetas={menuRecetas ?? []}
      insumosEvento={insumosEvento ?? []}
    />
  );
}
