import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import CatalogoGrid from "@/components/cliente/CatalogoGrid";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { IMAGEN_HERO } from "@/lib/cliente-portal/imagenes";
import { obtenerMenusPublicos, obtenerParametrosPortal, obtenerPlatosPublicos } from "@/lib/cotizador/datos";

// Catálogo público: tiene que reflejar lo que se edita en el backoffice sin esperar un nuevo build.
export const dynamic = "force-dynamic";

export default async function PaginaInicio() {
  const parametros = await obtenerParametrosPortal();
  const [menus, platos] = await Promise.all([
    obtenerMenusPublicos(),
    obtenerPlatosPublicos(parametros),
  ]);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente activo="inicio" />

      <Box
        sx={{
          position: "relative",
          height: { xs: 288, sm: 384 },
          backgroundImage: `url(${IMAGEN_HERO})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.55)" }} />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            px: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: fuenteEncabezados,
              fontWeight: 700,
              color: "white",
              fontSize: { xs: "1.9rem", sm: "2.75rem" },
              mb: 1.5,
            }}
          >
            Nuestros Servicios Gastronómicos
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.85)", maxWidth: 560 }}>
            Catering personalizado para cada ocasión. Calidad artesanal y frescura garantizada para convertir
            tu encuentro en un recuerdo inolvidable.
          </Typography>
        </Box>
      </Box>

      <Box component="main" sx={{ flex: 1 }}>
        <CatalogoGrid menus={menus} platos={platos} />

        <Box sx={{ bgcolor: paletaCliente.fondoClaro, borderTop: `1px solid ${paletaCliente.borde}`, borderBottom: `1px solid ${paletaCliente.borde}` }}>
          <Stack
            spacing={2}
            sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, sm: 3 }, py: 6, alignItems: "center", textAlign: "center" }}
          >
            <EmojiEventsOutlinedIcon sx={{ color: paletaCliente.primario, fontSize: 32 }} />
            <Typography
              sx={{
                fontFamily: fuenteEncabezados,
                fontStyle: "italic",
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: paletaCliente.textoSecundario,
              }}
            >
              &ldquo;Más de 10 años creando experiencias gastronómicas inolvidables, adaptando cada propuesta
              culinaria al espíritu único de su celebración.&rdquo;
            </Typography>
          </Stack>
        </Box>
      </Box>

      <FooterCliente />
    </Box>
  );
}
