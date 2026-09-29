import { notFound } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import IcecreamOutlinedIcon from "@mui/icons-material/IcecreamOutlined";
import TapasOutlinedIcon from "@mui/icons-material/TapasOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import SelectorCantidadCarrito from "@/components/cliente/SelectorCantidadCarrito";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { IMAGEN_PLACEHOLDER } from "@/lib/cliente-portal/imagenes";
import { obtenerMenusPublicos } from "@/lib/cotizador/datos";

const ETIQUETA_TIPO_PLATO: Record<string, string> = {
  ENTRADA: "Entrada",
  PRINCIPAL: "Plato principal",
  POSTRE: "Postre",
  MESA_DULCE: "Mesa dulce",
  RECEPCION: "Recepción",
};

const ICONO_TIPO_PLATO: Record<string, typeof RestaurantOutlinedIcon> = {
  ENTRADA: RestaurantMenuOutlinedIcon,
  PRINCIPAL: RestaurantOutlinedIcon,
  POSTRE: CakeOutlinedIcon,
  MESA_DULCE: IcecreamOutlinedIcon,
  RECEPCION: TapasOutlinedIcon,
};

export const dynamic = "force-dynamic";

export default async function PaginaDetalleMenu({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idMenu = Number(id);
  if (!Number.isInteger(idMenu)) notFound();

  const menus = await obtenerMenusPublicos();
  const menu = menus.find((m) => m.idMenu === idMenu);
  if (!menu) notFound();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente />
      <Box component="main" sx={{ flex: 1, maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3 }, py: 4, width: "100%" }}>
        <Typography variant="body2" sx={{ color: paletaCliente.textoMuted, mb: 2 }}>
          <Link href="/" style={{ color: "inherit" }}>
            Catálogo
          </Link>{" "}
          › {menu.nombre}
        </Typography>

        <Box
          sx={{
            height: { xs: 220, sm: 340 },
            borderRadius: 4,
            mb: 4,
            backgroundImage: `url(${menu.imagenBannerUrl ?? IMAGEN_PLACEHOLDER})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            bgcolor: paletaCliente.fondoClaro,
          }}
        />

        <Stack direction={{ xs: "column", lg: "row" }} spacing={4}>
          <Box sx={{ flex: 2 }}>
            <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: { xs: "1.7rem", sm: "2rem" }, color: paletaCliente.textoOscuro, mb: 1.5 }}>
              {menu.nombre}
            </Typography>
            {menu.descripcion && (
              <Typography sx={{ color: paletaCliente.textoSecundario, mb: 3 }}>{menu.descripcion}</Typography>
            )}

            <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, color: paletaCliente.textoOscuro, mb: 1.5 }}>
              Qué incluye este servicio
            </Typography>
            <Stack divider={<Box sx={{ borderBottom: `1px solid ${paletaCliente.borde}` }} />} spacing={2.5}>
              {menu.composicion.map((plato, indice) => {
                const Icono = ICONO_TIPO_PLATO[plato.tipoPlato] ?? RestaurantOutlinedIcon;
                return (
                  <Stack key={indice} direction="row" spacing={2}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: "50%",
                        bgcolor: paletaCliente.fondoClaro,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: paletaCliente.primario,
                      }}
                    >
                      <Icono sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: paletaCliente.primario, letterSpacing: 0.5 }}
                      >
                        {ETIQUETA_TIPO_PLATO[plato.tipoPlato] ?? plato.tipoPlato}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: paletaCliente.textoOscuro }}>
                        {plato.nombrePlato}
                      </Typography>
                      {plato.descripcionPublica && (
                        <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario }}>
                          {plato.descripcionPublica}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Paper
              variant="outlined"
              sx={{ p: 3, borderColor: paletaCliente.borde, position: "sticky", top: 88, borderRadius: 4 }}
            >
              <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, color: paletaCliente.textoOscuro, mb: 2 }}>
                Características del servicio
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", bgcolor: paletaCliente.fondoClaro, borderRadius: 3, p: 2, mb: 3 }}>
                <GroupsOutlinedIcon sx={{ color: paletaCliente.primario }} />
                <Box>
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: paletaCliente.primario, letterSpacing: 0.5 }}>
                    COMENSALES MÍNIMOS
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>
                    {menu.paxMinimo} personas
                  </Typography>
                </Box>
              </Stack>

              <SelectorCantidadCarrito
                tipoItem="MENU"
                idReferencia={menu.idMenu}
                nombre={menu.nombre}
                imagenUrl={menu.imagenChicaUrl}
                etiquetaCantidad="Cantidad de menús"
                cantidadMinima={menu.paxMinimo}
              />
            </Paper>
          </Box>
        </Stack>
      </Box>
      <FooterCliente />
    </Box>
  );
}
