import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const [user, { confirmation }] = await Promise.all([getUserContext(), searchParams]);
  if (user) redirect("/learn");

  const confirmationMessage = confirmation === "sign-in"
    ? "Your email was confirmed. Sign in with your email and password."
    : confirmation === "invalid"
      ? "This confirmation link could not be verified. Check your email for the latest link."
      : "";

  return (
    <div className="login-page">
      <LoginForm confirmationMessage={confirmationMessage} />
    </div>
  );
}
