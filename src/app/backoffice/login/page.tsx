import Box from "@mui/material/Box";
import FormularioLogin from "./FormularioLogin";

export default function PaginaLogin() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.100",
        p: 2,
      }}
    >
      <FormularioLogin />
    </Box>
  );
}
