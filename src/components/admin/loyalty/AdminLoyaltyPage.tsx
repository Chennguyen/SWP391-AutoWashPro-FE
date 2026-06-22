"use client";

import { useState } from "react";
import { Award, Clock, Gift, Megaphone, Settings, DollarSign } from "lucide-react";
import { useAdminToken } from "@/components/admin/shared/useAdminToken";
import { AdminPageHeader, AdminShell } from "@/components/admin/shared/AdminUi";
import { LoyaltySettingsTab } from "./LoyaltySettingsTab";
import { PricingSettingsTab } from "./PricingSettingsTab";
import { SlotSettingsTab } from "./SlotSettingsTab";
import { TiersTab } from "./TiersTab";
import { RewardsTab } from "./RewardsTab";
import { PromotionsTab } from "./PromotionsTab";
import { cn } from "@/lib/utils";

type LoyaltyTab = "settings" | "pricing" | "slots" | "tiers" | "rewards" | "promotions";

const TABS: { id: LoyaltyTab; label: string; icon: React.ElementType }[] = [
  { id: "settings", label: "Cài đặt điểm", icon: Settings },
  { id: "pricing", label: "Cài đặt Giá", icon: DollarSign },
  { id: "slots", label: "Cài đặt Slot", icon: Clock },
  { id: "tiers", label: "Quản lý Tiers", icon: Award },
  { id: "rewards", label: "Phần thưởng", icon: Gift },
  { id: "promotions", label: "Khuyến mãi", icon: Megaphone },
];

/**
 * Thành phần (Component) AdminLoyaltyPage
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminLoyaltyPage() {
  const token = useAdminToken();
  const [activeTab, setActiveTab] = useState<LoyaltyTab>("settings");

  return (
    <AdminShell>
      <AdminPageHeader
        title="Cấu hình hệ thống"
        description="Quản lý cài đặt điểm tích lũy, cài đặt thời gian slot, hạng thành viên, phần thưởng và khuyến mãi."
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
        {activeTab === "tiers" && token ? <TiersTab token={token} /> : null}
        {activeTab === "rewards" && token ? <RewardsTab token={token} /> : null}
        {activeTab === "promotions" && token ? <PromotionsTab token={token} /> : null}
      </div>
    </AdminShell>
  );
}
