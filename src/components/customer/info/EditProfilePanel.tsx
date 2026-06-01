"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Lock, RefreshCw, Save, User } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import {
  changeCustomerPassword,
  getCustomerProfile,
  updateCustomerProfile,
  type CustomerProfile,
} from "@/lib/api/customer";

interface EditProfilePanelProps {
  token: string;
  onUnauthorized: () => void;
}

type ProfileFormErrors = {
  firstName?: string;
  lastName?: string;
  cccd?: string;
};

function validateProfile(
  firstName: string,
  lastName: string,
  cccd: string,
): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  if (!firstName.trim()) {
    errors.firstName = "Vui lòng nhập tên.";
  }

  if (!lastName.trim()) {
    errors.lastName = "Vui lòng nhập họ.";
  }

  if (!cccd.trim()) {
    errors.cccd = "Vui lòng nhập CCCD.";
  } else if (!/^[0-9]{9,12}$/.test(cccd.trim())) {
    errors.cccd = "CCCD phải gồm 9-12 chữ số.";
  }

  return errors;
}

export function EditProfilePanel({ token, onUnauthorized }: EditProfilePanelProps) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cccd, setCccd] = useState("");
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const applyProfile = useCallback((nextProfile: CustomerProfile) => {
    setProfile(nextProfile);
    setFirstName(nextProfile.firstName);
    setLastName(nextProfile.lastName);
    setCccd(nextProfile.cccd);
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCustomerProfile(token);
      applyProfile(data);
    } catch (error) {
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
  }, [applyProfile, onUnauthorized, token]);

  useEffect(() => {
    // ⚡ FIX: Clear stale data immediately when token changes
    setProfile(null);
    setFirstName("");
    setLastName("");
    setCccd("");
    setFormErrors({});
    setProfileSuccess(false);
    setProfileError(null);
    setNewPassword("");
    setPasswordSuccess(false);
    setPasswordError(null);

    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile, token]);

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateProfile(firstName, lastName, cccd);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const nextProfile = await updateCustomerProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cccd: cccd.trim(),
      });
      applyProfile(nextProfile);
      setProfileSuccess(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }

      setProfileError(
        error instanceof Error ? error.message : "Lỗi cập nhật thông tin.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải dài ít nhất 8 ký tự.");
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await changeCustomerPassword(token, newPassword);
      setNewPassword("");
      setPasswordSuccess(true);
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
    <section aria-label="Chỉnh sửa thông tin" className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Chỉnh sửa thông tin
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cập nhật hồ sơ tài khoản và mật khẩu của bạn.
          </p>
        </div>
        <button
          type="button"
          onClick={loadProfile}
          disabled={loading}
          title="Tải lại thông tin cá nhân"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
            aria-hidden
          />
          <span className="sr-only">Tải lại thông tin cá nhân</span>
        </button>
      </div>

      {loading && !profile ? (
        <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
          <RefreshCw
            size={20}
            className="mr-2 animate-spin text-slate-400"
            aria-hidden
          />
          Đang tải thông tin...
        </div>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      ) : null}

      {(!loading || profile) && (
        <>
          <form
            onSubmit={handleUpdateProfile}
            className="max-w-2xl space-y-4"
            noValidate
          >
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
                <User size={18} className="text-blue-600" aria-hidden />
                Cập nhật hồ sơ
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Thay đổi họ tên và CCCD.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-profile-first-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Tên đệm / tên
                </label>
                <input
                  id="edit-profile-first-name"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    setFormErrors((current) => ({
                      ...current,
                      firstName: undefined,
                    }));
                    setProfileSuccess(false);
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                    formErrors.firstName
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200"
                  }`}
                  placeholder="Nguyễn Văn"
                />
                {formErrors.firstName ? (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.firstName}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="edit-profile-last-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Họ / tên chính
                </label>
                <input
                  id="edit-profile-last-name"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    setFormErrors((current) => ({
                      ...current,
                      lastName: undefined,
                    }));
                    setProfileSuccess(false);
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                    formErrors.lastName
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200"
                  }`}
                  placeholder="A"
                />
                {formErrors.lastName ? (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.lastName}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-profile-cccd"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                CCCD
              </label>
              <input
                id="edit-profile-cccd"
                value={cccd}
                onChange={(event) => {
                  setCccd(event.target.value);
                  setFormErrors((current) => ({ ...current, cccd: undefined }));
                  setProfileSuccess(false);
                }}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                  formErrors.cccd ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
                placeholder="012345678912"
                inputMode="numeric"
              />
              {formErrors.cccd ? (
                <p className="mt-1 text-xs text-red-600">{formErrors.cccd}</p>
              ) : null}
            </div>

            {profileError ? (
              <p className="text-sm text-red-600">{profileError}</p>
            ) : null}
            {profileSuccess ? (
              <p className="text-sm text-emerald-600">
                Lưu thông tin thành công.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? (
                <RefreshCw size={16} className="animate-spin" aria-hidden />
              ) : (
                <Save size={16} aria-hidden />
              )}
              Lưu thay đổi
            </button>
          </form>

          <div className="h-px bg-slate-100 my-6" />

          <form
            onSubmit={handleUpdatePassword}
            className="max-w-2xl space-y-4"
            noValidate
          >
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
                <Lock size={18} className="text-blue-600" aria-hidden />
                Đổi mật khẩu
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Sử dụng mật khẩu mạnh để bảo vệ tài khoản.
              </p>
            </div>

            <div>
              <label
                htmlFor="edit-profile-new-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Mật khẩu mới
              </label>
              <input
                id="edit-profile-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setPasswordError(null);
                  setPasswordSuccess(false);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="matKhauMoiSieuBaoMat123!"
                autoComplete="new-password"
              />
            </div>

            {passwordError ? (
              <p className="text-sm text-red-600">{passwordError}</p>
            ) : null}
            {passwordSuccess ? (
              <p className="text-sm text-emerald-600">
                Đổi mật khẩu thành công.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={savingPassword || !newPassword}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingPassword ? (
                <RefreshCw size={16} className="animate-spin" aria-hidden />
              ) : (
                <Lock size={16} aria-hidden />
              )}
              Cập nhật mật khẩu
            </button>
          </form>
        </>
      )}
    </section>
  );
}
