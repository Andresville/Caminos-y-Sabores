import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import ThemeRegistry from "./ThemeRegistry";
import { CarritoProvider } from "@/lib/carrito-cliente/CarritoProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sabores & Eventos",
  description: "Sistema de gestión de costos gastronómicos y cotización de eventos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${lora.variable}`}>
      <body>
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <CarritoProvider>{children}</CarritoProvider>
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
