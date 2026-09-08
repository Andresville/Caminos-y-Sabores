"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Alert from "@mui/material/Alert";

declare global {
  interface Window {
    turnstile?: {
      render: (
        selectorOrElement: string | HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void },
      ) => void;
    };
  }
}

/** Widget anti-automatización. Sin site key pública configurada, avisa en vez de renderizar algo roto — la verificación real la hace siempre el servidor, que falla cerrado si no está configurada. */
export default function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [scriptListo, setScriptListo] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !scriptListo || !contenedorRef.current || !window.turnstile) return;
    window.turnstile.render(contenedorRef.current, {
      sitekey: siteKey,
      callback: onToken,
      "expired-callback": () => onToken(""),
    });
  }, [siteKey, scriptListo, onToken]);

  if (!siteKey) {
    return <Alert severity="warning">La verificación anti-automatización todavía no está configurada.</Alert>;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onLoad={() => setScriptListo(true)}
      />
      <div ref={contenedorRef} />
    </>
  );
}
