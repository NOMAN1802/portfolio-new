import { Login } from "@/components/admin";
import { configured } from "@/lib/env";
export const dynamic = "force-dynamic";
export default function LoginPage() {
  return <Login configured={configured()} />;
}
