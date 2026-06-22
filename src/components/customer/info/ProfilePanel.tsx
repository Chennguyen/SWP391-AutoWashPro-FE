"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Phone, User, UserCog, Lock, Eye, EyeOff, Save } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import {
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  getMyVerificationStatus,
  resubmitVerification,
  type CustomerProfile,
} from "@/lib/api/customer";
import { AlertTriangle, Info, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilePanelProps {
  token: string;
  onUnauthorized: () => void;
}

/**
 * Thành phần (Component) ProfilePanel
 * 
 * Chức năng: Thành phần giao diện (UI Component) hiển thị thông tin cá nhân của khách hàng,
 * đồng thời tích hợp trực tiếp luồng chỉnh sửa thông tin và đổi mật khẩu bảo mật cao.
 */
export function ProfilePanel({ token, onUnauthorized }: ProfilePanelProps) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Trạng thái Xác minh
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  // Trạng thái Chỉnh sửa thông tin cá nhân
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Trạng thái Đổi mật khẩu
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Trạng thái ẩn/hiện mật khẩu
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Trạng thái Gửi lại xác minh
  const [faceImages, setFaceImages] = useState<{ file: File; preview: string }[]>([]);
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      // 1. Luôn lấy trạng thái xác minh trước bằng /my-status
      const verification = await getMyVerificationStatus(token);
      
      setVerificationStatus(verification.status);
      setRejectReason(verification.rejectReason || "");

      // 2. Nếu đã Active, gọi API chính thức /api/v1/me để lấy hồ sơ chính xác nhất
      if (verification.status === "Active") {
        const officialProfile = await getCustomerProfile(token);
        console.log(">>> [ProfilePanel] Active profile from /me SUCCESS:", officialProfile);
        setProfile(officialProfile);
        setFirstName(officialProfile.firstName || "");
        setLastName(officialProfile.lastName || "");
        setPhone(officialProfile.phone || "");

        window.localStorage.setItem("firstName", officialProfile.firstName || "");
        window.localStorage.setItem("lastName", officialProfile.lastName || "");
        window.dispatchEvent(new Event("autowash-auth"));
      } else {
        // Tài khoản Pending hoặc Rejected -> Dùng thông tin từ /my-status
        console.log(">>> [ProfilePanel] Non-active profile from /my-status SUCCESS:", verification);
        setProfile(verification);
        setFirstName(verification.firstName || "");
        setLastName(verification.lastName || "");
        setPhone(verification.phone || "");

        window.localStorage.setItem("firstName", verification.firstName || "");
        window.localStorage.setItem("lastName", verification.lastName || "");
        window.dispatchEvent(new Event("autowash-auth"));
      }
    } catch (error) {
      console.error(">>> [ProfilePanel] loadProfile FAILED:", error);
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }
      setLoadError(
        error instanceof Error
          ? error.message
          : "Không thể tải thông tin cá nhân.",
      );
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    setProfile(null);
    setLoadError(null);
    setIsEditing(false);

    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile, token]);

  // Bật/tắt chế độ chỉnh sửa
  const toggleEditing = () => {
    if (isEditing) {
      // Nhấn Hủy -> reset lại các trường
      setFirstName(profile?.firstName || "");
      setLastName(profile?.lastName || "");
      setPhone(profile?.phone || "");
      setProfileError(null);
      setProfileSuccess(false);
      setIsEditing(false);
    } else {
      setProfileSuccess(false);
      setProfileError(null);
      setIsEditing(true);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = files.map((file) => {
        const preview = URL.createObjectURL(file);
        return { file, preview };
      });
      setFaceImages((prev) => {
        const combined = [...prev, ...newImages];
        if (combined.length > 3) {
          combined.slice(3).forEach((img) => URL.revokeObjectURL(img.preview));
        }
        return combined.slice(0, 3);
      });
      e.target.value = "";
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setResubmitError("Vui lòng nhập tên đệm và tên chính.");
      return;
    }
    if (faceImages.length !== 3) {
      setResubmitError("Vui lòng chọn đủ 3 ảnh khuôn mặt.");
      return;
    }

    setResubmitting(true);
    setResubmitError(null);
    setResubmitSuccess(false);

    try {
      await resubmitVerification(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        faceImages: faceImages.map((img) => img.file),
      });
      setResubmitSuccess(true);
      setVerificationStatus("Pending");
      setRejectReason("");
      faceImages.forEach((img) => URL.revokeObjectURL(img.preview));
      setFaceImages([]);
    } catch (error) {
       setResubmitError(error instanceof Error ? error.message : "Có lỗi xảy ra khi gửi lại hồ sơ.");
    } finally {
      setResubmitting(false);
    }
  };

  // Xác thực dữ liệu cập nhật hồ sơ
  function validateProfileFields(): string | null {
    if (!firstName.trim()) {
      return "Vui lòng nhập tên đệm / tên.";
    }
    if (!lastName.trim()) {
      return "Vui lòng nhập họ / tên chính.";
    }
    if (!phone.trim()) {
      return "Vui lòng nhập số điện thoại.";
    }
    if (!/^[0-9]{10,11}$/.test(phone.trim())) {
      return "Số điện thoại phải gồm 10-11 chữ số.";
    }
    return null;
  }

  // Cập nhật thông tin cá nhân
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    const errorMsg = validateProfileFields();
    if (errorMsg) {
      setProfileError(errorMsg);
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const updated = await updateCustomerProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cccd: profile?.cccd || "",
        phone: phone.trim(),
      });

      setProfile(updated);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setPhone(updated.phone || "");

      window.localStorage.setItem("firstName", updated.firstName);
      window.localStorage.setItem("lastName", updated.lastName);
      window.dispatchEvent(new Event("autowash-auth"));

      setProfileSuccess(true);
      setIsEditing(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }
      setProfileError(
        error instanceof Error ? error.message : "Lỗi cập nhật thông tin cá nhân.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  // Xác thực dữ liệu đổi mật khẩu
  function validatePasswordFields(): string | null {
    if (!oldPassword) {
      return "Vui lòng nhập mật khẩu cũ.";
    }
    if (!newPassword) {
      return "Vui lòng nhập mật khẩu mới.";
    }
    if (newPassword.length < 8) {
      return "Mật khẩu mới phải dài ít nhất 8 ký tự.";
    }
    if (newPassword === oldPassword) {
      return "Mật khẩu mới không được trùng mật khẩu cũ.";
    }
    if (newPassword !== confirmPassword) {
      return "Xác nhận mật khẩu mới không khớp.";
    }
    return null;
  }

  // Cập nhật mật khẩu
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    const errorMsg = validatePasswordFields();
    if (errorMsg) {
      setPasswordError(errorMsg);
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await changeCustomerPassword(token, oldPassword, newPassword, confirmPassword);
      setPasswordSuccess(true);

      // Reset các trường mật khẩu
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Đợi 1 giây hiển thị thông báo thành công rồi tự động đăng xuất và chuyển hướng
      setTimeout(() => {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("role");
        window.localStorage.removeItem("userId");
        window.localStorage.removeItem("email");
        window.localStorage.removeItem("firstName");
        window.localStorage.removeItem("lastName");
        window.dispatchEvent(new Event("autowash-auth"));

        window.location.href = "/auth/login";
      }, 1000);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }
      setPasswordError(
        error instanceof Error ? error.message : "Lỗi cập nhật mật khẩu.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <section aria-label="Thông tin cá nhân" className="space-y-6">
      {/* Tiêu đề phần thông tin cá nhân */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-950">Thông tin cá nhân</h2>
            {verificationStatus === "Pending" && (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Tài khoản chưa được duyệt
              </span>
            )}
            {verificationStatus === "Rejected" && (
              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                Tài khoản bị từ chối
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">Xem hồ sơ tài khoản của bạn.</p>
        </div>
        {profile && verificationStatus !== "Pending" && verificationStatus !== "Rejected" && (
          <button
            type="button"
            onClick={toggleEditing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <UserCog size={16} />
            {isEditing ? "Hủy" : "Sửa"}
          </button>
        )}
      </div>

      {loading && !profile ? (
        <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 mr-2" />
          Đang tải thông tin...
        </div>
      ) : null}

      {loadError ? (
        (() => {
          const isUnverified = loadError.includes("Only active and verified customer accounts") || (typeof window !== "undefined" && window.localStorage.getItem("is_unverified") === "true");
          return (
            <div role="alert" className={cn("rounded-lg border px-4 py-3 text-sm flex items-start gap-3", isUnverified ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700")}>
              <Info size={18} className={cn("mt-0.5 shrink-0", isUnverified ? "text-amber-600" : "text-red-500")} aria-hidden />
              <div>
                <p className="font-semibold">{isUnverified ? "Hồ sơ FaceID đang chờ duyệt" : "Lỗi tải thông tin"}</p>
                <p className="mt-1 text-xs md:text-sm">
                  {isUnverified ? "Tài khoản đang được hệ thống xác thực, vui lòng đợi trong ít phút." : loadError}
                </p>
              </div>
            </div>
          );
        })()
      ) : null}

      {profile ? (
        <div className="space-y-6">
          {/* Status banner */}
          {verificationStatus === "Pending" && (
             <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
               <Info size={20} className="mt-0.5 shrink-0 text-amber-600" />
               <div>
                 <p className="font-semibold">Hồ sơ FaceID đang chờ duyệt</p>
                 <p className="mt-1 text-sm">Vui lòng chờ quản trị viên phê duyệt hồ sơ của bạn để mở khóa các tính năng đặt lịch, nạp ví.</p>
               </div>
             </div>
          )}
          {verificationStatus === "Rejected" && (
             <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
               <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
               <div>
                 <p className="font-semibold">Hồ sơ FaceID bị từ chối</p>
                 <p className="mt-1 text-sm">Lý do: <span className="font-medium">{rejectReason || "Không rõ"}</span></p>
                 <p className="mt-1 text-sm">Vui lòng cập nhật thông tin và tải lên 3 ảnh khuôn mặt rõ nét dưới đây.</p>
               </div>
             </div>
          )}

          {verificationStatus === "Rejected" ? (
             <form onSubmit={handleResubmit} className="space-y-5 rounded-2xl border border-red-100 bg-white p-5 shadow-sm" noValidate>
                <h3 className="text-lg font-semibold text-slate-900">Gửi lại yêu cầu xác minh</h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* Họ */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Họ</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Nhập họ"
                    />
                  </div>
                  {/* Tên */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Tên</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Nhập tên"
                    />
                  </div>
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Email (Không thể chỉnh sửa)</label>
                    <input
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="w-full text-sm font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 cursor-not-allowed outline-none"
                    />
                  </div>
                  {/* Số điện thoại */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Số điện thoại (Không thể chỉnh sửa)</label>
                    <input
                      type="tel"
                      value={phone}
                      disabled
                      className="w-full text-sm font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 cursor-not-allowed outline-none"
                    />
                  </div>
                  {/* Số CCCD */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Số CCCD (Không thể chỉnh sửa)</label>
                    <input
                      type="text"
                      value={profile?.cccd || ""}
                      disabled
                      className="w-full text-sm font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Tải lên 3 ảnh khuôn mặt mới</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon size={24} className="mb-2 text-slate-500" />
                          <p className="mb-1 text-sm text-slate-500">
                            {faceImages.length < 3 ? (
                              <>
                                <span className="font-semibold">Nhấn để chọn</span> ảnh ({faceImages.length}/3)
                              </>
                            ) : (
                              <span className="font-semibold text-emerald-600">Đã đủ 3 ảnh</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">Ảnh chân dung rõ nét (JPG, PNG)</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={faceImages.length >= 3}
                        />
                      </label>
                    </div>
                    {faceImages.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-700">Ảnh đã chọn ({faceImages.length}/3):</p>
                        <div className="grid grid-cols-3 gap-3">
                          {faceImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.preview}
                                alt={`Ảnh khuôn mặt ${idx + 1}`}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  URL.revokeObjectURL(img.preview);
                                  setFaceImages((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                aria-label={`Xóa ảnh ${idx + 1}`}
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black transition-colors"
                              >
                                <span className="text-xs" aria-hidden>✕</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {resubmitError && <p className="text-sm text-red-600">{resubmitError}</p>}
                {resubmitSuccess && <p className="text-sm text-emerald-600 font-medium">Gửi lại hồ sơ thành công! Đang chờ duyệt.</p>}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={resubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 shadow-sm w-full sm:w-auto"
                  >
                    {resubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save size={15} />}
                    Gửi lại yêu cầu xác minh
                  </button>
                </div>
             </form>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-5" noValidate>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Tên đệm / tên */}
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-first-name"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 block"
                >
                  Tên đệm / tên
                </label>
                {isEditing ? (
                  <input
                    id="profile-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[46px]"
                    placeholder="Nhập tên đệm và tên"
                  />
                ) : (
                  <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center">
                    {profile.firstName || "---"}
                  </div>
                )}
              </div>

              {/* Họ / tên chính */}
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-last-name"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 block"
                >
                  Họ / tên chính
                </label>
                {isEditing ? (
                  <input
                    id="profile-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[46px]"
                    placeholder="Nhập họ và tên chính"
                  />
                ) : (
                  <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center">
                    {profile.lastName || "---"}
                  </div>
                )}
              </div>

              {/* Số CCCD (Chỉ xem) */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                  Số CCCD
                </span>
                <div className="text-sm font-semibold text-slate-600 bg-slate-100/60 border border-slate-200/40 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center cursor-not-allowed select-none">
                  {profile.cccd || "Chưa cập nhật"}
                </div>
              </div>

              {/* Email (Chỉ xem) */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" /> Email
                </span>
                <div className="text-sm font-semibold text-slate-600 bg-slate-100/60 border border-slate-200/40 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center cursor-not-allowed select-none overflow-x-auto whitespace-nowrap">
                  {profile.email || "---"}
                </div>
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="profile-phone"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 block flex items-center gap-1.5"
                >
                  <Phone size={13} className="text-slate-400" /> Số điện thoại
                </label>
                {isEditing ? (
                  <input
                    id="profile-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[46px]"
                    placeholder="Nhập số điện thoại"
                    inputMode="tel"
                  />
                ) : (
                  <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center">
                    {profile.phone || "---"}
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="pt-2">
                {profileError ? (
                  <p className="mb-3 text-sm text-red-600">{profileError}</p>
                ) : null}
                
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
                >
                  {savingProfile ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Save size={15} />
                  )}
                  Lưu thay đổi
                </button>
              </div>
            )}

            {profileSuccess ? (
              <p className="mt-2 text-sm text-emerald-600 font-medium">
                Cập nhật thông tin tài khoản thành công.
              </p>
            ) : null}
          </form>
          )}

          {/* Form đổi mật khẩu (Chỉ hiển thị khi bấm nút sửa) */}
          {isEditing && (
            <>
              <form onSubmit={handleUpdatePassword} className="space-y-4" noValidate>
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
                    <Lock size={18} className="text-blue-600" aria-hidden />
                    Đổi mật khẩu
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 max-w-md">
                  {/* Mật khẩu cũ */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="profile-old-password"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-500 block"
                    >
                      Mật khẩu cũ
                    </label>
                    <div className="relative">
                      <input
                        id="profile-old-password"
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => {
                          setOldPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordSuccess(false);
                        }}
                        className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[46px]"
                        placeholder="Mật khẩu hiện tại"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showOldPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Mật khẩu mới */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="profile-new-password"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-500 block"
                    >
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        id="profile-new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordSuccess(false);
                        }}
                        className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[46px]"
                        placeholder="Mật khẩu mới (>=8 ký tự)"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Xác nhận mật khẩu mới */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="profile-confirm-password"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-500 block"
                    >
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        id="profile-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordSuccess(false);
                        }}
                        className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[46px]"
                        placeholder="Nhập lại mật khẩu mới"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {passwordError ? (
                  <p className="text-sm text-red-600">{passwordError}</p>
                ) : null}
                {passwordSuccess ? (
                  <p className="text-sm text-emerald-600 font-medium">
                    Đổi mật khẩu thành công! Bạn sẽ được chuyển hướng đăng nhập lại...
                  </p>
                ) : null}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword || !newPassword}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingPassword ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-350 border-t-slate-700" />
                    ) : (
                      <Lock size={15} />
                    )}
                    Cập nhật mật khẩu
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
