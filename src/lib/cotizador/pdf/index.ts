import { renderToBuffer } from "@react-pdf/renderer";
import DocumentoCotizacion, { type DatosPdfCotizacion } from "./DocumentoCotizacion";

export type { DatosPdfCotizacion, LineaPdf } from "./DocumentoCotizacion";

export async function renderizarPdfCotizacion(datos: DatosPdfCotizacion): Promise<Buffer> {
  return renderToBuffer(DocumentoCotizacion({ datos }));
}
