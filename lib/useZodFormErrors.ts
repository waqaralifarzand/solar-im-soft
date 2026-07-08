"use client";

import { useState } from "react";
import type { ZodSchema, ZodIssue } from "zod";

function issuesToErrors(issues: ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Zod-backed field error state that never shows an error on a pristine form: a
 * field's message only appears after a full submit attempt (validateOnSubmit)
 * or after that specific field is blurred (validateField).
 */
export function useZodFormErrors<T>(schema: ZodSchema<T>) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateOnSubmit(values: unknown): T | null {
    const result = schema.safeParse(values);
    if (!result.success) {
      setFieldErrors(issuesToErrors(result.error.issues));
      return null;
    }
    setFieldErrors({});
    return result.data;
  }

  function validateField(field: string, values: unknown) {
    const result = schema.safeParse(values);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (result.success) {
        delete next[field];
        return next;
      }
      const issue = result.error.issues.find((i) => String(i.path[0]) === field);
      if (issue) next[field] = issue.message;
      else delete next[field];
      return next;
    });
  }

  function clearErrors() {
    setFieldErrors({});
  }

  return { fieldErrors, validateOnSubmit, validateField, clearErrors };
}
