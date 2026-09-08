import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BotonEnlace from "@/components/BotonEnlace";

/**
 * Header público. En /cotizar no hay secciones para anclar, así que
 * los links de navegación se ocultan, y tampoco se repite el botón de
 * "Cotizar mi evento" (ya está ahí adentro). "Consultar mi
 * presupuesto" siempre se muestra: es la forma de volver a ver una
 * cotización ya emitida sin necesidad de cuenta, solo con el código.
 */
export default function BarraPortal({
  mostrarNavegacion = true,
  mostrarCta = true,
}: {
  mostrarNavegacion?: boolean;
  mostrarCta?: boolean;
}) {
  return (
    <Box
      component="header"
      sx={{
        bgcolor: "#1E2733",
        color: "common.white",
        px: { xs: 2, sm: 4 },
        py: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
          Caminos y Sabores
        </Link>
      </Typography>

      {mostrarNavegacion && (
        <Stack direction="row" spacing={3} sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
          <a href="#menus" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>
            Menús
          </a>
          <a href="#servicios" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>
            Servicios
          </a>
          <a href="#contacto" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>
            Contacto
          </a>
        </Stack>
      )}

      <Link
        href="/cotizacion"
        style={{ color: "inherit", textDecoration: "none", opacity: 0.85, fontSize: 14 }}
      >
        Consultar mi presupuesto
      </Link>

      {mostrarCta && (
        <BotonEnlace href="/cotizar" variant="contained" color="primary" sx={{ fontWeight: 700 }}>
          Cotizar mi evento
        </BotonEnlace>
      )}
    </Box>
  );
}
