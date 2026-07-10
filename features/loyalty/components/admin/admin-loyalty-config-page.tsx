"use client";

import { useState } from "react";
import { Award, Gift, Megaphone } from "lucide-react";
import { useAdminToken } from "@/features/admin/hooks/use-admin-token";
import { AdminPageHeader, AdminShell } from "@/features/admin/components/admin-ui";
import { TiersTab } from "./tiers-tab";
import { RewardsTab } from "./rewards-tab";
import { PromotionsTab } from "./promotions-tab";
import { cn } from "@/lib/utils";

type LoyaltyConfigTab = "tiers" | "rewards" | "promotions";

const TABS: { id: LoyaltyConfigTab; label: string; icon: React.ElementType }[] = [
  { id: "tiers", label: "Quản lý Tiers", icon: Award },
  { id: "rewards", label: "Phần thưởng", icon: Gift },
  { id: "promotions", label: "Khuyến mãi", icon: Megaphone },
];

export function AdminLoyaltyConfigPage() {
  const token = useAdminToken();
  const [activeTab, setActiveTab] = useState<LoyaltyConfigTab>("tiers");

  return (
    <AdminShell>
      <AdminPageHeader
        title="Chương trình Loyalty & Ưu đãi"
        description="Quản lý các hạng thành viên (Tiers), danh sách quà tặng đổi điểm loyalty và các chương trình khuyến mãi/vouchers."
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
        {activeTab === "tiers" && token ? <TiersTab token={token} /> : null}
        {activeTab === "rewards" && token ? <RewardsTab token={token} /> : null}
        {activeTab === "promotions" && token ? <PromotionsTab token={token} /> : null}
      </div>
    </AdminShell>
  );
}
