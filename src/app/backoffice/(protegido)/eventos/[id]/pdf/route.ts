import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import { renderizarPdfEvento } from "@/lib/eventos/pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idEvento = Number(id);

  if (!Number.isInteger(idEvento)) {
    return new Response("Evento inválido", { status: 404 });
  }

  // Este Route Handler no hereda la protección del layout (protegido) —
  // valida el rol acá mismo, igual que cualquier page.tsx del backoffice.
  const usuarioActual = await obtenerUsuarioActual();
  if (usuarioActual?.rol !== "Asistente Comercial" && usuarioActual?.rol !== "Administrador") {
    return new Response("No autorizado", { status: 403 });
  }

  const supabase = await createClient();

  const { data: evento, error: errorEvento } = await supabase
    .from("evento")
    .select(
      "id_evento, descripcion, id_cotizacion, cotizacion:id_cotizacion ( tipo_evento, nombre_cliente, direccion_evento, fecha_evento, cantidad_pax, monto_iva, monto_total )",
    )
    .eq("id_evento", idEvento)
    .single<{
      id_evento: number;
      descripcion: string | null;
      id_cotizacion: number;
      cotizacion: {
        tipo_evento: string;
        nombre_cliente: string;
        direccion_evento: string | null;
        fecha_evento: string;
        cantidad_pax: number;
        monto_iva: number;
        monto_total: number;
      };
    }>();

  if (errorEvento || !evento) {
    return new Response("Evento no encontrado", { status: 404 });
  }

  const [{ data: lineas }, { data: insumosEvento }] = await Promise.all([
    supabase
      .from("cotizacion_detalle")
      .select("tipo_item, descripcion, subtotal")
      .eq("id_cotizacion", evento.id_cotizacion)
      .order("orden")
      .returns<{ tipo_item: string; descripcion: string; subtotal: number }[]>(),
    supabase
      .from("evento_insumo")
      .select(
        "cantidad_necesaria, costo_estimado, estado, orden, materia_prima:id_materia_prima ( nombre, unidad_compra:id_unidad_compra ( simbolo ) )",
      )
      .eq("id_evento", idEvento)
      .order("orden")
      .returns<
        {
          cantidad_necesaria: number;
          costo_estimado: number;
          estado: string;
          materia_prima: { nombre: string; unidad_compra: { simbolo: string } };
        }[]
      >(),
  ]);

  if (!insumosEvento || insumosEvento.length === 0) {
    return new Response("Este evento todavía no tiene una lista de compra generada", { status: 404 });
  }

  const todasLasLineas = lineas ?? [];
  const costoProduccion = todasLasLineas
    .filter((l) => l.tipo_item === "MENU" || l.tipo_item === "RECETA")
    .reduce((acumulado, l) => acumulado + l.subtotal, 0);
  const costosAdicionales = todasLasLineas
    .filter((l) => l.tipo_item === "ADICIONAL")
    .reduce((acumulado, l) => acumulado + l.subtotal, 0);
  const menus = todasLasLineas.filter((l) => l.tipo_item === "MENU" || l.tipo_item === "RECETA").map((l) => l.descripcion);

  const etiquetaEstadoInsumo: Record<string, string> = {
    PENDIENTE: "Pendiente",
    EN_CAMINO: "En camino",
    COMPRADO: "Comprado",
  };

  const pdf = await renderizarPdfEvento({
    nombreEvento: evento.cotizacion.tipo_evento,
    nombreCliente: evento.cotizacion.nombre_cliente,
    direccionEvento: evento.cotizacion.direccion_evento,
    fechaEvento: evento.cotizacion.fecha_evento,
    cantidadPax: evento.cotizacion.cantidad_pax,
    descripcion: evento.descripcion,
    menus,
    insumos: insumosEvento.map((i) => ({
      nombre: i.materia_prima.nombre,
      cantidad: i.cantidad_necesaria,
      unidad: i.materia_prima.unidad_compra.simbolo,
      costoEstimado: i.costo_estimado,
      estado: etiquetaEstadoInsumo[i.estado] ?? i.estado,
    })),
    costoProduccion,
    costosAdicionales,
    montoIva: evento.cotizacion.monto_iva,
    montoTotal: evento.cotizacion.monto_total,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="evento-${idEvento}.pdf"`,
    },
  });
}
