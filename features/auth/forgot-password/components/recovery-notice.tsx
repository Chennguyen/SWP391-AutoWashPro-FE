import { CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";

interface RecoveryNoticeProps {
  children: ReactNode;
  tone?: "error" | "info";
}

export function RecoveryNotice({
  children,
  tone = "error",
}: RecoveryNoticeProps) {
  const isError = tone === "error";
  const Icon = isError ? CircleAlert : Info;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          : "flex items-start gap-2 rounded-2xl border border-[#d8bd84]/30 bg-[#d8bd84]/10 px-4 py-3 text-sm text-[#e9d7b1]"
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
