"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { getVehicles } from "@/lib/api/vehicle";
import { getCustomerProfile } from "@/lib/api/customer";

/**
 * Component DashboardHeader
 * 
 * Chức năng: Hiển thị thanh tiêu đề chào mừng cho giao diện bảng điều khiển của khách hàng.
 * Tính năng:
 * - Chào mừng động khách hàng đã đăng nhập bằng cách phân tích cú pháp email của họ.
 * - Kiểm tra xem khách hàng đã đăng ký phương tiện nào trong hồ sơ của họ chưa.
 * - Hiển thị biểu ngữ cảnh báo khuyên khách hàng nên đăng ký xe nếu chưa tìm thấy xe nào.
 * 
 * Liên quan: Được sử dụng trong `src/app/customer/page.tsx` làm thành phần tiêu đề chính.
 */
export function DashboardHeader() {
  const [name, setName] = useState("Khách hàng");
  const [showVehicleNotice, setShowVehicleNotice] = useState(false);

  // Đồng bộ trạng thái với họ tên hoặc email từ local storage
  useEffect(() => {
    function updateName() {
      const firstName = window.localStorage.getItem("firstName");
      const lastName = window.localStorage.getItem("lastName");
      if (firstName || lastName) {
        setName(`${lastName ?? ""} ${firstName ?? ""}`.trim());
        return;
      }
      const email = window.localStorage.getItem("email");
      if (email) {
        const username = email.split("@")[0];
        const capitalized = username.charAt(0).toUpperCase() + username.slice(1);
        setName(capitalized);
      } else {
        setName("Khách hàng");
      }
    }

    updateName();
    window.addEventListener("autowash-auth", updateName);
    window.addEventListener("storage", updateName);
    return () => {
      window.removeEventListener("autowash-auth", updateName);
      window.removeEventListener("storage", updateName);
    };
  }, []);

  // Lấy danh sách xe để xác định xem có hiển thị biểu ngữ nhắc nhở đăng ký hay không
  useEffect(() => {
    let cancelled = false;

    async function updateVehicleNotice() {
      const rawToken = window.localStorage.getItem("token") ?? "";
      const token = rawToken.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();

      if (!token) {
        if (!cancelled) setShowVehicleNotice(false);
        return;
      }

      try {
        const vehicles = await getVehicles(token, 1, 1);
        if (!cancelled) setShowVehicleNotice(vehicles.length === 0);
      } catch {
        if (!cancelled) setShowVehicleNotice(false);
      }
    }

    void updateVehicleNotice();

    window.addEventListener("autowash-auth", updateVehicleNotice);
    return () => {
      cancelled = true;
      window.removeEventListener("autowash-auth", updateVehicleNotice);
    };
  }, []);

  // Lấy thông tin họ tên khách hàng để cập nhật trạng thái
  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      const rawToken = window.localStorage.getItem("token") ?? "";
      const token = rawToken.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
      if (!token) return;

      try {
        const profile = await getCustomerProfile(token);
        if (cancelled) return;
        const firstName = profile.firstName;
        const lastName = profile.lastName;
        const oldFirstName = window.localStorage.getItem("firstName");
        const oldLastName = window.localStorage.getItem("lastName");

        if (firstName !== oldFirstName || lastName !== oldLastName) {
          window.localStorage.setItem("firstName", firstName);
          window.localStorage.setItem("lastName", lastName);
          window.dispatchEvent(new Event("autowash-auth"));
        }
      } catch {
        // Có phương án fallback bằng email nên bỏ qua lỗi ở đây
      }
    }

    void fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="mb-8">
      {showVehicleNotice ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
          <span className="text-amber-800">
            bạn nên đăng ký xe tại mục tài khoản cá nhân trước khi đặt lịch
          </span>
        </div>
      ) : null}
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        Chào mừng trở lại, <span className="text-[#2563EB]">{name}</span>
      </h1>
      <p className="text-sm text-slate-500 mt-0.5">
        Đây là tổng quan chăm sóc xe của bạn.
      </p>
    </header>
  );
}
