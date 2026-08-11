import { MarketingHeader } from "@/components/MarketingHeader";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <RegisterForm />
    </div>
  );
}
