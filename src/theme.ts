import { createTheme } from "@mui/material/styles";

/** Paleta de colores de la marca. */
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2F6FB5" },
    success: { main: "#2E7D5B" },
    warning: { main: "#B4531F" },
    error: { main: "#A83232" },
    text: { primary: "#2B3138", secondary: "#6E767E" },
    background: { default: "#F3F5F7", paper: "#FFFFFF" },
    divider: "#DDE1E5",
  },
  shape: {
    borderRadius: 6,
  },
});

export default theme;
