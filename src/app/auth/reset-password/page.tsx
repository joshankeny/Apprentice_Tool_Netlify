import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <div className="login-page">
      <ResetPasswordForm />
    </div>
  );
}
