import { z } from "zod";

export const createCompanyUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  role: z.enum(["MANAGER", "CASHIER"]),
});
export type CreateCompanyUserInput = z.infer<typeof createCompanyUserSchema>;
