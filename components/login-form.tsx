"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/lib/validations/auth";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { fieldErrors, validateOnSubmit, validateField } = useZodFormErrors(loginSchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { email, password };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    const response = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setSubmitting(false);

    if (response?.error) {
      setFormError("Invalid email or password");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validateField("email", values)}
          disabled={submitting}
        />
        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => validateField("password", values)}
          disabled={submitting}
        />
        {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
      </div>

      {formError && <p className="text-xs text-destructive">{formError}</p>}

      <Button type="submit" size="page" disabled={submitting} className="mt-2 w-full">
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
