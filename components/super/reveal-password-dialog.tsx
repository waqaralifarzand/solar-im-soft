"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RevealPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  tempPassword: string;
  title?: string;
}

export function RevealPasswordDialog({
  open,
  onOpenChange,
  email,
  tempPassword,
  title = "Temporary password",
}: RevealPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Shown once for {email}. Share it securely — it won&apos;t be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-input border border-border bg-surface px-4 py-3">
          <code className="text-sm font-medium text-foreground">{tempPassword}</code>
          <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
