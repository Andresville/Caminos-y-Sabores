import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatoFecha, formatoMoneda } from "@/lib/formato";

export interface LineaInsumoPdf {
  nombre: string;
  cantidad: number;
  unidad: string;
  costoEstimado: number;
  estado: string;
}

export interface DatosPdfEvento {
  nombreEvento: string;
  nombreCliente: string;
  direccionEvento: string | null;
  fechaEvento: string;
  cantidadPax: number;
  descripcion: string | null;
  menus: string[];
  insumos: LineaInsumoPdf[];
  costoProduccion: number;
  costosAdicionales: number;
  montoIva: number;
  montoTotal: number;
}

const estilos = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#2B3138" },
  encabezado: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  marca: { fontSize: 16, fontWeight: 700, color: "#2F6FB5" },
  tituloDoc: { fontSize: 11, color: "#6E767E", marginTop: 4 },
  datosEvento: { marginBottom: 16, gap: 2 },
  filaDato: { flexDirection: "row", gap: 4 },
  etiquetaDato: { color: "#6E767E", width: 140 },
  seccion: { marginTop: 16 },
  tituloSeccion: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  tabla: { marginTop: 4 },
  filaTabla: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#DDE1E5", paddingVertical: 6 },
  filaEncabezadoTabla: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#2B3138",
    paddingBottom: 6,
    fontWeight: 700,
  },
  colDescripcion: { flex: 3 },
  colCantidad: { flex: 1.4, textAlign: "right" },
  colCosto: { flex: 1.4, textAlign: "right" },
  colEstado: { flex: 1.2, textAlign: "right" },
  totales: { marginTop: 16, alignItems: "flex-end", gap: 3 },
  filaTotal: { flexDirection: "row", gap: 12 },
  totalFinal: { fontSize: 14, fontWeight: 700, color: "#2F6FB5", marginTop: 4 },
});

/** Documento del evento: datos del evento y su lista de compra. Solo repite datos ya calculados, nunca recalcula nada. */
export default function DocumentoEvento({ datos }: { datos: DatosPdfEvento }) {
  return (
    <Document>
      <Page size="A4" style={estilos.page}>
        <View style={estilos.encabezado}>
          <View>
            <Text style={estilos.marca}>Sabores & Eventos</Text>
            <Text>Catering y Eventos</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontWeight: 700 }}>{datos.nombreEvento}</Text>
            <Text style={estilos.tituloDoc}>{formatoFecha.format(new Date(datos.fechaEvento))}</Text>
          </View>
        </View>

        <View style={estilos.datosEvento}>
          <View style={estilos.filaDato}>
            <Text style={estilos.etiquetaDato}>Cliente</Text>
            <Text>{datos.nombreCliente}</Text>
          </View>
          <View style={estilos.filaDato}>
            <Text style={estilos.etiquetaDato}>Comensales</Text>
            <Text>{datos.cantidadPax}</Text>
          </View>
          {datos.direccionEvento && (
            <View style={estilos.filaDato}>
              <Text style={estilos.etiquetaDato}>Dirección</Text>
              <Text>{datos.direccionEvento}</Text>
            </View>
          )}
          {datos.descripcion && (
            <View style={estilos.filaDato}>
              <Text style={estilos.etiquetaDato}>Descripción</Text>
              <Text>{datos.descripcion}</Text>
            </View>
          )}
          {datos.menus.length > 0 && (
            <View style={estilos.filaDato}>
              <Text style={estilos.etiquetaDato}>Menú(s) / recetas</Text>
              <Text>{datos.menus.join(", ")}</Text>
            </View>
          )}
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Lista de compra</Text>
          <View style={estilos.tabla}>
            <View style={estilos.filaEncabezadoTabla}>
              <Text style={estilos.colDescripcion}>Insumo</Text>
              <Text style={estilos.colCantidad}>Cantidad</Text>
              <Text style={estilos.colCosto}>Costo estimado</Text>
              <Text style={estilos.colEstado}>Estado</Text>
            </View>
            {datos.insumos.map((linea, indice) => (
              <View key={indice} style={estilos.filaTabla}>
                <Text style={estilos.colDescripcion}>{linea.nombre}</Text>
                <Text style={estilos.colCantidad}>
                  {linea.cantidad} {linea.unidad}
                </Text>
                <Text style={estilos.colCosto}>{formatoMoneda.format(linea.costoEstimado)}</Text>
                <Text style={estilos.colEstado}>{linea.estado}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={estilos.totales}>
          <View style={estilos.filaTotal}>
            <Text>Costo producción</Text>
            <Text>{formatoMoneda.format(datos.costoProduccion)}</Text>
          </View>
          <View style={estilos.filaTotal}>
            <Text>Costos adicionales</Text>
            <Text>{formatoMoneda.format(datos.costosAdicionales)}</Text>
          </View>
          <View style={estilos.filaTotal}>
            <Text>IVA</Text>
            <Text>{formatoMoneda.format(datos.montoIva)}</Text>
          </View>
          <Text style={estilos.totalFinal}>PRECIO FINAL: {formatoMoneda.format(datos.montoTotal)}</Text>
        </View>
      </Page>
    </Document>
  );
}
