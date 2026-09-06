import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormularioLogin from "./FormularioLogin";

export default function PaginaLogin() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          width: "45%",
          bgcolor: "#39424C",
          color: "common.white",
          px: 8,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          Caminos y Sabores
        </Typography>
        <Typography variant="h6" sx={{ color: "grey.400", mt: 1 }}>
          Catering &amp; Eventos
        </Typography>
        <Box sx={{ width: 64, height: 4, bgcolor: "primary.main", my: 3 }} />
        <Typography sx={{ color: "grey.300" }}>Panel de administración</Typography>
        <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
          Gestión de insumos, recetas, menús y cotizaciones.
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 2,
        }}
      >
        <FormularioLogin />
      </Box>
    </Box>
  );
}
