import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { createClient } from "@/lib/supabase/server";
import { formatoFechaCorta, fechaLocalDesdeISO } from "@/lib/formato";
import TarjetaEstadistica from "./TarjetaEstadistica";
import { ETIQUETA_ESTADO, COLOR_ESTADO, type EstadoEvento } from "../eventos/mapeo";

const MAX_EVENTOS_EN_DASHBOARD = 5;

interface EventoProximo {
  id_evento: number;
  estado: EstadoEvento;
  cotizacion: { tipo_evento: string; nombre_cliente: string; fecha_evento: string; cantidad_pax: number };
}

interface InsumoPendiente {
  estado: string;
  evento: { estado: EstadoEvento };
}

export default async function DashboardAdministrador() {
  const supabase = await createClient();

  const [
    { count: recetasActivas },
    { count: menusActivos },
    { count: eventosActivos },
    { count: presupuestosActivos },
    { data: eventosProximos },
    { data: insumosEventos },
  ] = await Promise.all([
    supabase.from("receta").select("*", { count: "exact", head: true }).eq("estado", "ACTIVA"),
    supabase.from("menu").select("*", { count: "exact", head: true }).eq("estado", true),
    supabase.from("evento").select("*", { count: "exact", head: true }).neq("estado", "FINALIZADO"),
    supabase
      .from("cotizacion")
      .select("*", { count: "exact", head: true })
      .in("estado", ["SOLICITADO", "EN_NEGOCIACION"]),
    supabase
      .from("evento")
      .select("id_evento, estado, cotizacion:id_cotizacion ( tipo_evento, nombre_cliente, fecha_evento, cantidad_pax )")
      .not("estado", "in", "(FINALIZADO,CANCELADO)")
      .returns<EventoProximo[]>(),
    supabase
      .from("evento_insumo")
      .select("estado, evento:id_evento ( estado )")
      .neq("estado", "COMPRADO")
      .returns<InsumoPendiente[]>(),
  ]);

  const comprasPendientes = (insumosEventos ?? []).filter(
    (i) => i.evento.estado !== "FINALIZADO" && i.evento.estado !== "CANCELADO",
  ).length;

  const proximosEventos = [...(eventosProximos ?? [])]
    .sort(
      (a, b) =>
        fechaLocalDesdeISO(a.cotizacion.fecha_evento).getTime() -
        fechaLocalDesdeISO(b.cotizacion.fecha_evento).getTime(),
    )
    .slice(0, MAX_EVENTOS_EN_DASHBOARD);

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
          gap: 2,
        }}
      >
        <TarjetaEstadistica
          etiqueta="Recetas"
          valor={recetasActivas ?? 0}
          icono={RestaurantOutlinedIcon}
          href="/backoffice/recetas"
          sx={{ minWidth: 0 }}
        />
        <TarjetaEstadistica
          etiqueta="Menús"
          valor={menusActivos ?? 0}
          icono={DescriptionOutlinedIcon}
          href="/backoffice/menus"
          sx={{ minWidth: 0 }}
        />
        <TarjetaEstadistica
          etiqueta="Eventos"
          valor={eventosActivos ?? 0}
          icono={EventOutlinedIcon}
          href="/backoffice/eventos"
          sx={{ minWidth: 0 }}
        />
        <TarjetaEstadistica
          etiqueta="Presupuestos"
          valor={presupuestosActivos ?? 0}
          icono={MailOutlineOutlinedIcon}
          href="/backoffice/cotizaciones"
          sx={{ minWidth: 0 }}
        />
        <TarjetaEstadistica
          etiqueta="Compras Pendientes"
          valor={comprasPendientes}
          icono={ShoppingCartOutlinedIcon}
          href="/backoffice/compras"
          sx={{ minWidth: 0 }}
        />
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Próximos eventos
          </Typography>
          <Link href="/backoffice/eventos" style={{ textDecoration: "none" }}>
            <Typography variant="body2" sx={{ color: "primary.main" }}>
              Ver todos los eventos →
            </Typography>
          </Link>
        </Stack>
        {proximosEventos.length === 0 ? (
          <Typography color="text.secondary">No hay eventos próximos.</Typography>
        ) : (
          <List dense>
            {proximosEventos.map((evento) => {
              const color = COLOR_ESTADO[evento.estado];
              return (
                <Link
                  key={evento.id_evento}
                  href={`/backoffice/eventos/${evento.id_evento}`}
                  style={{ color: "inherit", textDecoration: "none", display: "block" }}
                >
                  <ListItem
                    disableGutters
                    secondaryAction={
                      <Chip
                        label={ETIQUETA_ESTADO[evento.estado]}
                        size="small"
                        sx={{ bgcolor: color.bg, color: color.fg, fontWeight: 600 }}
                      />
                    }
                  >
                    <ListItemText
                      primary={`${evento.cotizacion.tipo_evento} · ${evento.cotizacion.nombre_cliente}`}
                      secondary={`${formatoFechaCorta.format(fechaLocalDesdeISO(evento.cotizacion.fecha_evento))} · ${evento.cotizacion.cantidad_pax} comensales`}
                    />
                  </ListItem>
                </Link>
              );
            })}
          </List>
        )}
      </Paper>
    </Stack>
  );
}
