"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThermalReceipt, type ReceiptData } from "./thermal-receipt";

interface PrintReceiptButtonProps {
  data: ReceiptData;
  label?: string;
  size?: "default" | "page" | "sm";
}

export function PrintReceiptButton({ data, label = "Print receipt", size = "sm" }: PrintReceiptButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: data.invoiceNo,
    pageStyle: "@page { size: 80mm auto; margin: 0; }",
  });

  return (
    <>
      <Button type="button" variant="secondary" size={size} onClick={() => handlePrint()}>
        <Printer size={14} className="mr-1.5" />
        {label}
      </Button>
      {/* Kept mounted (real layout, not display:none) so react-to-print can clone it, but
          moved off-screen since it's only meant to be seen via the print dialog. */}
      <div style={{ position: "fixed", top: -10000, left: -10000 }} aria-hidden>
        <ThermalReceipt ref={receiptRef} data={data} />
      </div>
    </>
  );
}
