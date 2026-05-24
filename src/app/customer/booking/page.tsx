// app/customer/booking/page.tsx
// Server Component — fetches branch list (public, revalidate:300) and passes to wizard.
// No "use client" here — only BookingWizard (client component) needs state.

import { BookingWizard } from "@/components/customer/booking/BookingWizard";
import type { Branch } from "@/types/booking";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đặt lịch rửa xe — AutoWash Pro",
  description: "Đặt lịch rửa xe nhanh chóng, chọn chi nhánh, xe và khung giờ phù hợp.",
};

// ---------------------------------------------------------------------------
// TODO: Replace getAuthToken with real session read when auth is integrated.
// ---------------------------------------------------------------------------
async function getAuthToken(): Promise<string> {
  // TODO: cookies().get('token')?.value ?? ''
  return "PLACEHOLDER_TOKEN";
}

async function fetchBranches(): Promise<Branch[]> {
  try {
    const { getBranches } = await import("@/lib/api/public-read");
    return await getBranches();
  } catch {
    // Return empty list — BranchStep shows empty state
    return [];
  }
}

// ---------------------------------------------------------------------------

export default async function CustomerBookingPage() {
  // Fetch branch list server-side (revalidate:300 — public data)
  // This avoids the client having to load branches, improving first paint.
  const [token, branches] = await Promise.all([
    getAuthToken(),
    fetchBranches(),
  ]);

  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Đặt lịch rửa xe</h1>
        <p className="text-sm text-slate-500 mt-1">
          Làm theo các bước để hoàn tất đặt lịch của bạn.
        </p>
      </div>

      {/* Wizard card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
        {/* BookingWizard is a Client Component — receives server-fetched branches as props */}
        <BookingWizard token={token} initialBranches={branches} />
      </div>
    </main>
  );
}
