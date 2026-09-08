"use client";

import { useEffect, useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { formatoMoneda } from "@/lib/formato";
import type { MenuPublico, ServicioPublico } from "@/lib/cotizador/datos";
import type { DesglosePublico } from "@/lib/cotizador/calculo";
import { confirmarCotizacion, simular } from "./actions";
import PasoEvento from "./PasoEvento";
import PasoMenu from "./PasoMenu";
import PasoAdicionales from "./PasoAdicionales";
import PasoConfirmacion from "./PasoConfirmacion";
import PasoDerivacion from "./PasoDerivacion";
import ResumenPresupuesto from "./ResumenPresupuesto";

type Paso = 1 | 2 | 3 | 4;

const ETIQUETAS_PASO = ["Evento", "Menú", "Adicionales", "Presupuesto"];

export default function Wizard({
  menus,
  servicios,
  idMenuInicial,
  validezCotizacionDias,
}: {
  menus: MenuPublico[];
  servicios: ServicioPublico[];
  idMenuInicial: number | null;
  validezCotizacionDias: number;
}) {
  const [paso, setPaso] = useState<Paso>(1);
  const [derivado, setDerivado] = useState<number | null>(null);

  const [pax, setPax] = useState("");
  const [fecha, setFecha] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Casamiento");
  const [idMenuSeleccionado, setIdMenuSeleccionado] = useState<number | null>(idMenuInicial);
  const [idsAdicionales, setIdsAdicionales] = useState<number[]>([]);

  const [desglose, setDesglose] = useState<DesglosePublico | null>(null);
  const [cargando, iniciarCarga] = useTransition();
  const [mensajeErrorPax, setMensajeErrorPax] = useState<string | null>(null);
  const [mensajeErrorMenu, setMensajeErrorMenu] = useState<string | null>(null);

  const [nombreCliente, setNombreCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [tokenTurnstile, setTokenTurnstile] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeErrorConfirmacion, setMensajeErrorConfirmacion] = useState<string | null>(null);
  const [exito, setExito] = useState<{ codigo: string; fechaValidez: string } | null>(null);

  const paxNumero = Number(pax);
  const paxValido = Number.isInteger(paxNumero) && paxNumero > 0;

  // Vista previa en vivo del total mientras el usuario elige menú/adicionales; no decide navegación, eso lo valida cada botón "Siguiente" con su propio llamado.
  useEffect(() => {
    if (!paxValido || paso === 1) return;
    const timeout = setTimeout(() => {
      iniciarCarga(async () => {
        const resultado = await simular({ pax: paxNumero, idMenu: idMenuSeleccionado, idsAdicionales });
        if (resultado.tipo === "ok") setDesglose(resultado.desglose);
      });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxNumero, idMenuSeleccionado, idsAdicionales, paso]);

  async function avanzarDesdeEvento() {
    setMensajeErrorPax(null);
    if (!paxValido) {
      setMensajeErrorPax("Ingresá una cantidad de invitados válida.");
      return;
    }
    if (!fecha || !tipoEvento) {
      setMensajeErrorPax("Completá la fecha y el tipo de evento.");
      return;
    }

    iniciarCarga(async () => {
      const resultado = await simular({ pax: paxNumero, idMenu: idMenuSeleccionado, idsAdicionales });
      if (resultado.tipo === "excede_maximo") {
        setDerivado(resultado.maximo);
        return;
      }
      if (resultado.tipo === "bajo_minimo_evento") {
        setMensajeErrorPax(`El mínimo es ${resultado.minimo} invitados.`);
        return;
      }
      if (resultado.tipo === "error") {
        setMensajeErrorPax(resultado.mensaje);
        return;
      }
      setDerivado(null);
      if (resultado.tipo === "ok") setDesglose(resultado.desglose);
      setPaso(2);
    });
  }

  async function avanzarDesdeMenu() {
    setMensajeErrorMenu(null);
    if (!idMenuSeleccionado) {
      setMensajeErrorMenu("Elegí un menú para continuar.");
      return;
    }
    iniciarCarga(async () => {
      const resultado = await simular({ pax: paxNumero, idMenu: idMenuSeleccionado, idsAdicionales });
      if (resultado.tipo === "bajo_minimo_menu") {
        setMensajeErrorMenu(`${resultado.nombreMenu} requiere un mínimo de ${resultado.minimo} invitados.`);
        return;
      }
      if (resultado.tipo === "ok") setDesglose(resultado.desglose);
      setPaso(3);
    });
  }

  function avanzarDesdeAdicionales() {
    iniciarCarga(async () => {
      const resultado = await simular({ pax: paxNumero, idMenu: idMenuSeleccionado, idsAdicionales });
      if (resultado.tipo === "ok") setDesglose(resultado.desglose);
      setPaso(4);
    });
  }

  function cambiarAdicional(idAdicional: number, marcado: boolean) {
    setIdsAdicionales((actual) =>
      marcado ? [...actual, idAdicional] : actual.filter((id) => id !== idAdicional),
    );
  }

  async function confirmar() {
    setMensajeErrorConfirmacion(null);
    setEnviando(true);
    const resultado = await confirmarCotizacion({
      pax: paxNumero,
      idMenu: idMenuSeleccionado,
      idsAdicionales,
      fechaEvento: fecha,
      tipoEvento,
      nombreCliente,
      emailCliente,
      telefonoCliente,
      consentimientoDatos: consentimiento,
      tokenTurnstile,
    });
    setEnviando(false);

    if (resultado.tipo === "error") {
      setMensajeErrorConfirmacion(resultado.mensaje);
      return;
    }
    setExito({ codigo: resultado.codigo, fechaValidez: resultado.fechaValidez });
  }

  const nombreMenuSeleccionado = menus.find((m) => m.idMenu === idMenuSeleccionado)?.nombre ?? null;

  if (exito) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          ¡Listo! Tu presupuesto quedó emitido.
        </Alert>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          {exito.codigo}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Válido hasta el {new Date(exito.fechaValidez).toLocaleDateString("es-AR")}. Te enviamos el PDF a{" "}
          {emailCliente}.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Guardá el código <strong>{exito.codigo}</strong>: con él podés volver a consultar este presupuesto
          cuando quieras, sin necesidad de crear una cuenta.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center" }}>
          <Button href={`/cotizacion/${exito.codigo}`} variant="contained" size="large">
            Ver mi presupuesto
          </Button>
          <Button href="/" variant="outlined" size="large">
            Volver al inicio
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Box sx={{ pb: { xs: 12, md: 4 } }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
        <Button href="/" size="small" sx={{ mb: 2, px: 0 }}>
          ← Volver al inicio
        </Button>
        <Stepper activeStep={paso - 1} sx={{ mb: 4, display: { xs: "none", sm: "flex" } }}>
          {ETIQUETAS_PASO.map((etiqueta) => (
            <Step key={etiqueta}>
              <StepLabel>{etiqueta}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: { xs: "block", sm: "none" } }}>
          Paso {paso} de 4
        </Typography>
        {paso === 1 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            El presupuesto que emitas va a quedar válido por {validezCotizacionDias} días.
          </Typography>
        )}

        {derivado != null ? (
          <PasoDerivacion maximo={derivado} onVolver={() => setDerivado(null)} />
        ) : (
          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Box sx={{ flex: "2 1 480px", minWidth: 0 }}>
              {paso === 1 && (
                <PasoEvento
                  pax={pax}
                  fecha={fecha}
                  tipoEvento={tipoEvento}
                  onCambiarPax={setPax}
                  onCambiarFecha={setFecha}
                  onCambiarTipoEvento={setTipoEvento}
                  mensajeError={mensajeErrorPax}
                />
              )}
              {paso === 2 && (
                <PasoMenu
                  menus={menus}
                  pax={paxNumero}
                  idMenuSeleccionado={idMenuSeleccionado}
                  onSeleccionar={setIdMenuSeleccionado}
                  mensajeError={mensajeErrorMenu}
                />
              )}
              {paso === 3 && (
                <PasoAdicionales servicios={servicios} idsSeleccionados={idsAdicionales} onCambiar={cambiarAdicional} />
              )}
              {paso === 4 && (
                <PasoConfirmacion
                  desglose={desglose}
                  nombreCliente={nombreCliente}
                  emailCliente={emailCliente}
                  telefonoCliente={telefonoCliente}
                  consentimiento={consentimiento}
                  onCambiarNombre={setNombreCliente}
                  onCambiarEmail={setEmailCliente}
                  onCambiarTelefono={setTelefonoCliente}
                  onCambiarConsentimiento={setConsentimiento}
                  onToken={setTokenTurnstile}
                  onConfirmar={confirmar}
                  enviando={enviando}
                  mensajeError={mensajeErrorConfirmacion}
                />
              )}

              <Stack direction="row" spacing={2} sx={{ mt: 3, display: { xs: "none", md: "flex" } }}>
                {paso > 1 && (
                  <Button variant="outlined" onClick={() => setPaso((p) => (p - 1) as Paso)} disabled={cargando}>
                    Volver
                  </Button>
                )}
                {paso === 1 && (
                  <Button variant="contained" onClick={avanzarDesdeEvento} disabled={cargando}>
                    Siguiente
                  </Button>
                )}
                {paso === 2 && (
                  <Button variant="contained" onClick={avanzarDesdeMenu} disabled={cargando}>
                    Siguiente
                  </Button>
                )}
                {paso === 3 && (
                  <Button variant="contained" onClick={avanzarDesdeAdicionales} disabled={cargando}>
                    Continuar
                  </Button>
                )}
              </Stack>
            </Box>

            {paso < 4 && (
              <Box sx={{ flex: "1 1 280px", minWidth: 0, display: { xs: "none", md: "block" } }}>
                <ResumenPresupuesto
                  pax={paxValido ? paxNumero : null}
                  nombreMenu={nombreMenuSeleccionado}
                  cantidadAdicionales={idsAdicionales.length}
                  desglose={desglose}
                  cargando={cargando}
                />
              </Box>
            )}
          </Stack>
        )}
      </Container>

      {/* Barra de total fija: en mobile reemplaza a los botones de navegación de arriba. */}
      {derivado == null && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: "#1E2733",
            color: "common.white",
            px: 2,
            py: 1.5,
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 20,
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              TOTAL
            </Typography>
            <Typography sx={{ fontWeight: 800 }}>
              {cargando ? "…" : formatoMoneda.format(desglose?.montoTotal ?? 0)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {paso > 1 && (
              <Button variant="outlined" color="inherit" onClick={() => setPaso((p) => (p - 1) as Paso)} disabled={cargando}>
                Volver
              </Button>
            )}
            {paso === 1 && (
              <Button variant="contained" onClick={avanzarDesdeEvento} disabled={cargando}>
                Siguiente
              </Button>
            )}
            {paso === 2 && (
              <Button variant="contained" onClick={avanzarDesdeMenu} disabled={cargando}>
                Siguiente
              </Button>
            )}
            {paso === 3 && (
              <Button variant="contained" onClick={avanzarDesdeAdicionales} disabled={cargando}>
                Continuar
              </Button>
            )}
          </Stack>
        </Box>
      )}

    </Box>
  );
}
