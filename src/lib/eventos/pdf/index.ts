import { renderToBuffer } from "@react-pdf/renderer";
import DocumentoEvento, { type DatosPdfEvento } from "./DocumentoEvento";

export type { DatosPdfEvento, LineaInsumoPdf } from "./DocumentoEvento";

export async function renderizarPdfEvento(datos: DatosPdfEvento): Promise<Buffer> {
  return renderToBuffer(DocumentoEvento({ datos }));
}
