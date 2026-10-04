"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { margenSobreCosto, precioNeto } from "@/domain/costeo";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { formatoMoneda } from "@/lib/formato";

const COLOR_ACCION = "#219653";

export interface FilaReceta {
  id_receta: number;
  nombre_plato: string;
  imagen_chica_url: string | null;
  costo_por_porcion: number | null;
  cantidad_porciones: number;
  coeficiente_venta: number | null;
  estado: "BORRADOR" | "ACTIVA" | "INACTIVA";
}

const etiquetaEstado: Record<FilaReceta["estado"], string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activo",
  INACTIVA: "Inactivo",
};

const colorEstado: Record<FilaReceta["estado"], "warning" | "success" | "default"> = {
  BORRADOR: "warning",
  ACTIVA: "success",
  INACTIVA: "default",
};

export default function GaleriaRecetas({
  recetas,
  coeficienteVentaDefecto,
}: {
  recetas: FilaReceta[];
  coeficienteVentaDefecto: number;
}) {
  const { rol } = useUsuarioActual();
  const puedeEscribir = rol === "Ayudante de cocina" || rol === "Administrador";
  const [busqueda, setBusqueda] = useState("");

  const recetasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return recetas;
    return recetas.filter((receta) => receta.nombre_plato.toLowerCase().includes(termino));
  }, [recetas, busqueda]);

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          Recetas
        </Typography>
        {puedeEscribir && (
          <Link href="/backoffice/recetas/nueva" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
            >
              + Nueva receta
            </Button>
          </Link>
        )}
      </Stack>

      <TextField
        placeholder="Buscar por nombre..."
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 3, maxWidth: 420 }}
      />

      {recetasFiltradas.length === 0 ? (
        <Typography color="text.secondary">No hay recetas que coincidan con la búsqueda.</Typography>
      ) : (
        <Grid container spacing={3}>
          {recetasFiltradas.map((receta) => {
            const coeficiente = receta.coeficiente_venta ?? coeficienteVentaDefecto;
            const margenPct = margenSobreCosto(new Decimal(coeficiente)).times(100);
            const precioVenta =
              receta.costo_por_porcion != null
                ? precioNeto(new Decimal(receta.costo_por_porcion), new Decimal(coeficiente))
                : null;

            return (
              <Grid key={receta.id_receta} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card variant="outlined">
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 160,
                        bgcolor: "background.default",
                        backgroundImage: receta.imagen_chica_url ? `url(${receta.imagen_chica_url})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <Chip
                      label={etiquetaEstado[receta.estado]}
                      color={colorEstado[receta.estado]}
                      size="small"
                      sx={{ position: "absolute", top: 8, left: 8, fontWeight: 700 }}
                    />
                    {puedeEscribir && (
                      <Link href={`/backoffice/recetas/${receta.id_receta}`}>
                        <Box
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            bgcolor: "white",
                            borderRadius: "50%",
                            width: 32,
                            height: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: 1,
                          }}
                        >
                          <EditOutlinedIcon fontSize="small" sx={{ color: "#C2652F" }} />
                        </Box>
                      </Link>
                    )}
                  </Box>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700 }} noWrap>
                      {receta.nombre_plato}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {precioVenta != null ? formatoMoneda.format(precioVenta.toNumber()) : "—"} por plato
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Min. {receta.cantidad_porciones} pers. · Margen {margenPct.toFixed(0)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}
