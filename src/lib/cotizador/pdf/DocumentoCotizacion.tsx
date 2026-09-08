import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatoFecha, formatoMoneda } from "@/lib/formato";

export interface LineaPdf {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DatosPdfCotizacion {
  codigo: string;
  fechaEmision: string;
  fechaValidez: string;
  nombreCliente: string;
  tipoEvento: string;
  cantidadPax: number;
  lineas: LineaPdf[];
  subtotalNeto: number;
  montoIva: number;
  montoTotal: number;
}

const estilos = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#2B3138" },
  encabezado: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  marca: { fontSize: 16, fontWeight: 700, color: "#2F6FB5" },
  codigo: { fontSize: 11, color: "#6E767E", marginTop: 4 },
  datosEvento: { marginBottom: 16, gap: 2 },
  filaDato: { flexDirection: "row", gap: 4 },
  etiquetaDato: { color: "#6E767E", width: 140 },
  tabla: { marginTop: 8 },
  filaTabla: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#DDE1E5", paddingVertical: 6 },
  filaEncabezadoTabla: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#2B3138",
    paddingBottom: 6,
    fontWeight: 700,
  },
  colDescripcion: { flex: 3 },
  colCantidad: { flex: 1, textAlign: "right" },
  colUnitario: { flex: 1.4, textAlign: "right" },
  colSubtotal: { flex: 1.4, textAlign: "right" },
  totales: { marginTop: 16, alignItems: "flex-end", gap: 3 },
  filaTotal: { flexDirection: "row", gap: 12 },
  totalFinal: { fontSize: 14, fontWeight: 700, color: "#2F6FB5", marginTop: 4 },
  pie: { marginTop: 24, fontSize: 8, color: "#6E767E" },
});

/** Documento del presupuesto emitido. Solo repite datos ya congelados al momento de la emisión — nunca recalcula nada. */
export default function DocumentoCotizacion({ datos }: { datos: DatosPdfCotizacion }) {
  return (
    <Document>
      <Page size="A4" style={estilos.page}>
        <View style={estilos.encabezado}>
          <View>
            <Text style={estilos.marca}>Caminos y Sabores</Text>
            <Text>Catering y Eventos</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontWeight: 700 }}>Presupuesto {datos.codigo}</Text>
            <Text style={estilos.codigo}>Emitido el {formatoFecha.format(new Date(datos.fechaEmision))}</Text>
            <Text style={estilos.codigo}>Válido hasta el {formatoFecha.format(new Date(datos.fechaValidez))}</Text>
          </View>
        </View>

        <View style={estilos.datosEvento}>
          <View style={estilos.filaDato}>
            <Text style={estilos.etiquetaDato}>Cliente</Text>
            <Text>{datos.nombreCliente}</Text>
          </View>
          <View style={estilos.filaDato}>
            <Text style={estilos.etiquetaDato}>Tipo de evento</Text>
            <Text>{datos.tipoEvento}</Text>
          </View>
          <View style={estilos.filaDato}>
            <Text style={estilos.etiquetaDato}>Cantidad de invitados</Text>
            <Text>{datos.cantidadPax}</Text>
          </View>
        </View>

        <View style={estilos.tabla}>
          <View style={estilos.filaEncabezadoTabla}>
            <Text style={estilos.colDescripcion}>Concepto</Text>
            <Text style={estilos.colCantidad}>Cant.</Text>
            <Text style={estilos.colUnitario}>Unitario</Text>
            <Text style={estilos.colSubtotal}>Subtotal</Text>
          </View>
          {datos.lineas.map((linea, indice) => (
            <View key={indice} style={estilos.filaTabla}>
              <Text style={estilos.colDescripcion}>{linea.descripcion}</Text>
              <Text style={estilos.colCantidad}>{linea.cantidad}</Text>
              <Text style={estilos.colUnitario}>{formatoMoneda.format(linea.precioUnitario)}</Text>
              <Text style={estilos.colSubtotal}>{formatoMoneda.format(linea.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={estilos.totales}>
          <View style={estilos.filaTotal}>
            <Text>Subtotal neto</Text>
            <Text>{formatoMoneda.format(datos.subtotalNeto)}</Text>
          </View>
          <View style={estilos.filaTotal}>
            <Text>IVA</Text>
            <Text>{formatoMoneda.format(datos.montoIva)}</Text>
          </View>
          <Text style={estilos.totalFinal}>TOTAL: {formatoMoneda.format(datos.montoTotal)}</Text>
        </View>

        <Text style={estilos.pie}>
          Los precios de este documento quedaron congelados al momento de la emisión y no se modifican aunque
          cambien los precios vigentes en el catálogo.
        </Text>
      </Page>
    </Document>
  );
}
