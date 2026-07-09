import { CustomerForm } from "@/components/customers/customer-form";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">New customer</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a customer to your khata.</p>
      </div>
      <CustomerForm mode="create" />
    </div>
  );
}
