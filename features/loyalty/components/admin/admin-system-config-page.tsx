"use client";

import { useState } from "react";
import { Clock, Settings, DollarSign } from "lucide-react";
import { useAdminToken } from "@/features/admin/hooks/use-admin-token";
import { AdminPageHeader, AdminShell } from "@/features/admin/components/admin-ui";
import { LoyaltySettingsTab } from "./loyalty-settings-tab";
import { PricingSettingsTab } from "./pricing-settings-tab";
import { SlotSettingsTab } from "./slot-settings-tab";
import { cn } from "@/lib/utils";

type SystemConfigTab = "settings" | "pricing" | "slots";

const TABS: { id: SystemConfigTab; label: string; icon: React.ElementType }[] = [
  { id: "settings", label: "Cài đặt điểm", icon: Settings },
  { id: "pricing", label: "Cài đặt Giá", icon: DollarSign },
  { id: "slots", label: "Cài đặt Slot", icon: Clock },
];

export function AdminSystemConfigPage() {
  const token = useAdminToken();
  const [activeTab, setActiveTab] = useState<SystemConfigTab>("settings");

  return (
    <AdminShell>
      <AdminPageHeader
        title="Cấu hình hệ thống"
        description="Quản lý cài đặt điểm tích lũy, cài đặt giá dịch vụ và cấu hình slots thời gian hoạt động."
      />

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
              activeTab === id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            <Icon size={15} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {!token && (
          <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
            Đang kiểm tra phiên đăng nhập...
          </div>
        )}
        {activeTab === "settings" && token ? <LoyaltySettingsTab token={token} /> : null}
        {activeTab === "pricing" && token ? <PricingSettingsTab token={token} /> : null}
        {activeTab === "slots" && token ? <SlotSettingsTab token={token} /> : null}
      </div>
    </AdminShell>
  );
}
