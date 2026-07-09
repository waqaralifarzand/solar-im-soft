import { z } from "zod";

export const EXPENSE_CATEGORIES = ["Rent", "Salaries", "Transport", "Utilities", "Marketing", "Other"] as const;

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).positive("Amount must be greater than zero"),
  note: z.string().max(500).optional().or(z.literal("")),
  date: z.string().min(1, "Pick a date"),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
