import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">
            Solar IMS
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
