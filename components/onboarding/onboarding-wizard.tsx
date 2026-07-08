"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProgressDots } from "@/components/onboarding/progress-dots";
import { StepCompanyName } from "@/components/onboarding/step-company-name";
import { StepBranding } from "@/components/onboarding/step-branding";
import { StepTaxCurrency } from "@/components/onboarding/step-tax-currency";
import { StepInvoiceNotes } from "@/components/onboarding/step-invoice-notes";

const TOTAL_STEPS = 4;

interface OnboardingWizardProps {
  initialName: string;
  initialLogoUrl: string | null;
  initialAccentColor: string;
  initialTaxRate: string;
  initialCurrency: string;
  initialLakhCroreFormat: boolean;
  initialHeaderNote: string;
  initialFooterNote: string;
}

export function OnboardingWizard(props: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState(props.initialName);

  function goToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-lg">
      <ProgressDots step={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <StepCompanyName
          initialName={props.initialName}
          onContinue={(name) => {
            setCompanyName(name);
            setStep(1);
          }}
        />
      )}
      {step === 1 && (
        <StepBranding
          companyName={companyName}
          initialLogoUrl={props.initialLogoUrl}
          initialAccentColor={props.initialAccentColor}
          onSkip={() => setStep(2)}
          onContinue={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepTaxCurrency
          initialTaxRate={props.initialTaxRate}
          initialCurrency={props.initialCurrency}
          initialLakhCroreFormat={props.initialLakhCroreFormat}
          onSkip={() => setStep(3)}
          onContinue={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepInvoiceNotes
          initialHeaderNote={props.initialHeaderNote}
          initialFooterNote={props.initialFooterNote}
          onFinish={goToDashboard}
        />
      )}
    </Card>
  );
}
