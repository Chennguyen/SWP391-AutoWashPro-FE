"use client";

import { getVehicles } from "@/features/booking/vehicle-service";
import {
  getCustomerProfile,
  getMyVerificationStatus,
} from "@/features/users/customer-service";
import { AlertTriangle, Info } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null,
  );
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
        const capitalized =
          username.charAt(0).toUpperCase() + username.slice(1);
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
      const token = rawToken
        .replace(/^Bearer\s+/i, "")
        .replace(/^"|"$/g, "")
        .trim();

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
      const token = rawToken
        .replace(/^Bearer\s+/i, "")
        .replace(/^"|"$/g, "")
        .trim();
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
      const token = rawToken
        .replace(/^Bearer\s+/i, "")
        .replace(/^"|"$/g, "")
        .trim();
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
    <header className="mb-6">
      {verificationStatus === "Pending" ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info
            size={20}
            className="mt-0.5 shrink-0 text-amber-600"
            aria-hidden
          />
          <div>
            <p className="font-semibold">
              Hồ sơ FaceID của bạn đang chờ phê duyệt
            </p>
            <p className="mt-1">
              Bạn cần chờ quản trị viên phê duyệt hồ sơ trước khi có thể đặt
              lịch, nạp ví, hoặc quản lý xe. Vui lòng kiểm tra lại sau.
            </p>
          </div>
        </div>
      ) : verificationStatus === "Rejected" ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-red-600"
            aria-hidden
          />
          <div>
            <p className="font-semibold">Hồ sơ FaceID của bạn đã bị từ chối</p>
            <p className="mt-1">
              Lý do:{" "}
              <span className="font-medium">
                {rejectReason || "Không có lý do cụ thể"}
              </span>
            </p>
            <p className="mt-1">
              Vui lòng vào phần Tài khoản cá nhân để cập nhật lại thông tin và
              ảnh khuôn mặt.
            </p>
          </div>
        </div>
      ) : showVehicleNotice ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-amber-600"
            aria-hidden
          />
          <span className="text-amber-800">
            Bạn nên đăng ký xe tại mục tài khoản cá nhân trước khi đặt lịch
          </span>
        </div>
      ) : null}
      <div
        className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#111113] bg-cover bg-[position:72%_56%] px-5 py-7 shadow-[0_22px_60px_rgba(8,8,10,0.22)] sm:bg-[position:70%_56%] sm:px-7 sm:py-8 lg:bg-[position:76%_56%]"
        style={{
          backgroundImage:
            "url('/images/customer-dashboard-welcome-banner.png')",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,12,0.98)_0%,rgba(10,10,12,0.96)_52%,rgba(10,10,12,0.82)_76%,rgba(10,10,12,0.68)_100%)] sm:bg-[linear-gradient(90deg,rgba(10,10,12,0.97)_0%,rgba(10,10,12,0.92)_42%,rgba(10,10,12,0.62)_62%,rgba(10,10,12,0.20)_100%)] lg:bg-[linear-gradient(90deg,rgba(10,10,12,0.96)_0%,rgba(10,10,12,0.90)_36%,rgba(10,10,12,0.54)_54%,rgba(10,10,12,0.10)_76%,rgba(10,10,12,0.08)_100%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-[12%] w-px bg-gradient-to-b from-transparent via-[#bca374]/20 to-transparent" />
        <div className="relative z-10 max-w-[32rem] sm:max-w-[58%] lg:max-w-[52%]">
          <p className="text-sm font-medium text-[#bca374]">
            Không gian chăm sóc xe của bạn
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-tight text-[#fffdf9] sm:text-4xl">
            Chào mừng trở lại, <span className="text-[#d8c49f]">{name}</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#c4c0b6] sm:text-base">
            Theo dõi lịch hẹn, phương tiện, ví và quyền lợi thành viên tại một
            nơi.
          </p>
        </div>
      </div>
    </header>
  );
}
