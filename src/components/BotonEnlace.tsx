"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import Link from "next/link";

/**
 * Wrapper "use client" para usar Button+Link de Next.js desde Server
 * Components: pasar el componente Link como prop (component={Link})
 * directamente desde un Server Component rompe la serialización de RSC.
 */
export default function BotonEnlace({
  href,
  children,
  ...props
}: ButtonProps & { href: string }) {
  return (
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  );
}
