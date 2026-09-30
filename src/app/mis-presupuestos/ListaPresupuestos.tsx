"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { fechaLocalDesdeISO, formatoFechaCorta } from "@/lib/formato";

export interface FilaPresupuesto {
  idCotizacion: number;
  nombreEvento: string;
  fechaEvento: string;
  cantidadPax: number;
  cantidadItems: number;
  estado: string;
  fechaValidez: string;
}

const ETIQUETAS_ESTADO: Record<string, { texto: string; color: "info" | "warning" | "success" | "error" | "default" }> = {
  SOLICITADO: { texto: "Solicitado", color: "warning" },
  APROBADO: { texto: "Aceptado", color: "success" },
  EN_NEGOCIACION: { texto: "En negociación con nuestro equipo", color: "warning" },
  FINALIZADO: { texto: "Finalizado", color: "success" },
  CANCELADO: { texto: "Cancelado", color: "error" },
  RECHAZADA: { texto: "Rechazado", color: "error" },
  VENCIDA: { texto: "Vencido", color: "default" },
};

type Filtro = "todos" | "solicitados" | "aceptados" | "rechazados";

const CATEGORIA_ESTADO: Record<string, Exclude<Filtro, "todos">> = {
  SOLICITADO: "solicitados",
  APROBADO: "aceptados",
  EN_NEGOCIACION: "aceptados",
  FINALIZADO: "aceptados",
  CANCELADO: "rechazados",
  RECHAZADA: "rechazados",
  VENCIDA: "rechazados",
};

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "solicitados", etiqueta: "Solicitados" },
  { valor: "aceptados", etiqueta: "Aceptados" },
  { valor: "rechazados", etiqueta: "Rechazados" },
];

export default function ListaPresupuestos({ filas }: { filas: FilaPresupuesto[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filasFiltradas = filas.filter((fila) => filtro === "todos" || CATEGORIA_ESTADO[fila.estado] === filtro);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: "wrap" }}>
        {FILTROS.map((opcion) => (
          <Button
            key={opcion.valor}
            onClick={() => setFiltro(opcion.valor)}
            variant={filtro === opcion.valor ? "contained" : "outlined"}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              bgcolor: filtro === opcion.valor ? paletaCliente.primario : "white",
              borderColor: paletaCliente.bordeInput,
              color: filtro === opcion.valor ? "white" : paletaCliente.textoSecundario,
              "&:hover": {
                bgcolor: filtro === opcion.valor ? paletaCliente.primarioOscuro : "white",
                borderColor: paletaCliente.primario,
              },
            }}
          >
            {opcion.etiqueta}
          </Button>
        ))}
      </Stack>

      {filasFiltradas.length === 0 ? (
        <Typography sx={{ color: paletaCliente.textoTerciario, textAlign: "center", py: 6 }}>
          No hay presupuestos en esta categoría.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {filasFiltradas.map((fila) => {
            const badge = ETIQUETAS_ESTADO[fila.estado] ?? { texto: fila.estado, color: "default" as const };
            return (
              <Link key={fila.idCotizacion} href={`/mis-presupuestos/${fila.idCotizacion}`} style={{ textDecoration: "none" }}>
                <Box
                  sx={{
                    bgcolor: "white",
                    border: `1px solid ${paletaCliente.borde}`,
                    borderRadius: 3,
                    p: 2.5,
                    "&:hover": { boxShadow: 2 },
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                    <Box>
                      <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 600, color: paletaCliente.textoOscuro, mb: 0.5 }}>
                        {fila.nombreEvento}
                      </Typography>
                      <Stack direction="row" spacing={2.5} sx={{ flexWrap: "wrap", color: paletaCliente.textoTerciario }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />
                          <Typography variant="body2">{formatoFechaCorta.format(fechaLocalDesdeISO(fila.fechaEvento))}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          <GroupsOutlinedIcon sx={{ fontSize: 16 }} />
                          <Typography variant="body2">{fila.cantidadPax} comensales</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          <Inventory2OutlinedIcon sx={{ fontSize: 16 }} />
                          <Typography variant="body2">{fila.cantidadItems} ítems</Typography>
                        </Stack>
                      </Stack>
                    </Box>
                    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                      <Chip label={badge.texto} color={badge.color} size="small" sx={{ mb: 0.5 }} />
                      <Typography variant="caption" sx={{ display: "block", color: paletaCliente.textoTerciario }}>
                        Válido hasta {formatoFechaCorta.format(fechaLocalDesdeISO(fila.fechaValidez))}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Link>
            );
          })}
        </Stack>
      )}
    </>
  );
}
