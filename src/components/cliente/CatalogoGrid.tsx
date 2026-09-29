"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { IMAGEN_PLACEHOLDER } from "@/lib/cliente-portal/imagenes";
import type { MenuPublico, PlatoPublico } from "@/lib/cotizador/datos";

type Categoria = "menus" | "platos";

export default function CatalogoGrid({
  menus,
  platos,
}: {
  menus: MenuPublico[];
  platos: PlatoPublico[];
}) {
  const [categoria, setCategoria] = useState<Categoria>("menus");

  const chips: { valor: Categoria; etiqueta: string }[] = [
    { valor: "menus", etiqueta: "Menús" },
    { valor: "platos", etiqueta: "Platos" },
  ];

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3 }, py: 6 }}>
      <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", mb: 5 }}>
        {chips.map((chip) => (
          <Button
            key={chip.valor}
            onClick={() => setCategoria(chip.valor)}
            variant={categoria === chip.valor ? "contained" : "outlined"}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              bgcolor: categoria === chip.valor ? paletaCliente.primario : "white",
              borderColor: paletaCliente.bordeInput,
              color: categoria === chip.valor ? "white" : paletaCliente.textoSecundario,
              "&:hover": {
                bgcolor: categoria === chip.valor ? paletaCliente.primarioOscuro : "white",
                borderColor: paletaCliente.primario,
              },
            }}
          >
            {chip.etiqueta}
          </Button>
        ))}
      </Stack>

      {categoria === "menus" && (
        <Grid vacio={menus.length === 0} textoVacio="Todavía no hay menús publicados.">
          {menus.map((menu) => (
            <TarjetaCatalogo
              key={menu.idMenu}
              href={`/menu/${menu.idMenu}`}
              nombre={menu.nombre}
              descripcion={menu.composicion.map((plato) => plato.nombrePlato).join(" + ") || menu.descripcion}
              imagenUrl={menu.imagenChicaUrl}
            />
          ))}
        </Grid>
      )}

      {categoria === "platos" && (
        <Grid vacio={platos.length === 0} textoVacio="Todavía no hay platos publicados sueltos.">
          {platos.map((plato) => (
            <TarjetaCatalogo
              key={plato.idReceta}
              href={`/plato/${plato.idReceta}`}
              nombre={plato.nombre}
              descripcion={plato.descripcion}
              imagenUrl={plato.imagenChicaUrl}
            />
          ))}
        </Grid>
      )}
    </Box>
  );
}

function Grid({ vacio, textoVacio, children }: { vacio: boolean; textoVacio: string; children: React.ReactNode }) {
  if (vacio) {
    return (
      <Typography sx={{ color: paletaCliente.textoTerciario, textAlign: "center", py: 6 }}>{textoVacio}</Typography>
    );
  }
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
        gap: 3,
      }}
    >
      {children}
    </Box>
  );
}

function TarjetaCatalogo({
  href,
  nombre,
  descripcion,
  imagenUrl,
}: {
  href: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Box
        sx={{
          bgcolor: "white",
          border: `1px solid ${paletaCliente.borde}`,
          borderRadius: 4,
          overflow: "hidden",
          transition: "box-shadow 0.2s",
          "&:hover": { boxShadow: 3 },
        }}
      >
        <Box
          sx={{
            height: 200,
            bgcolor: paletaCliente.fondoClaro,
            backgroundImage: `url(${imagenUrl ?? IMAGEN_PLACEHOLDER})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Box sx={{ p: 2.5 }}>
          <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 600, color: paletaCliente.textoOscuro, mb: 0.5 }}>
            {nombre}
          </Typography>
          {descripcion && (
            <Typography
              variant="body2"
              sx={{
                color: paletaCliente.textoTerciario,
                mb: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {descripcion}
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", color: paletaCliente.primario, fontWeight: 700 }}
          >
            <Typography sx={{ fontWeight: 700, color: "inherit" }}>Consultar servicio</Typography>
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </Stack>
        </Box>
      </Box>
    </Link>
  );
}
