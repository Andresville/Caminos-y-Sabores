import { NextResponse } from "next/server";
import { obtenerCotizacionPorCodigo } from "@/lib/cotizador/consulta";
import { renderizarPdfCotizacion } from "@/lib/cotizador/pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const cotizacion = await obtenerCotizacionPorCodigo(codigo);

  if (!cotizacion) {
    return NextResponse.json({ error: "No encontramos una cotización con ese código." }, { status: 404 });
  }

  const pdf = await renderizarPdfCotizacion({
    codigo: cotizacion.codigo,
    fechaEmision: cotizacion.fechaEmision,
    fechaValidez: cotizacion.fechaValidez,
    nombreCliente: cotizacion.nombreCliente,
    tipoEvento: cotizacion.tipoEvento,
    cantidadPax: cotizacion.cantidadPax,
    lineas: cotizacion.lineas,
    subtotalNeto: cotizacion.subtotalNeto,
    montoIva: cotizacion.montoIva,
    montoTotal: cotizacion.montoTotal,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${cotizacion.codigo}.pdf"`,
    },
  });
}
