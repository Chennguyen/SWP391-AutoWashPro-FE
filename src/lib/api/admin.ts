import { apiBase, handleApiResponse } from "./api-error";

type UnknownRecord = Record<string, unknown>;
type ApiRecord<T> = T | { data?: T; Data?: T };
type ApiList<T> =
  | T[]
  | {
      data?: T[] | { items?: T[]; results?: T[]; totalCount?: number; total?: number };
      Data?: T[] | { items?: T[]; results?: T[]; totalCount?: number; total?: number };
      items?: T[];
      results?: T[];
      totalCount?: number;
      total?: number;
    };

export type PageResult<T> = {
  items: T[];
  totalCount: number;
};

export type AccountStatus = "Active" | "Locked" | "Inactive";
export type BookingStatus =
  | "Available"
  | "Pending"
  | "Confirmed"
  | "CheckIn"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export type AdminBranch = {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
};

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  role?: string;
  status?: string;
  isVerified: boolean;
  createdAt?: string;
};

export type AdminBooking = {
  id: string;
  branchId?: string;
  branchName: string;
  customerName: string;
  customerEmail?: string;
  vehiclePlate: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  note?: string;
  createdAt?: string;
};

export type AdminBookingSlot = {
  id?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
  bookingId?: string;
  status?: string;
};

export type DashboardStats = {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalUsers: number;
  newUsers: number;
  [key: string]: unknown;
};

export type RevenueReport = {
  totalRevenue: number;
  totalBookings?: number;
  details: UnknownRecord[];
  [key: string]: unknown;
};

export type LoyaltyReport = {
  totalPoints: number;
  details: UnknownRecord[];
  [key: string]: unknown;
};

function adminEndpoint(path: string) {
  return `${apiBase()}/api/v1/admin${path}`;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function readString(record: UnknownRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  return fallback;
}

function readOptionalString(record: UnknownRecord, keys: string[]): string | undefined {
  const value = readString(record, keys);
  return value || undefined;
}

function readBoolean(record: UnknownRecord, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (normalized === "true" || normalized === "active") return true;
      if (normalized === "false" || normalized === "inactive" || normalized === "locked") return false;
    }
  }

  return fallback;
}

function readNumber(record: UnknownRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }

  return fallback;
}

function unwrapRecord<T>(body: ApiRecord<T>): T {
  if (body && typeof body === "object" && "data" in body && body.data) return body.data;
  if (body && typeof body === "object" && "Data" in body && body.Data) return body.Data;
  return body as T;
}

function unwrapPage<T>(body: ApiList<T>): PageResult<T> {
  if (Array.isArray(body)) return { items: body, totalCount: body.length };

  const data = body.data ?? body.Data;
  if (Array.isArray(data)) return { items: data, totalCount: body.totalCount ?? body.total ?? data.length };

  if (data && !Array.isArray(data)) {
    const items = data.items ?? data.results ?? [];
    return {
      items,
      totalCount: data.totalCount ?? data.total ?? body.totalCount ?? body.total ?? items.length,
    };
  }

  const items = body.items ?? body.results ?? [];
  return { items, totalCount: body.totalCount ?? body.total ?? items.length };
}

function normalizeBranch(raw: unknown): AdminBranch {
  const record = asRecord(raw);
  return {
    id: readString(record, ["id", "Id", "branchId", "BranchId"]),
    name: readString(record, ["name", "Name", "branchName", "BranchName"], "Chi nhánh"),
    address: readString(record, ["address", "Address", "location", "Location"]),
    isActive: readBoolean(record, ["isActive", "IsActive", "status", "Status"], true),
  };
}

function normalizeUser(raw: unknown): AdminUser {
  const record = asRecord(raw);
  const firstName = readString(record, ["firstName", "FirstName"]);
  const lastName = readString(record, ["lastName", "LastName"]);
  const fullName =
    readString(record, ["fullName", "FullName"]) || `${firstName} ${lastName}`.trim();

  return {
    id: readString(record, ["id", "Id", "userId", "UserId"]),
    email: readString(record, ["email", "Email"]),
    firstName,
    lastName,
    fullName: fullName || "Người dùng",
    phone: readOptionalString(record, ["phone", "Phone"]),
    role: readOptionalString(record, ["role", "Role"]),
    status: readOptionalString(record, ["status", "Status"]),
    isVerified: readBoolean(record, ["isVerified", "IsVerified", "isVerify", "IsVerify"], false),
    createdAt: readOptionalString(record, ["createdAt", "CreatedAt"]),
  };
}

