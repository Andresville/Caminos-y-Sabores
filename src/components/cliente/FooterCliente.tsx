import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";

const redes = [
  { icono: InstagramIcon, href: "https://instagram.com", etiqueta: "Instagram" },
  { icono: FacebookIcon, href: "https://facebook.com", etiqueta: "Facebook" },
  { icono: LinkedInIcon, href: "https://linkedin.com", etiqueta: "LinkedIn" },
];

export default function FooterCliente() {
  return (
    <Box component="footer" sx={{ bgcolor: paletaCliente.fondoFooter, borderTop: `1px solid ${paletaCliente.borde}` }}>
      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3 }, py: 6 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "2fr 1fr 1fr" },
            gap: 4,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: paletaCliente.primario,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontFamily: fuenteEncabezados,
                }}
              >
                S
              </Box>
              <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 600, color: paletaCliente.textoOscuro }}>
                Sabores &amp; Eventos
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario, maxWidth: 360 }}>
              Creamos experiencias gastronómicas memorables para tus eventos corporativos y celebraciones
              íntimas. Alta cocina con calidez de hogar.
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 600, color: paletaCliente.textoOscuro, mb: 1.5 }}>
              Contacto
            </Typography>
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <PhoneOutlinedIcon sx={{ fontSize: 18, color: paletaCliente.primario }} />
                <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario }}>
                  +54 11 4872-9100
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <EmailOutlinedIcon sx={{ fontSize: 18, color: paletaCliente.primario }} />
                <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario }}>
                  contacto@saboreseventos.com
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <PlaceOutlinedIcon sx={{ fontSize: 18, color: paletaCliente.primario, mt: 0.2 }} />
                <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario }}>
                  Av. del Libertador 4200, Palermo, CABA
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Box>
            <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 600, color: paletaCliente.textoOscuro, mb: 1.5 }}>
              Seguinos
            </Typography>
            <Stack direction="row" spacing={1.5}>
              {redes.map((red) => (
                <Link
                  key={red.etiqueta}
                  href={red.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={red.etiqueta}
                  style={{ textDecoration: "none" }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      bgcolor: paletaCliente.fondoClaro,
                      border: `1px solid ${paletaCliente.borde}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: paletaCliente.primario,
                    }}
                  >
                    <red.icono sx={{ fontSize: 18 }} />
                  </Box>
                </Link>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box sx={{ borderTop: `1px solid ${paletaCliente.borde}` }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            maxWidth: 1280,
            mx: "auto",
            px: { xs: 2, sm: 3 },
            py: 2,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="caption" sx={{ color: paletaCliente.textoTerciario }}>
            © {new Date().getFullYear()} Sabores &amp; Eventos. Todos los derechos reservados.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Typography variant="caption" sx={{ color: paletaCliente.textoTerciario, cursor: "pointer" }}>
              Políticas de Privacidad
            </Typography>
            <Typography variant="caption" sx={{ color: paletaCliente.textoTerciario, cursor: "pointer" }}>
              Términos del Servicio
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
