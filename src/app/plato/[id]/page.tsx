import { notFound } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import SelectorCantidadCarrito from "@/components/cliente/SelectorCantidadCarrito";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { IMAGEN_PLACEHOLDER } from "@/lib/cliente-portal/imagenes";
import { obtenerIngredientesPublicosReceta, obtenerParametrosPortal, obtenerPlatosPublicos } from "@/lib/cotizador/datos";

export const dynamic = "force-dynamic";

export default async function PaginaDetallePlato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idReceta = Number(id);
  if (!Number.isInteger(idReceta)) notFound();

  const parametros = await obtenerParametrosPortal();
  const platos = await obtenerPlatosPublicos(parametros);
  const plato = platos.find((p) => p.idReceta === idReceta);
  if (!plato) notFound();

  const ingredientes = await obtenerIngredientesPublicosReceta(idReceta);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente />
      <Box component="main" sx={{ flex: 1, maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3 }, py: 4, width: "100%" }}>
        <Typography variant="body2" sx={{ color: paletaCliente.textoMuted, mb: 2 }}>
          <Link href="/" style={{ color: "inherit" }}>
            Catálogo
          </Link>{" "}
          › Platos › {plato.nombre}
        </Typography>

        <Box
          sx={{
            height: { xs: 220, sm: 340 },
            borderRadius: 4,
            mb: 4,
            backgroundImage: `url(${plato.imagenUrl ?? IMAGEN_PLACEHOLDER})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            bgcolor: paletaCliente.fondoClaro,
          }}
        />

        <Stack direction={{ xs: "column", lg: "row" }} spacing={4}>
          <Box sx={{ flex: 2 }}>
            <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: { xs: "1.7rem", sm: "2rem" }, color: paletaCliente.textoOscuro, mb: 1.5 }}>
              {plato.nombre}
            </Typography>
            {plato.descripcion && (
              <Typography sx={{ color: paletaCliente.textoSecundario, mb: 3 }}>{plato.descripcion}</Typography>
            )}

            {ingredientes.length > 0 && (
              <>
                <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, color: paletaCliente.textoOscuro, mb: 1.5 }}>
                  Detalle del plato
                </Typography>
                <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro, mb: 1.5 }}>
                  Ingredientes principales
                </Typography>
                <Stack divider={<Box sx={{ borderBottom: `1px solid ${paletaCliente.borde}` }} />} spacing={1.5}>
                  {ingredientes.map((ingrediente, indice) => (
                    <Stack key={indice} direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          borderRadius: "50%",
                          bgcolor: paletaCliente.fondoClaro,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: paletaCliente.primario,
                        }}
                      >
                        <RestaurantOutlinedIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>
                        {ingrediente.nombre}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Paper
              variant="outlined"
              sx={{ p: 3, borderColor: paletaCliente.borde, position: "sticky", top: 88, borderRadius: 4 }}
            >
              <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, color: paletaCliente.textoOscuro, mb: 2 }}>
                Características del plato
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", bgcolor: paletaCliente.fondoClaro, borderRadius: 3, p: 2, mb: 3 }}>
                <GroupsOutlinedIcon sx={{ color: paletaCliente.primario }} />
                <Box>
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: paletaCliente.primario, letterSpacing: 0.5 }}>
                    RINDE
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>
                    {plato.cantidadPorciones} personas
                  </Typography>
                </Box>
              </Stack>

              <SelectorCantidadCarrito
                tipoItem="RECETA"
                idReferencia={plato.idReceta}
                nombre={plato.nombre}
                imagenUrl={plato.imagenUrl}
                etiquetaCantidad="Cantidad de platos"
                cantidadMinima={plato.cantidadPorciones}
              />
            </Paper>
          </Box>
        </Stack>
      </Box>
      <FooterCliente />
    </Box>
  );
}