function normalizeBooking(raw: unknown): AdminBooking {
  const record = asRecord(raw);
  const branch = asRecord(record.branch);
  const branchUpper = asRecord(record.Branch);
  const user = asRecord(record.user);
  const userUpper = asRecord(record.User);
  const vehicle = asRecord(record.vehicle);
  const vehicleUpper = asRecord(record.Vehicle);

  return {
    id: readString(record, ["id", "Id", "bookingId", "BookingId"]),
    branchId: readOptionalString(record, ["branchId", "BranchId"]),
    branchName:
      readString(record, ["branchName", "BranchName"]) ||
      readString(branch, ["name", "Name"]) ||
      readString(branchUpper, ["name", "Name"], "Chi nhánh"),
    customerName:
      readString(record, ["customerName", "CustomerName", "userName", "UserName"]) ||
      readString(user, ["fullName", "FullName", "email", "Email"]) ||
      readString(userUpper, ["fullName", "FullName", "email", "Email"], "Khách hàng"),
    customerEmail:
      readOptionalString(record, ["customerEmail", "CustomerEmail", "userEmail", "UserEmail"]) ??
      readOptionalString(user, ["email", "Email"]) ??
      readOptionalString(userUpper, ["email", "Email"]),
    vehiclePlate:
      readString(record, ["vehiclePlate", "VehiclePlate", "vehicleLicensePlate", "VehicleLicensePlate", "licensePlate", "LicensePlate"]) ||
      readString(vehicle, ["licensePlate", "LicensePlate", "plateNumber", "PlateNumber"]) ||
      readString(vehicleUpper, ["licensePlate", "LicensePlate", "plateNumber", "PlateNumber"]),
    bookingDate: readString(record, ["bookingDate", "BookingDate", "date", "Date"]),
    startTime: readString(record, ["startTime", "StartTime"]),
    endTime: readOptionalString(record, ["endTime", "EndTime"]),
    status: readString(record, ["status", "Status"], "Pending"),
    note: readOptionalString(record, ["note", "Note"]),
    createdAt: readOptionalString(record, ["createdAt", "CreatedAt"]),
  };
}

function normalizeSlot(raw: unknown): AdminBookingSlot {
  const record = asRecord(raw);
  const status = readOptionalString(record, ["status", "Status"]);
  return {
    id: readOptionalString(record, ["id", "Id"]),
    time: readString(record, ["time", "Time", "slot", "Slot", "startTime", "StartTime"]),
    startTime: readOptionalString(record, ["startTime", "StartTime"]),
    endTime: readOptionalString(record, ["endTime", "EndTime"]),
    isAvailable:
      readBoolean(record, ["isAvailable", "IsAvailable", "available", "Available"], false) ||
      status === "Available",
    bookingId: readOptionalString(record, ["bookingId", "BookingId"]),
    status,
  };
}

function normalizeDashboard(raw: unknown): DashboardStats {
  const record = asRecord(unwrapRecord(raw as ApiRecord<unknown>));
  return {
    totalBookings: readNumber(record, ["totalBookings", "TotalBookings", "bookingCount", "BookingCount"]),
    completedBookings: readNumber(record, ["completedBookings", "CompletedBookings"]),
    cancelledBookings: readNumber(record, ["cancelledBookings", "CancelledBookings"]),
    totalRevenue: readNumber(record, ["totalRevenue", "TotalRevenue", "revenue", "Revenue"]),
    totalUsers: readNumber(record, ["totalUsers", "TotalUsers", "userCount", "UserCount"]),
    newUsers: readNumber(record, ["newUsers", "NewUsers"]),
    ...record,
  };
}

