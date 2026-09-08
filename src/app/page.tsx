import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import BarraPortal from "@/components/portal/BarraPortal";
import BotonEnlace from "@/components/BotonEnlace";
import { formatoMoneda } from "@/lib/formato";
import { obtenerMenusPublicos, obtenerParametrosPortal, obtenerServiciosPublicos } from "@/lib/cotizador/datos";

// Catálogo público (menús, precios, adicionales): tiene que reflejar
// lo que se edita en el backoffice sin esperar un nuevo build.
export const dynamic = "force-dynamic";

export default async function PaginaLanding() {
  const parametros = await obtenerParametrosPortal();
  const [menus, servicios] = await Promise.all([
    obtenerMenusPublicos(parametros),
    obtenerServiciosPublicos(parametros),
  ]);

  return (
    <>
      <BarraPortal />

      <Box sx={{ bgcolor: "background.default", py: { xs: 6, sm: 10 }, textAlign: "center" }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: "1.9rem", sm: "2.75rem" } }}>
            Presupuestá tu evento en minutos
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>
            Elegí el menú, sumale los servicios que quieras y obtené el precio final al instante.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center" }}>
            <BotonEnlace href="/cotizar" variant="contained" size="large">
              Comenzar cotización
            </BotonEnlace>
            <BotonEnlace href="#menus" variant="outlined" size="large">
              Ver nuestros menús
            </BotonEnlace>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Sin registro previo · Presupuesto válido {parametros.validezCotizacionDias} días · Descarga en PDF
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" id="menus" sx={{ py: { xs: 5, sm: 8 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          Nuestros menús
        </Typography>
        {menus.length === 0 ? (
          <Typography color="text.secondary">Todavía no hay menús publicados.</Typography>
        ) : (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ flexWrap: "wrap" }}>
            {menus.map((menu) => (
              <Paper
                key={menu.idMenu}
                variant="outlined"
                sx={{ p: 3, flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {menu.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {menu.composicion.join(" + ")}
                </Typography>
                {menu.descripcion && (
                  <Typography variant="body2" color="text.secondary">
                    {menu.descripcion}
                  </Typography>
                )}
                <Typography variant="h5" color="primary" sx={{ fontWeight: 800, mt: 1 }}>
                  {formatoMoneda.format(menu.precioPorPersona)}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {" "}
                    / persona
                  </Typography>
                </Typography>
                <BotonEnlace href={`/cotizar?menu=${menu.idMenu}`} variant="outlined" sx={{ mt: 1, alignSelf: "flex-start" }}>
                  Cotizar
                </BotonEnlace>
              </Paper>
            ))}
          </Stack>
        )}
      </Container>

      <Box sx={{ bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }} id="servicios">
        <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 8 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
            Servicios adicionales disponibles
          </Typography>
          {servicios.length === 0 ? (
            <Typography color="text.secondary">Todavía no hay servicios adicionales publicados.</Typography>
          ) : (
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
              {servicios.map((servicio) => (
                <Paper key={servicio.idAdicional} variant="outlined" sx={{ p: 2, minWidth: 220, flex: "1 1 220px" }}>
                  <Typography sx={{ fontWeight: 700 }}>{servicio.nombre}</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                    <Typography color="primary" sx={{ fontWeight: 700 }}>
                      {formatoMoneda.format(servicio.precioUnitario)}
                    </Typography>
                    <Chip
                      label={servicio.tipoCobro === "FIJO" ? "Precio fijo" : "Por persona"}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Container>
      </Box>

      <Box component="footer" id="contacto" sx={{ bgcolor: "#1E2733", color: "common.white", py: 4 }}>
        <Container maxWidth="lg">
          <Typography sx={{ fontWeight: 700 }}>Caminos y Sabores</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Catering y Eventos. Iniciá tu cotización desde este sitio y nuestro equipo comercial se pone en
            contacto por los datos que nos dejes en el presupuesto.
          </Typography>
        </Container>
      </Box>
    </>
  );
}
