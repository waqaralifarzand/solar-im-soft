import { CreateCompanyForm } from "@/components/super/create-company-form";

export default function NewCompanyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">New company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates the company and its first admin account with a temporary password.
        </p>
      </div>
      <CreateCompanyForm />
    </div>
  );
}
