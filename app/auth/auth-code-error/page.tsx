import { Suspense } from "react";
import AuthCodeErrorClient from "./auth-code-error-client";

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthCodeErrorClient />
    </Suspense>
  );
}
