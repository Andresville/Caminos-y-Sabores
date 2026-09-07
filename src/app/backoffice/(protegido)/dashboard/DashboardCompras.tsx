import Decimal from "decimal.js";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { createClient } from "@/lib/supabase/server";
import { costearLinea } from "@/domain/costeo";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { insumoDominio, unidadDominio } from "../recetas/mapeo";
import type { InsumoCatalogo, UnidadCatalogo } from "../recetas/mapeo";
import TarjetaEstadistica from "./TarjetaEstadistica";

interface InsumoFila extends InsumoCatalogo {
  existencia_actual: number;
  ultima_actualizacion: string;
}

interface LineaActiva {
  id_materia_prima: number;
  cantidad_usada: number;
  id_unidad_receta: number;
  porcentaje_merma: number;
}

interface CambioPrecio {
  id_historico: number;
  costo_anterior: number;
  costo_nuevo: number;
  fecha_cambio: string;
  materia_prima: { nombre: string } | null;
}

function estaDesactualizado(fechaIso: string, diasAlerta: number): boolean {
  const dias = (Date.now() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24);
  return dias > diasAlerta;
}

export default async function DashboardCompras() {
  const supabase = await createClient();

  const [
    { data: insumos },
    { data: unidades },
    { data: lineasActivas },
    { data: parametro },
    { data: historial },
  ] = await Promise.all([
    supabase
      .from("materia_prima")
      .select(
        "id_materia_prima, nombre, costo_unitario, densidad_g_ml, id_unidad_compra, existencia_actual, ultima_actualizacion",
      )
      .eq("estado", true)
      .returns<InsumoFila[]>(),
    supabase
      .from("unidad_medida")
      .select("id_unidad, nombre, simbolo, magnitud, factor_a_base")
      .eq("activa", true)
      .returns<UnidadCatalogo[]>(),
    supabase
      .from("receta_materia_prima")
      .select("id_materia_prima, cantidad_usada, id_unidad_receta, porcentaje_merma, receta:id_receta!inner(estado)")
      .eq("receta.estado", "ACTIVA")
      .returns<LineaActiva[]>(),
    supabase.from("parametro_sistema").select("valor").eq("clave", "DIAS_ALERTA_PRECIO").single(),
    supabase
      .from("historico_precio_mp")
      .select("id_historico, costo_anterior, costo_nuevo, fecha_cambio, materia_prima:id_materia_prima(nombre)")
      .order("fecha_cambio", { ascending: false })
      .limit(5)
      .returns<CambioPrecio[]>(),
  ]);

  const listaInsumos = insumos ?? [];
  const listaUnidades = unidades ?? [];
  const insumosPorId = new Map(listaInsumos.map((i) => [i.id_materia_prima, i]));

  // Cantidad necesaria (en unidad de compra de cada insumo) para cubrir
  // todas las recetas activas que lo usan, sumando línea a línea con el
  // mismo motor de costeo que usa el editor de recetas.
  const necesarioPorInsumo = new Map<number, Decimal>();

  for (const linea of lineasActivas ?? []) {
    const insumoFila = insumosPorId.get(linea.id_materia_prima);
    const unidadReceta = listaUnidades.find((u) => u.id_unidad === linea.id_unidad_receta);
    const insumo = insumoFila ? insumoDominio(insumoFila, listaUnidades) : null;
    if (!insumo || !unidadReceta) continue;

    try {
      const { cantidadBruta } = costearLinea({
        insumo,
        cantidadUsada: new Decimal(linea.cantidad_usada),
        unidadReceta: unidadDominio(unidadReceta),
        porcentajeMerma: new Decimal(linea.porcentaje_merma),
      });
      const necesarioCompra = cantidadBruta.dividedBy(insumo.unidadCompra.factorABase);
      const acumulado = necesarioPorInsumo.get(linea.id_materia_prima) ?? new Decimal(0);
      necesarioPorInsumo.set(linea.id_materia_prima, acumulado.plus(necesarioCompra));
    } catch {
      // Dato inconsistente en una línea puntual: no debe tirar abajo el resto del panel.
      continue;
    }
  }

  const insumosStockBajo = listaInsumos
    .map((insumo) => {
      const necesario = necesarioPorInsumo.get(insumo.id_materia_prima);
      if (!necesario || necesario.lte(0)) return null;

      const existencia = new Decimal(insumo.existencia_actual);
      if (existencia.gte(necesario.times(1.1))) return null;

      const unidadCompra = listaUnidades.find((u) => u.id_unidad === insumo.id_unidad_compra);
      return {
        nombre: insumo.nombre,
        existencia,
        necesario,
        simbolo: unidadCompra?.simbolo ?? "",
      };
    })
    .filter((fila): fila is NonNullable<typeof fila> => fila !== null)
    .sort((a, b) => a.existencia.dividedBy(a.necesario).comparedTo(b.existencia.dividedBy(b.necesario)));

  const diasAlerta = parametro ? Number(parametro.valor) : 30;
  const desactualizados = listaInsumos.filter((i) => estaDesactualizado(i.ultima_actualizacion, diasAlerta)).length;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
        <TarjetaEstadistica etiqueta="Insumos activos" valor={listaInsumos.length} />
        <TarjetaEstadistica
          etiqueta="Precios desactualizados"
          valor={desactualizados}
          severidad={desactualizados > 0 ? "warning" : "neutro"}
        />
        <TarjetaEstadistica
          etiqueta="Alertas de stock bajo"
          valor={insumosStockBajo.length}
          severidad={insumosStockBajo.length > 0 ? "error" : "neutro"}
        />
      </Stack>

      {insumosStockBajo.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Stock por debajo de lo necesario
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Insumos cuya existencia actual no llega a cubrir, con un 10% de margen, lo que requieren las
            recetas activas que los usan.
          </Typography>
          <List dense>
            {insumosStockBajo.map((fila) => (
              <ListItem key={fila.nombre} disableGutters>
                <ListItemText
                  primary={fila.nombre}
                  secondary={`Existencia: ${fila.existencia.toFixed(2)} ${fila.simbolo} · Necesario: ${fila.necesario.toFixed(2)} ${fila.simbolo}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Últimos cambios de precio
        </Typography>
        {(historial ?? []).length === 0 ? (
          <Typography color="text.secondary">Todavía no hay cambios registrados.</Typography>
        ) : (
          <List dense>
            {(historial ?? []).map((cambio) => (
              <ListItem key={cambio.id_historico} disableGutters>
                <ListItemText
                  primary={cambio.materia_prima?.nombre ?? "—"}
                  secondary={`${formatoMoneda.format(cambio.costo_anterior)} → ${formatoMoneda.format(cambio.costo_nuevo)} · ${formatoFecha.format(new Date(cambio.fecha_cambio))}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Stack>
  );
}
