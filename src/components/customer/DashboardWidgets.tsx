"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { getVehicles } from "@/lib/api/vehicle";
import { getCustomerProfile, getMyVerificationStatus } from "@/lib/api/customer";
import { Info } from "lucide-react";

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
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

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
        const verification = await getMyVerificationStatus(token);
        if (cancelled) return;

        let firstName = verification.firstName;
        let lastName = verification.lastName;

        if (verification.status === "Active") {
          const officialProfile = await getCustomerProfile(token);
          if (cancelled) return;
          firstName = officialProfile.firstName;
          lastName = officialProfile.lastName;
        }

        const oldFirstName = window.localStorage.getItem("firstName");
        const oldLastName = window.localStorage.getItem("lastName");

        if (firstName !== oldFirstName || lastName !== oldLastName) {
          window.localStorage.setItem("firstName", firstName || "");
          window.localStorage.setItem("lastName", lastName || "");
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

  // Lấy trạng thái xác minh FaceID
  useEffect(() => {
    let cancelled = false;

    async function fetchVerification() {
      const rawToken = window.localStorage.getItem("token") ?? "";
      const token = rawToken.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
      if (!token) return;

      try {
        const data = await getMyVerificationStatus(token);
        if (cancelled) return;
        
        setVerificationStatus(data.status);
        if (data.rejectReason) {
          setRejectReason(data.rejectReason);
        }
      } catch {
        // Có thể API chưa sẵn sàng hoặc lỗi mạng
      }
    }

    void fetchVerification();
    window.addEventListener("autowash-auth", fetchVerification);
    return () => {
      cancelled = true;
      window.removeEventListener("autowash-auth", fetchVerification);
    };
  }, []);

  return (
    <header className="mb-8">
      {verificationStatus === "Pending" ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="font-semibold">Hồ sơ FaceID của bạn đang chờ phê duyệt</p>
            <p className="mt-1">
              Bạn cần chờ quản trị viên phê duyệt hồ sơ trước khi có thể đặt lịch, nạp ví, hoặc quản lý xe. Vui lòng kiểm tra lại sau.
            </p>
          </div>
        </div>
      ) : verificationStatus === "Rejected" ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
          <div>
            <p className="font-semibold">Hồ sơ FaceID của bạn đã bị từ chối</p>
            <p className="mt-1">
              Lý do: <span className="font-medium">{rejectReason || "Không có lý do cụ thể"}</span>
            </p>
            <p className="mt-1">
              Vui lòng vào phần Tài khoản cá nhân để cập nhật lại thông tin và ảnh khuôn mặt.
            </p>
          </div>
        </div>
      ) : showVehicleNotice ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
          <span className="text-amber-800">
            Bạn nên đăng ký xe tại mục tài khoản cá nhân trước khi đặt lịch
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