function normalizeRevenue(raw: unknown): RevenueReport {
  const record = asRecord(unwrapRecord(raw as ApiRecord<unknown>));
  const details = record.details ?? record.Details ?? record.items ?? record.Items ?? [];
  return {
    totalRevenue: readNumber(record, ["totalRevenue", "TotalRevenue", "revenue", "Revenue"]),
    totalBookings: readNumber(record, ["totalBookings", "TotalBookings"], undefined),
    details: Array.isArray(details) ? (details as UnknownRecord[]) : [],
    ...record,
  };
}

function normalizeLoyalty(raw: unknown): LoyaltyReport {
  const record = asRecord(unwrapRecord(raw as ApiRecord<unknown>));
  const details = record.details ?? record.Details ?? record.items ?? record.Items ?? [];
  return {
    totalPoints: readNumber(record, ["totalPoints", "TotalPoints", "points", "Points"]),
    details: Array.isArray(details) ? (details as UnknownRecord[]) : [],
    ...record,
  };
}

export async function getBranches(
  token: string,
  params: { isActive?: boolean; keyword?: string } = {},
): Promise<AdminBranch[]> {
  const query = new URLSearchParams();
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());

  const res = await fetch(adminEndpoint(`/branches?${query.toString()}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<ApiList<unknown>>(res);
  return unwrapPage(body).items.map(normalizeBranch);
}

export async function createBranch(
  token: string,
  data: { Name: string; Address: string },
): Promise<void> {
  const res = await fetch(adminEndpoint("/branches"), {
    method: "POST",
    cache: "no-store",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
  await handleApiResponse<unknown>(res);
}

export async function updateBranch(
  token: string,
  id: string,
  data: { Name?: string; Address?: string; IsActive?: boolean },
): Promise<void> {
  const res = await fetch(adminEndpoint(`/branches/${encodeURIComponent(id)}`), {
    method: "PATCH",
    cache: "no-store",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
  await handleApiResponse<unknown>(res);
}

export async function deleteBranch(token: string, id: string): Promise<void> {
  const res = await fetch(adminEndpoint(`/branches/${encodeURIComponent(id)}`), {
    method: "DELETE",
    cache: "no-store",
    headers: authHeaders(token),
  });
  await handleApiResponse<unknown>(res);
}

export async function getUsers(
  token: string,
  params: { searchTerm?: string; pageIndex?: number; pageSize?: number } = {},
): Promise<PageResult<AdminUser>> {
  const query = new URLSearchParams({
    pageIndex: String(params.pageIndex ?? 1),
    pageSize: String(params.pageSize ?? 10),
  });
  if (params.searchTerm?.trim()) query.set("searchTerm", params.searchTerm.trim());

  const res = await fetch(adminEndpoint(`/users?${query.toString()}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const page = unwrapPage(await handleApiResponse<ApiList<unknown>>(res));
  return { ...page, items: page.items.map(normalizeUser) };
}

export async function getPendingUsers(
  token: string,
  params: { searchTerm?: string; pageIndex?: number; pageSize?: number } = {},
): Promise<PageResult<AdminUser>> {
  const query = new URLSearchParams({
    pageIndex: String(params.pageIndex ?? 1),
    pageSize: String(params.pageSize ?? 10),
  });
  if (params.searchTerm?.trim()) query.set("searchTerm", params.searchTerm.trim());

  const res = await fetch(adminEndpoint(`/users/pending-verification?${query.toString()}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const page = unwrapPage(await handleApiResponse<ApiList<unknown>>(res));
  return { ...page, items: page.items.map(normalizeUser) };
}

export async function getUser(token: string, id: string): Promise<AdminUser> {
  const res = await fetch(adminEndpoint(`/users/${encodeURIComponent(id)}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  return normalizeUser(unwrapRecord(await handleApiResponse<ApiRecord<unknown>>(res)));
}

export async function verifyUser(token: string, id: string): Promise<void> {
  const res = await fetch(adminEndpoint(`/users/${encodeURIComponent(id)}/verify`), {
    method: "PATCH",
    cache: "no-store",
    headers: authHeaders(token),
  });
  await handleApiResponse<unknown>(res);
}

export async function updateUserStatus(
  token: string,
  id: string,
  status: AccountStatus,
): Promise<void> {
  const res = await fetch(adminEndpoint(`/users/${encodeURIComponent(id)}/status`), {
    method: "PATCH",
    cache: "no-store",
    headers: jsonHeaders(token),
    body: JSON.stringify({ Status: status }),
  });
  await handleApiResponse<unknown>(res);
}

export async function getUserStatus(token: string, id: string): Promise<string> {
  const res = await fetch(adminEndpoint(`/users/${encodeURIComponent(id)}/status`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = asRecord(unwrapRecord(await handleApiResponse<ApiRecord<unknown>>(res)));
  return readString(body, ["status", "Status"]);
}

export async function getAdminBookings(
  token: string,
  params: {
    BranchId?: string;
    Date?: string;
    Status?: BookingStatus | string;
    PageIndex?: number;
    PageSize?: number;
  } = {},
): Promise<PageResult<AdminBooking>> {
  const query = new URLSearchParams({
    PageIndex: String(params.PageIndex ?? 1),
    PageSize: String(params.PageSize ?? 10),
  });
  if (params.BranchId) query.set("BranchId", params.BranchId);
  if (params.Date) query.set("Date", params.Date);
  if (params.Status) query.set("Status", params.Status);

  const res = await fetch(adminEndpoint(`/bookings?${query.toString()}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const page = unwrapPage(await handleApiResponse<ApiList<unknown>>(res));
  return { ...page, items: page.items.map(normalizeBooking) };
}

export async function getBookingSlots(
  token: string,
  params: { BranchId: string; Date: string; PageIndex?: number; PageSize?: number },
): Promise<PageResult<AdminBookingSlot>> {
  const query = new URLSearchParams({
    BranchId: params.BranchId,
    Date: params.Date,
    PageIndex: String(params.PageIndex ?? 1),
    PageSize: String(params.PageSize ?? 10),
  });

  const res = await fetch(adminEndpoint(`/booking-slots?${query.toString()}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const page = unwrapPage(await handleApiResponse<ApiList<unknown>>(res));
  return { ...page, items: page.items.map(normalizeSlot) };
}

export async function completeBooking(token: string, id: string, note: string): Promise<void> {
  const res = await fetch(adminEndpoint(`/bookings/${encodeURIComponent(id)}/complete`), {
    method: "POST",
    cache: "no-store",
    headers: jsonHeaders(token),
    body: JSON.stringify({ Note: note }),
  });
  await handleApiResponse<unknown>(res);
}

export async function cancelAdminBooking(
  token: string,
  id: string,
  reason: string,
): Promise<void> {
  const res = await fetch(adminEndpoint(`/bookings/${encodeURIComponent(id)}/cancel`), {
    method: "POST",
    cache: "no-store",
    headers: jsonHeaders(token),
    body: JSON.stringify({ Reason: reason }),
  });
  await handleApiResponse<unknown>(res);
}

export async function getDashboardStats(
  token: string,
  params: { FromDate: string; ToDate: string; BranchId?: string },
): Promise<DashboardStats> {
  const query = new URLSearchParams({
    FromDate: params.FromDate,
    ToDate: params.ToDate,
  });
  if (params.BranchId) query.set("BranchId", params.BranchId);

  const res = await fetch(adminEndpoint(`/dashboard?${query.toString()}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  return normalizeDashboard(await handleApiResponse<unknown>(res));
}

export async function getRevenueReport(
  token: string,
  params: { FromDate: string; ToDate: string; BranchId?: string },
): Promise<RevenueReport> {
  const query = new URLSearchParams({
    FromDate: params.FromDate,
    ToDate: params.ToDate,
  });
  if (params.BranchId) query.set("BranchId", params.BranchId);

  const res = await fetch(adminEndpoint(`/reports/revenue?${query.toString()}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  return normalizeRevenue(await handleApiResponse<unknown>(res));
}

export async function getLoyaltyReport(
  token: string,
  params: { FromDate: string; ToDate: string },
): Promise<LoyaltyReport> {
  const query = new URLSearchParams({
    FromDate: params.FromDate,
    ToDate: params.ToDate,
  });

  const res = await fetch(adminEndpoint(`/reports/loyalty?${query.toString()}`), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  return normalizeLoyalty(await handleApiResponse<unknown>(res));
}
