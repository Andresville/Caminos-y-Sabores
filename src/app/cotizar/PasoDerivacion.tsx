import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

/** Por encima del máximo automático, el wizard deriva a contacto comercial en vez de seguir cotizando. */
export default function PasoDerivacion({ maximo, onVolver }: { maximo: number; onVolver: () => void }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info">Un evento de esta escala necesita una propuesta a medida.</Alert>
      <Typography>
        Para más de {maximo} invitados, nuestro motor de cotización automática no puede resolver el
        presupuesto: hace falta una propuesta hecha a medida por nuestro equipo comercial.
      </Typography>
      <Typography>
        Ponete en contacto con nuestro equipo comercial contándonos la cantidad de invitados y la fecha
        tentativa de tu evento, y te vamos a ayudar a armar una propuesta a medida.
      </Typography>
      <Button variant="outlined" onClick={onVolver} sx={{ alignSelf: "flex-start" }}>
        Volver a cambiar la cantidad de invitados
      </Button>
    </Stack>
  );
}
