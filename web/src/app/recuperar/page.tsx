import { MarketingHeader } from "@/components/MarketingHeader";
import { RecuperarForm } from "./RecuperarForm";

export const metadata = {
  title: "Recuperar contraseña · Lubela",
  description: "Recibí un enlace por email para restablecer tu contraseña.",
};

export default function RecuperarPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <RecuperarForm />
    </div>
  );
}
