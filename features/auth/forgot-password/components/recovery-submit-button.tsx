import { ArrowRight, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface RecoverySubmitButtonProps {
  id: string;
  isPending: boolean;
  label: string;
  pendingLabel: string;
}

export function RecoverySubmitButton({
  id,
  isPending,
  label,
  pendingLabel,
}: RecoverySubmitButtonProps) {
  return (
    <Button
      id={id}
      type="submit"
      disabled={isPending}
      className="h-12 w-full rounded-full bg-[#d8bd84] !text-[#0e0e10] transition-colors hover:bg-[#f0d89f]"
    >
      <span className="flex items-center justify-center gap-3 !text-[#0e0e10]">
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
