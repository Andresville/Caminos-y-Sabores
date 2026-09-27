import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormularioLogin from "./FormularioLogin";

export default function PaginaLogin() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 6,
        background: `
          radial-gradient(circle at 15% 20%, rgba(140, 84, 50, 0.35), transparent 40%),
          radial-gradient(circle at 85% 12%, rgba(100, 56, 34, 0.3), transparent 45%),
          radial-gradient(circle at 20% 88%, rgba(80, 46, 32, 0.35), transparent 40%),
          radial-gradient(circle at 90% 82%, rgba(110, 64, 40, 0.3), transparent 45%),
          #1c130f
        `,
      }}
    >
      <FormularioLogin />
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", mt: 4, textAlign: "center" }}>
        © {new Date().getFullYear()} Sabores y Eventos S.L. • Todos los derechos reservados.
      </Typography>
    </Box>
  );
}
