import { z } from "zod";

export const createCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(120),
  adminName: z.string().min(1, "Admin name is required").max(120),
  adminEmail: z.string().min(1, "Admin email is required").email("Enter a valid email address"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
