"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { useCarrito } from "@/lib/carrito-cliente/CarritoProvider";
import { paletaCliente } from "@/lib/cliente-portal/paleta";
import { cerrarSesionCliente } from "@/app/(cliente)/login/actions";

export default function AccionesHeader({ cliente }: { cliente: { nombreCompleto: string } | null }) {
  const { items } = useCarrito();
  const totalItems = items.reduce((suma, item) => suma + item.cantidad, 0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <IconButton component={Link} href="/carrito" sx={{ color: paletaCliente.textoSecundario }}>
        <Badge badgeContent={totalItems > 0 ? totalItems : undefined} color="primary">
          <ShoppingCartOutlinedIcon />
        </Badge>
      </IconButton>

      {cliente ? (
        <>
          <Box
            onClick={(evento) => setAnchorEl(evento.currentTarget)}
            sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: paletaCliente.primario, fontSize: 14 }}>
              {cliente.nombreCompleto.charAt(0).toUpperCase()}
            </Avatar>
            <Typography
              sx={{ display: { xs: "none", sm: "block" }, fontWeight: 600, color: paletaCliente.textoOscuro }}
            >
              {cliente.nombreCompleto.split(" ")[0]}
            </Typography>
          </Box>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem component={Link} href="/mi-cuenta" onClick={() => setAnchorEl(null)}>
              Mi Cuenta
            </MenuItem>
            <MenuItem component={Link} href="/mis-presupuestos" onClick={() => setAnchorEl(null)}>
              Mis Presupuestos
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                cerrarSesionCliente();
              }}
              sx={{ color: "error.main" }}
            >
              Cerrar sesión
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Button
          component={Link}
          href="/login"
          variant="outlined"
          size="small"
          sx={{
            borderColor: paletaCliente.primario,
            color: paletaCliente.primario,
            "&:hover": { bgcolor: paletaCliente.primario, color: "white", borderColor: paletaCliente.primario },
          }}
        >
          Iniciar sesión
        </Button>
      )}
    </Stack>
  );
}
