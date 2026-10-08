import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import VistaClientes, { type FilaCliente, type EventoCliente } from "./VistaClientes";
import type { EstadoEvento } from "../eventos/mapeo";

interface ClienteDb {
  id_cliente: string;
  nombre_completo: string;
  email: string;
  telefono: string | null;
  estado: boolean;
  creado_en: string;
}

interface CotizacionConEvento {
  id_cliente: string;
  estado: string;
  tipo_evento: string;
  fecha_evento: string;
  cantidad_pax: number;
  evento: { id_evento: number; estado: EstadoEvento } | null;
}

const ESTADOS_COTIZACION_EN_CURSO = ["SOLICITADO", "EN_NEGOCIACION"];
const ESTADOS_EVENTO_TERMINADO: EstadoEvento[] = ["FINALIZADO", "CANCELADO"];

export default async function PaginaClientes() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Asistente Comercial" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: clientes, error }, { data: cotizaciones }] = await Promise.all([
    supabase
      .from("cliente")
      .select("id_cliente, nombre_completo, email, telefono, estado, creado_en")
      .returns<ClienteDb[]>(),
    supabase
      .from("cotizacion")
      .select("id_cliente, estado, tipo_evento, fecha_evento, cantidad_pax, evento:evento ( id_evento, estado )")
      .not("id_cliente", "is", null)
      .returns<CotizacionConEvento[]>(),
  ]);

  const cotizacionesPorCliente = new Map<string, CotizacionConEvento[]>();
  for (const cotizacion of cotizaciones ?? []) {
    const actual = cotizacionesPorCliente.get(cotizacion.id_cliente) ?? [];
    actual.push(cotizacion);
    cotizacionesPorCliente.set(cotizacion.id_cliente, actual);
  }

  const filas: FilaCliente[] = (clientes ?? [])
    .map((cliente) => {
      const cotizacionesDelCliente = cotizacionesPorCliente.get(cliente.id_cliente) ?? [];

      const eventos: EventoCliente[] = cotizacionesDelCliente
        .filter((c) => c.evento !== null)
        .map((c) => ({
          id_evento: c.evento!.id_evento,
          estado: c.evento!.estado,
          tipo_evento: c.tipo_evento,
          fecha_evento: c.fecha_evento,
          cantidad_pax: c.cantidad_pax,
        }))
        .sort((a, b) => new Date(b.fecha_evento).getTime() - new Date(a.fecha_evento).getTime());

      const tieneEventoPendiente = eventos.some((e) => !ESTADOS_EVENTO_TERMINADO.includes(e.estado));
      const tieneCotizacionEnCurso = cotizacionesDelCliente.some((c) => ESTADOS_COTIZACION_EN_CURSO.includes(c.estado));
      const tienePendiente = tieneEventoPendiente || tieneCotizacionEnCurso;

      return {
        id_cliente: cliente.id_cliente,
        nombre_completo: cliente.nombre_completo,
        email: cliente.email,
        telefono: cliente.telefono,
        estado: tienePendiente ? true : cliente.estado,
        creado_en: cliente.creado_en,
        eventos,
        ultimoEvento: eventos[0]?.fecha_evento ?? null,
      };
    })
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

  return (
    <Box sx={{ p: 4 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          No se pudo cargar el listado: {error.message}
        </Typography>
      )}
      <VistaClientes clientes={filas} />
    </Box>
  );
}
