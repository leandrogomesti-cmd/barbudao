import { getEmpresas } from "@/lib/actions-empresas";
import { EmpresasClient } from "./empresas-client";

export default async function EmpresasPage() {
  const empresas = await getEmpresas();

  return (
    <div className="container mx-auto py-8">
      <EmpresasClient initialEmpresas={empresas} />
    </div>
  );
}
