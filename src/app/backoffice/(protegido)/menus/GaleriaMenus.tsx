"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import IconButton from "@mui/material/IconButton";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";

const COLOR_ACCION = "#219653";
const COLOR_EDITAR = "#C2652F";

export interface FilaMenu {
  id_menu: number;
  nombre_menu: string;
  descripcion: string | null;
  pax_minimo: number;
  imagen_chica_url: string | null;
  estado: boolean;
  nombres_recetas: string[];
}

export default function GaleriaMenus({ menus }: { menus: FilaMenu[] }) {
  const { rol } = useUsuarioActual();
  const puedeEscribir = rol === "Cocina" || rol === "Administrador";
  const [busqueda, setBusqueda] = useState("");

  const menusFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return menus;
    return menus.filter((menu) => menu.nombre_menu.toLowerCase().includes(termino));
  }, [menus, busqueda]);

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          Menú
        </Typography>
        {puedeEscribir && (
          <Link href="/backoffice/menus/nuevo" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
            >
              + Nuevo menú
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

      {menusFiltrados.length === 0 ? (
        <Typography color="text.secondary">No hay menús que coincidan con la búsqueda.</Typography>
      ) : (
        <Grid container spacing={3}>
          {menusFiltrados.map((menu) => (
            <Grid key={menu.id_menu} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <Box sx={{ position: "relative" }}>
                  <CardMedia
                    component="div"
                    sx={{
                      height: 160,
                      bgcolor: "background.default",
                      backgroundImage: menu.imagen_chica_url ? `url(${menu.imagen_chica_url})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <Chip
                    label={menu.estado ? "Activo" : "Inactivo"}
                    size="small"
                    sx={
                      menu.estado
                        ? { position: "absolute", top: 8, left: 8, bgcolor: "#E3F7EA", color: COLOR_ACCION, fontWeight: 700 }
                        : { position: "absolute", top: 8, left: 8, bgcolor: "#EDEDED", color: "#616161", fontWeight: 700 }
                    }
                  />
                  {puedeEscribir && (
                    <Link href={`/backoffice/menus/${menu.id_menu}`} style={{ position: "absolute", top: 8, right: 8 }}>
                      <IconButton size="small" sx={{ bgcolor: "white", boxShadow: 1, "&:hover": { bgcolor: "white" } }}>
                        <EditOutlinedIcon fontSize="small" sx={{ color: COLOR_EDITAR }} />
                      </IconButton>
                    </Link>
                  )}
                  <Chip
                    label={`Mín. ${menu.pax_minimo} pers.`}
                    size="small"
                    sx={{ position: "absolute", bottom: 8, left: 8, bgcolor: COLOR_ACCION, color: "white", fontWeight: 700 }}
                  />
                  <Chip
                    label={`${menu.nombres_recetas.length} receta${menu.nombres_recetas.length === 1 ? "" : "s"}`}
                    size="small"
                    sx={{ position: "absolute", bottom: 8, right: 8, bgcolor: "white", fontWeight: 700 }}
                  />
                </Box>
                <CardContent>
                  <Typography sx={{ fontWeight: 700 }} noWrap>
                    {menu.nombre_menu}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {menu.descripcion ?? ""}
                  </Typography>
                  <Stack component="ul" sx={{ pl: 2.5, mt: 1, mb: 0 }}>
                    {menu.nombres_recetas.map((nombre, indice) => (
                      <Typography key={indice} component="li" variant="body2" color="text.secondary">
                        {nombre}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
