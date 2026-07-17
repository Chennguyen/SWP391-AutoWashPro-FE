import { ArrowRight, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecoverySubmitButtonProps {
  id: string;
  isPending: boolean;
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}

export function RecoverySubmitButton({
  id,
  isPending,
  label,
  pendingLabel,
  disabled = false,
}: RecoverySubmitButtonProps) {
  const isIncomplete = disabled && !isPending;

  return (
    <Button
      id={id}
      type="submit"
      disabled={isPending || disabled}
      className={cn(
        "h-12 w-full rounded-full bg-[#d8bd84] !text-[#0e0e10] transition-colors hover:bg-[#f0d89f]",
        isIncomplete &&
          "bg-[#373631] !text-[#a7a095] hover:bg-[#373631] disabled:opacity-100",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center gap-3 !text-[#0e0e10]",
          isIncomplete && "!text-[#a7a095]",
        )}
      >
        {isPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {pendingLabel}
          </>
        ) : (
          <>
            {label}
            <ArrowRight className="size-5" aria-hidden="true" />
          </>
        )}
      </span>
    </Button>
  );
}
