import BarraPortal from "@/components/portal/BarraPortal";
import { obtenerMenusPublicos, obtenerParametrosPortal, obtenerServiciosPublicos } from "@/lib/cotizador/datos";
import Wizard from "./Wizard";

export const dynamic = "force-dynamic";

export default async function PaginaCotizar({
  searchParams,
}: {
  searchParams: Promise<{ menu?: string }>;
}) {
  const { menu } = await searchParams;
  const parametros = await obtenerParametrosPortal();
  const [menus, servicios] = await Promise.all([
    obtenerMenusPublicos(parametros),
    obtenerServiciosPublicos(parametros),
  ]);

  return (
    <>
      <BarraPortal mostrarNavegacion={false} mostrarCta={false} />
      <Wizard
        menus={menus}
        servicios={servicios}
        idMenuInicial={menu ? Number(menu) : null}
        validezCotizacionDias={parametros.validezCotizacionDias}
      />
    </>
  );
}
