"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetLoyaltyInfoQuery } from "@/features/loyalty/hooks/useLoyalty";
import { resolveRankTier } from "@/features/loyalty/utils";
import { ApiError } from "@/lib/api-error";
import { formatDateOfBirth, getTodayUtcDateString } from "@/lib/date-of-birth";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  AtSign,
  BadgeCheck,
  CalendarDays,
  Eye,
  EyeOff,
  Fingerprint,
  Image as ImageIcon,
  Info,
  Lock,
  Mail,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  useChangePasswordMutation,
  useGetProfileQuery,
  useGetVerificationStatusQuery,
  useResubmitVerificationMutation,
  useUpdateProfileMutation,
} from "../hooks/useUserProfile";
import { CustomerProfile } from "../types/user-types";
import {
  passwordSchema,
  profileSchema,
  type ProfileFields,
} from "../validation/user-validation";

interface ProfilePanelProps {
  token: string;
  onUnauthorized: () => void;
}

function profileToFormValues(profile: CustomerProfile | null): ProfileFields {
  return {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    phone: profile?.phone ?? "",
    dateOfBirth: profile?.dateOfBirth ?? "",
  };
}

function ProfileInfoItem({
  icon: Icon,
  label,
  value,
  quiet,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  quiet?: boolean;
}) {
  return (
    <div className="grid gap-2 border-b border-white/10 py-4 last:border-b-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
      <dt className="flex items-center gap-2 text-sm text-[#8f8b84]">
        <Icon className="size-4 text-[#bca374]" strokeWidth={1.7} aria-hidden />
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 break-words text-sm font-medium text-[#fffdf9]",
          quiet && "text-[#b8b3aa]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Thành phần (Component) ProfilePanel
 *
 * Chức năng: Thành phần giao diện (UI Component) hiển thị thông tin cá nhân của khách hàng,
 * đồng thời tích hợp trực tiếp luồng chỉnh sửa thông tin và đổi mật khẩu bảo mật cao.
 */
export function ProfilePanel({ token, onUnauthorized }: ProfilePanelProps) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Trạng thái Xác minh
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState<string>("");

  // Trạng thái Chỉnh sửa thông tin cá nhân
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [maxDateOfBirth] = useState(getTodayUtcDateString);

  // Trạng thái Đổi mật khẩu
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Trạng thái ẩn/hiện mật khẩu
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Trạng thái Gửi lại xác minh
  const [faceImages, setFaceImages] = useState<
    { file: File; preview: string }[]
  >([]);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    setError: setProfileFieldError,
    clearErrors: clearProfileFieldErrors,
    formState: { errors: profileFieldErrors, isDirty: isProfileDirty },
  } = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileToFormValues(null),
  });

  // Queries & Mutations
  const verificationQuery = useGetVerificationStatusQuery(token);
  const profileQuery = useGetProfileQuery(token, {
    enabled: verificationQuery.data?.status === "Active",
  });

  const resubmitMutation = useResubmitVerificationMutation(token);
  const updateProfileMutation = useUpdateProfileMutation(token);
  const changePasswordMutation = useChangePasswordMutation(token);
  const loyaltyQuery = useGetLoyaltyInfoQuery(token, {
    enabled: verificationQuery.data?.status === "Active",
  });

  const loading =
    verificationQuery.isLoading ||
    (verificationQuery.data?.status === "Active" && profileQuery.isLoading);
  const resubmitting = resubmitMutation.isPending;
  const savingProfile = updateProfileMutation.isPending;
  const savingPassword = changePasswordMutation.isPending;
  const membership = resolveRankTier(loyaltyQuery.data ?? null);

  useEffect(() => {
    if (verificationQuery.error) {
      const err = verificationQuery.error;
      const id = window.setTimeout(() => {
        if (err.status === 401) {
          onUnauthorized();
        } else {
          setLoadError(err.message || "Không thể tải thông tin cá nhân.");
        }
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [verificationQuery.error, onUnauthorized]);

  useEffect(() => {
    if (profileQuery.error) {
      const err = profileQuery.error;
      const id = window.setTimeout(() => {
        if (err.status === 401) {
          onUnauthorized();
        } else {
          setLoadError(err.message || "Không thể tải thông tin cá nhân.");
        }
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [profileQuery.error, onUnauthorized]);

  useEffect(() => {
    if (verificationQuery.data) {
      const verification = verificationQuery.data;
      const id = window.setTimeout(() => {
        setVerificationStatus(verification.status);
        setRejectReason(verification.rejectReason || "");

        if (verification.status !== "Active") {
          setProfile(verification);
          setFirstName(verification.firstName || "");
          setLastName(verification.lastName || "");
          setPhone(verification.phone || "");

          window.localStorage.setItem(
            "firstName",
            verification.firstName || "",
          );
          window.localStorage.setItem("lastName", verification.lastName || "");
          window.dispatchEvent(new Event("autowash-auth"));
        }
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [verificationQuery.data]);

  useEffect(() => {
    if (profileQuery.data) {
      const officialProfile = profileQuery.data;
      const id = window.setTimeout(() => {
        setProfile(officialProfile);
        setFirstName(officialProfile.firstName || "");
        setLastName(officialProfile.lastName || "");
        setPhone(officialProfile.phone || "");
        if (!isEditing) {
          resetProfileForm(profileToFormValues(officialProfile));
        }

        window.localStorage.setItem(
          "firstName",
          officialProfile.firstName || "",
        );
        window.localStorage.setItem("lastName", officialProfile.lastName || "");
        window.dispatchEvent(new Event("autowash-auth"));
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [isEditing, profileQuery.data, resetProfileForm]);

  // Bật/tắt chế độ chỉnh sửa
  const toggleEditing = () => {
    if (isEditing) {
      // Nhấn Hủy -> reset lại các trường
      setFirstName(profile?.firstName || "");
      setLastName(profile?.lastName || "");
      setPhone(profile?.phone || "");
      resetProfileForm(profileToFormValues(profile));
      clearProfileFieldErrors();
      setProfileError(null);
      setProfileSuccess(false);
      setIsEditing(false);
    } else {
      resetProfileForm(profileToFormValues(profile));
      clearProfileFieldErrors();
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

    setResubmitError(null);
    setResubmitSuccess(false);

    try {
      await resubmitMutation.mutateAsync({
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
      setResubmitError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi gửi lại hồ sơ.",
      );
    }
  };

  // Cập nhật thông tin cá nhân
  async function handleUpdateProfile(data: ProfileFields) {
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const updated = await updateProfileMutation.mutateAsync({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        ...(profile?.dateOfBirth === null && data.dateOfBirth
          ? { dateOfBirth: data.dateOfBirth }
          : {}),
      });

      setProfile(updated);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setPhone(updated.phone || "");
      resetProfileForm(profileToFormValues(updated));

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
      const message =
        error instanceof Error
          ? error.message
          : "Lỗi cập nhật thông tin cá nhân.";
      const normalizedMessage = message.toLowerCase();

      if (
        normalizedMessage.includes("số điện thoại") ||
        normalizedMessage.includes("phone")
      ) {
        setProfileFieldError("phone", { type: "server", message });
      } else if (
        normalizedMessage.includes("ngày sinh") ||
        normalizedMessage.includes("date of birth")
      ) {
        setProfileFieldError("dateOfBirth", { type: "server", message });
      } else {
        setProfileError(message);
      }
    }
  }

  // Xác thực dữ liệu đổi mật khẩu
  function validatePasswordFields(): string | null {
    const parse = passwordSchema.safeParse({
      currentPassword: oldPassword,
      newPassword,
      confirmPassword,
    });
    if (!parse.success) {
      return parse.error.issues[0].message;
    }
    if (newPassword === oldPassword) {
      return "Mật khẩu mới không được trùng mật khẩu cũ.";
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

    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: oldPassword,
        newPassword,
        confirmPassword,
      });
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

        window.location.href = "/sign-in";
      }, 1000);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }
      setPasswordError(
        error instanceof Error ? error.message : "Lỗi cập nhật mật khẩu.",
      );
    }
  }

  const fullName =
    `${profile?.lastName ?? ""} ${profile?.firstName ?? ""}`.trim() ||
    "Khách hàng";
  const initials =
    `${profile?.lastName?.charAt(0) ?? ""}${profile?.firstName?.charAt(0) ?? ""}`.toUpperCase() ||
    "AW";
  const verificationLabel =
    verificationStatus === "Active"
      ? "Đã xác minh"
      : verificationStatus === "Rejected"
        ? "Cần cập nhật"
        : "Đang chờ duyệt";

  return (
    <section aria-label="Thông tin cá nhân" className="space-y-6">
      {profile ? (
        <header className="relative overflow-hidden rounded-2xl border border-[#bca374]/20 bg-[radial-gradient(circle_at_88%_16%,rgba(188,163,116,0.18),transparent_34%),linear-gradient(120deg,#1b1b1e_0%,#111113_100%)] p-5 shadow-[0_20px_55px_rgba(8,8,10,0.22)] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-[#bca374]/30 bg-[#bca374]/12 text-xl font-semibold text-[#f1dfbf] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:size-20 sm:text-2xl">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-semibold tracking-tight text-[#fffdf9] sm:text-3xl">
                  {fullName}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                    verificationStatus === "Active"
                      ? "border-[#bca374]/30 bg-[#bca374]/10 text-[#d8c49f]"
                      : verificationStatus === "Rejected"
                        ? "border-red-400/25 bg-red-500/10 text-red-300"
                        : "border-amber-300/25 bg-amber-300/10 text-amber-200",
                  )}
                >
                  {verificationStatus === "Active" ? (
                    <BadgeCheck className="size-3.5" aria-hidden />
                  ) : (
                    <Fingerprint className="size-3.5" aria-hidden />
                  )}
                  {verificationLabel}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-[#a09c94]">
                {profile.email || "Chưa có email"}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <span className="flex items-center gap-2 text-[#d8c49f]">
                  <ShieldCheck
                    className="size-4"
                    strokeWidth={1.7}
                    aria-hidden
                  />
                  {loyaltyQuery.isLoading
                    ? "Đang tải hạng"
                    : `${membership.name} Member`}
                </span>
                <span className="flex items-center gap-2 text-[#a09c94]">
                  <UserRound
                    className="size-4 text-[#bca374]"
                    strokeWidth={1.7}
                    aria-hidden
                  />
                  Tài khoản khách hàng
                </span>
              </div>
            </div>

            {verificationStatus === "Active" ? (
              <div className="flex shrink-0 gap-2 sm:self-start">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={toggleEditing}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-sm font-medium text-[#f4efe7] transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bca374]/70 active:translate-y-px"
                    >
                      <X className="size-4" aria-hidden />
                      Hủy
                    </button>
                    <button
                      type="submit"
                      form="profile-details-form"
                      disabled={savingProfile || !isProfileDirty}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#bca374] px-3.5 text-sm font-semibold text-[#17130f] transition hover:bg-[#d8c49f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] disabled:opacity-60 active:translate-y-px"
                    >
                      <Save className="size-4" aria-hidden />
                      {savingProfile ? "Đang lưu" : "Lưu hồ sơ"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={toggleEditing}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#bca374] px-4 text-sm font-semibold text-[#17130f] transition hover:bg-[#d8c49f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] active:translate-y-px"
                  >
                    <Pencil className="size-4" aria-hidden />
                    Sửa hồ sơ
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </header>
      ) : null}

      {loading && !profile ? (
        <div className="space-y-5" aria-label="Đang tải thông tin cá nhân">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <Skeleton className="size-16 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-52 max-w-full bg-white/10" />
              <Skeleton className="h-4 w-64 max-w-full bg-white/10" />
            </div>
          </div>
          <Skeleton className="h-64 rounded-2xl bg-white/10" />
        </div>
      ) : null}

      {loadError
        ? (() => {
            const isUnverified =
              loadError.includes(
                "Only active and verified customer accounts",
              ) ||
              loadError.includes(
                "Tài khoản chưa được kích hoạt hoặc xác minh",
              ) ||
              (typeof window !== "undefined" &&
                window.localStorage.getItem("is_unverified") === "true");
            return (
              <div
                role="alert"
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm flex items-start gap-3",
                  isUnverified
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                <Info
                  size={18}
                  className={cn(
                    "mt-0.5 shrink-0",
                    isUnverified ? "text-amber-600" : "text-red-500",
                  )}
                  aria-hidden
                />
                <div>
                  <p className="font-semibold">
                    {isUnverified
                      ? "Hồ sơ FaceID đang chờ duyệt"
                      : "Lỗi tải thông tin"}
                  </p>
                  <p className="mt-1 text-xs md:text-sm">
                    {isUnverified
                      ? "Tài khoản đang được hệ thống xác thực, vui lòng đợi trong ít phút."
                      : loadError}
                  </p>
                </div>
              </div>
            );
          })()
        : null}

      {profile ? (
        <div className="space-y-6">
          {/* Status banner */}
          {verificationStatus === "Pending" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
              <Info size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Hồ sơ FaceID đang chờ duyệt</p>
                <p className="mt-1 text-sm">
                  Vui lòng chờ quản trị viên phê duyệt hồ sơ của bạn để mở khóa
                  các tính năng đặt lịch, nạp ví.
                </p>
              </div>
            </div>
          )}
          {verificationStatus === "Rejected" && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-red-600"
              />
              <div>
                <p className="font-semibold">Hồ sơ FaceID bị từ chối</p>
                <p className="mt-1 text-sm">
                  Lý do:{" "}
                  <span className="font-medium">
                    {rejectReason || "Không rõ"}
                  </span>
                </p>
                <p className="mt-1 text-sm">
                  Vui lòng cập nhật thông tin và tải lên 3 ảnh khuôn mặt rõ nét
                  dưới đây.
                </p>
              </div>
            </div>
          )}

          {verificationStatus === "Rejected" ? (
            <form
              onSubmit={handleResubmit}
              className="space-y-5 rounded-2xl border border-red-100 bg-white p-5 shadow-sm"
              noValidate
            >
              <h3 className="text-lg font-semibold text-slate-900">
                Gửi lại yêu cầu xác minh
              </h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Họ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    Họ
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Nhập họ"
                  />
                </div>
                {/* Tên */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    Tên
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Nhập tên"
                  />
                </div>
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Email (Không thể chỉnh sửa)
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full text-sm font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 cursor-not-allowed outline-none"
                  />
                </div>
                {/* Số điện thoại */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Số điện thoại (Không thể chỉnh sửa)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    disabled
                    className="w-full text-sm font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 cursor-not-allowed outline-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    Tải lên 3 ảnh khuôn mặt mới
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon size={24} className="mb-2 text-slate-500" />
                        <p className="mb-1 text-sm text-slate-500">
                          {faceImages.length < 3 ? (
                            <>
                              <span className="font-semibold">
                                Nhấn để chọn
                              </span>{" "}
                              ảnh ({faceImages.length}/3)
                            </>
                          ) : (
                            <span className="font-semibold text-emerald-600">
                              Đã đủ 3 ảnh
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
                          Ảnh chân dung rõ nét (JPG, PNG)
                        </p>
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
                      <p className="text-sm font-semibold text-slate-700">
                        Ảnh đã chọn ({faceImages.length}/3):
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {faceImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
                          >
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
                                setFaceImages((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                );
                              }}
                              aria-label={`Xóa ảnh ${idx + 1}`}
                              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black transition-colors"
                            >
                              <span className="text-xs" aria-hidden>
                                ✕
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {resubmitError && (
                <p className="text-sm text-red-600">{resubmitError}</p>
              )}
              {resubmitSuccess && (
                <p className="text-sm text-emerald-600 font-medium">
                  Gửi lại hồ sơ thành công! Đang chờ duyệt.
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={resubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 shadow-sm w-full sm:w-auto"
                >
                  {resubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Save size={15} />
                  )}
                  Gửi lại yêu cầu xác minh
                </button>
              </div>
            </form>
          ) : (
            <form
              id="profile-details-form"
              onSubmit={handleProfileSubmit(handleUpdateProfile)}
              noValidate
            >
              <section
                aria-labelledby="personal-info-title"
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
              >
                <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                  <h3
                    id="personal-info-title"
                    className="text-lg font-semibold text-[#fffdf9]"
                  >
                    Thông tin cá nhân
                  </h3>
                  <p className="mt-1 text-sm text-[#8f8b84]">
                    {isEditing
                      ? "Các trường có viền sáng có thể chỉnh sửa."
                      : "Thông tin dùng để xác nhận và liên hệ với tài khoản."}
                  </p>
                </div>

                {isEditing ? (
                  <FieldGroup className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
                    <Field data-invalid={Boolean(profileFieldErrors.firstName)}>
                      <FieldLabel htmlFor="profile-first-name">
                        Tên đệm / tên
                      </FieldLabel>
                      <Input
                        id="profile-first-name"
                        className="min-h-11"
                        placeholder="Nhập tên đệm và tên"
                        autoComplete="given-name"
                        aria-invalid={Boolean(profileFieldErrors.firstName)}
                        {...registerProfile("firstName")}
                      />
                      <FieldError errors={[profileFieldErrors.firstName]} />
                    </Field>
                    <Field data-invalid={Boolean(profileFieldErrors.lastName)}>
                      <FieldLabel htmlFor="profile-last-name">
                        Họ / tên chính
                      </FieldLabel>
                      <Input
                        id="profile-last-name"
                        className="min-h-11"
                        placeholder="Nhập họ và tên chính"
                        autoComplete="family-name"
                        aria-invalid={Boolean(profileFieldErrors.lastName)}
                        {...registerProfile("lastName")}
                      />
                      <FieldError errors={[profileFieldErrors.lastName]} />
                    </Field>
                    <Field
                      className="sm:col-span-2"
                      data-invalid={Boolean(profileFieldErrors.phone)}
                    >
                      <FieldLabel htmlFor="profile-phone">
                        Số điện thoại
                      </FieldLabel>
                      <Input
                        id="profile-phone"
                        className="min-h-11"
                        placeholder="Nhập số điện thoại"
                        type="tel"
                        autoComplete="tel"
                        aria-invalid={Boolean(profileFieldErrors.phone)}
                        {...registerProfile("phone")}
                      />
                      <FieldError errors={[profileFieldErrors.phone]} />
                    </Field>
                    <Field
                      className="sm:col-span-2"
                      data-disabled={profile.dateOfBirth !== null}
                      data-invalid={Boolean(profileFieldErrors.dateOfBirth)}
                    >
                      <FieldLabel htmlFor="profile-date-of-birth">
                        Ngày sinh
                      </FieldLabel>
                      <Input
                        id="profile-date-of-birth"
                        className="min-h-11 scheme-dark"
                        type="date"
                        autoComplete="bday"
                        max={maxDateOfBirth}
                        disabled={profile.dateOfBirth !== null}
                        readOnly={profile.dateOfBirth !== null}
                        aria-readonly={profile.dateOfBirth !== null}
                        data-disabled={profile.dateOfBirth !== null}
                        aria-invalid={Boolean(profileFieldErrors.dateOfBirth)}
                        aria-describedby="profile-date-of-birth-description"
                        {...registerProfile("dateOfBirth")}
                      />
                      <FieldDescription id="profile-date-of-birth-description">
                        {profile.dateOfBirth
                          ? "Ngày sinh đã được lưu và không thể tự chỉnh sửa."
                          : "Không bắt buộc. Sau khi lưu, ngày sinh sẽ không thể tự chỉnh sửa."}
                      </FieldDescription>
                      <FieldError errors={[profileFieldErrors.dateOfBirth]} />
                    </Field>
                    <div className="rounded-xl bg-white/[0.035] px-4 py-3">
                      <p className="flex items-center gap-2 text-xs text-[#8f8b84]">
                        <AtSign
                          className="size-3.5 text-[#bca374]"
                          aria-hidden
                        />
                        Email, chỉ đọc
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-[#b8b3aa]">
                        {profile.email || "Chưa cập nhật"}
                      </p>
                    </div>
                  </FieldGroup>
                ) : (
                  <dl className="px-4 sm:px-5">
                    <ProfileInfoItem
                      icon={UserRound}
                      label="Tên đệm / tên"
                      value={profile.firstName || "Chưa cập nhật"}
                    />
                    <ProfileInfoItem
                      icon={UserRound}
                      label="Họ / tên chính"
                      value={profile.lastName || "Chưa cập nhật"}
                    />
                    <ProfileInfoItem
                      icon={Mail}
                      label="Email"
                      value={profile.email || "Chưa cập nhật"}
                      quiet
                    />
                    <ProfileInfoItem
                      icon={Phone}
                      label="Số điện thoại"
                      value={profile.phone || "Chưa cập nhật"}
                    />
                    <ProfileInfoItem
                      icon={CalendarDays}
                      label="Ngày sinh"
                      value={formatDateOfBirth(profile.dateOfBirth)}
                    />
                  </dl>
                )}

                {profileError ? (
                  <div
                    role="alert"
                    className="mx-4 mb-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300 sm:mx-5"
                  >
                    {profileError}
                  </div>
                ) : null}
                {profileSuccess ? (
                  <p className="mx-4 mb-4 text-sm font-medium text-emerald-400 sm:mx-5">
                    Cập nhật thông tin tài khoản thành công.
                  </p>
                ) : null}
              </section>
            </form>
          )}

          {verificationStatus === "Active" ? (
            <section
              aria-labelledby="account-security-title"
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
            >
              <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h3
                    id="account-security-title"
                    className="flex items-center gap-2 text-lg font-semibold text-[#fffdf9]"
                  >
                    <Lock
                      className="size-[18px] text-[#bca374]"
                      strokeWidth={1.7}
                      aria-hidden
                    />
                    Tài khoản và bảo mật
                  </h3>
                  <p className="mt-1 text-sm text-[#8f8b84]">
                    Quản lý mật khẩu và bảo vệ quyền truy cập tài khoản.
                  </p>
                </div>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={toggleEditing}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.035] px-3 text-sm font-medium text-[#d8c49f] transition hover:bg-white/[0.08] hover:text-[#fffdf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bca374]/70 active:translate-y-px"
                  >
                    <Lock className="size-4" aria-hidden />
                    Đổi mật khẩu
                  </button>
                ) : null}
              </div>

              {isEditing ? (
                <form
                  onSubmit={handleUpdatePassword}
                  className="space-y-4 p-4 sm:p-5"
                  noValidate
                >
                  <div className="grid max-w-xl grid-cols-1 gap-4">
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
                          className="min-h-11 w-full rounded-lg border border-white/15 bg-[#222226] py-2.5 pl-3.5 pr-10 text-sm text-[#fffdf9] outline-none transition focus:border-[#bca374] focus:ring-2 focus:ring-[#bca374]/20"
                          placeholder="Mật khẩu hiện tại"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77736d] transition hover:text-[#d8c49f]"
                          aria-label={
                            showOldPassword
                              ? "Ẩn mật khẩu hiện tại"
                              : "Hiện mật khẩu hiện tại"
                          }
                        >
                          {showOldPassword ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
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
                          className="min-h-11 w-full rounded-lg border border-white/15 bg-[#222226] py-2.5 pl-3.5 pr-10 text-sm text-[#fffdf9] outline-none transition focus:border-[#bca374] focus:ring-2 focus:ring-[#bca374]/20"
                          placeholder="Mật khẩu mới (>=8 ký tự)"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77736d] transition hover:text-[#d8c49f]"
                          aria-label={
                            showNewPassword
                              ? "Ẩn mật khẩu mới"
                              : "Hiện mật khẩu mới"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
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
                          className="min-h-11 w-full rounded-lg border border-white/15 bg-[#222226] py-2.5 pl-3.5 pr-10 text-sm text-[#fffdf9] outline-none transition focus:border-[#bca374] focus:ring-2 focus:ring-[#bca374]/20"
                          placeholder="Nhập lại mật khẩu mới"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77736d] transition hover:text-[#d8c49f]"
                          aria-label={
                            showConfirmPassword
                              ? "Ẩn xác nhận mật khẩu"
                              : "Hiện xác nhận mật khẩu"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {passwordError ? (
                    <p className="text-sm text-red-600">{passwordError}</p>
                  ) : null}
                  {passwordSuccess ? (
                    <p className="text-sm text-emerald-600 font-medium">
                      Đổi mật khẩu thành công. Bạn sẽ được chuyển hướng đăng
                      nhập lại.
                    </p>
                  ) : null}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingPassword || !newPassword}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#bca374]/30 bg-[#bca374]/10 px-4 text-sm font-semibold text-[#d8c49f] transition hover:bg-[#bca374]/18 hover:text-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px"
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
              ) : (
                <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#bca374]/10 text-[#d8c49f]">
                      <ShieldCheck
                        className="size-5"
                        strokeWidth={1.6}
                        aria-hidden
                      />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#fffdf9]">
                        Mật khẩu được bảo vệ
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#8f8b84]">
                        Khi thay đổi mật khẩu, hệ thống sẽ yêu cầu bạn đăng nhập
                        lại.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#bca374]">
                    Đang hoạt động
                  </span>
                </div>
              )}
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
