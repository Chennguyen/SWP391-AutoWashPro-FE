// app/customer/info/page.tsx
// Server Component — fetches initial data server-side, passes to client children.
// page.tsx itself stays Server Component; only child components use "use client".

import { ProfileInfoCard } from "@/components/customer/info/ProfileInfoCard";
import { VehicleList } from "@/components/customer/info/VehicleList";
import type { Vehicle } from "@/types/vehicle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thông tin cá nhân — AutoWash Pro",
  description: "Xem và cập nhật thông tin cá nhân, quản lý xe của bạn.",
};

// ---------------------------------------------------------------------------
// TODO: Replace these mock helpers with real session/auth reads.
// In production: get token from cookies() or auth session (server-side).
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string> {
  // TODO: read from server-side session (e.g. cookies().get('token')?.value ?? '')
  return "PLACEHOLDER_TOKEN";
}

async function getUserProfile() {
  // TODO: fetch from /users/me with token
  return {
    name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    phone: "0901 234 567",
    membershipTier: "SILVER",
    points: 1250,
  };
}

async function getInitialVehicles(token: string): Promise<Vehicle[]> {
  try {
    // Dynamic import to avoid issues when API_BASE_URL not set in dev
    const { getVehicles } = await import("@/lib/api/vehicle");
    return await getVehicles(token);
  } catch {
    // Return empty list as fallback — VehicleList handles empty state
    return [];
  }
}

// ---------------------------------------------------------------------------

export default async function CustomerInfoPage() {
  const token = await getAuthToken();
  const [profile, vehicles] = await Promise.all([
    getUserProfile(),
    getInitialVehicles(token),
  ]);

  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Thông tin cá nhân</h1>
        <p className="text-sm text-slate-500 mt-1">
          Xem thông tin tài khoản và quản lý xe của bạn.
        </p>
      </div>

      {/* Section 1: Personal info card — Server Component, no interactivity */}
      <ProfileInfoCard {...profile} />

      {/* Section 2: Vehicle management — Client Component (manages add/refresh state) */}
      <VehicleList token={token} initialVehicles={vehicles} />
    </main>
  );
}

