import type {
  BookingResult,
  BookingSlot,
  CreateBookingPayload,
  CustomerBooking,
} from "@/types/booking";
import { apiBase, handleApiResponse } from "./api-error";

type SlotRecord = {
  id?: string | number;
  Id?: string | number;
  bookingId?: string | number;
  BookingId?: string | number;
  time?: string;
  Time?: string;
  slot?: string;
  Slot?: string;
  startTime?: string;
  StartTime?: string;
  endTime?: string;
  EndTime?: string;
  available?: boolean;
  Available?: boolean;
  isAvailable?: boolean;
  IsAvailable?: boolean;
  booked?: boolean;
  Booked?: boolean;
  isBooked?: boolean;
  IsBooked?: boolean;
  occupied?: boolean;
  Occupied?: boolean;
  status?: string;
  Status?: string;
};

type SlotListResponse =
  | SlotRecord[]
  | {
      data?: SlotRecord[] | { items?: SlotRecord[]; results?: SlotRecord[] };
      Data?: SlotRecord[] | { items?: SlotRecord[]; results?: SlotRecord[] };
      items?: SlotRecord[];
      results?: SlotRecord[];
    };

type BookingResponse = {
  id?: string | number;
  Id?: string | number;
  bookingId?: string | number;
  BookingId?: string | number;
  confirmationCode?: string;
  ConfirmationCode?: string;
  code?: string;
  Code?: string;
  message?: string;
  Message?: string;
  data?: BookingResponse;
  Data?: BookingResponse;
};

type NestedName = {
  id?: string | number;
  Id?: string | number;
  branchId?: string | number;
  BranchId?: string | number;
  vehicleId?: string | number;
  VehicleId?: string | number;
  name?: string;
  Name?: string;
  address?: string;
  Address?: string;
  licensePlate?: string;
  LicensePlate?: string;
  plateNumber?: string;
  PlateNumber?: string;
};

type CustomerBookingRecord = {
  id?: string | number;
  Id?: string | number;
  bookingId?: string | number;
  BookingId?: string | number;
  branchId?: string | number;
  BranchId?: string | number;
  branchName?: string;
  BranchName?: string;
  branchAddress?: string;
  BranchAddress?: string;
  branch?: NestedName;
  Branch?: NestedName;
  vehicleLicensePlate?: string;
  VehicleLicensePlate?: string;
  licensePlate?: string;
  LicensePlate?: string;
  vehicle?: NestedName;
  Vehicle?: NestedName;
  vehicleId?: string | number;
  VehicleId?: string | number;
  bookingDate?: string;
  BookingDate?: string;
  date?: string;
  Date?: string;
  startTime?: string;
  StartTime?: string;
  endTime?: string;
  EndTime?: string;
  status?: string;
  Status?: string;
  serviceName?: string;
  ServiceName?: string;
  service?: NestedName;
  Service?: NestedName;
  totalPrice?: number;
  TotalPrice?: number;
  price?: number;
  Price?: number;
  cancelReason?: string;
  CancelReason?: string;
};

type BookingListResponse =
  | CustomerBookingRecord[]
  | {
      data?:
        | CustomerBookingRecord[]
        | { items?: CustomerBookingRecord[]; results?: CustomerBookingRecord[] };
      Data?:
        | CustomerBookingRecord[]
        | { items?: CustomerBookingRecord[]; results?: CustomerBookingRecord[] };
      items?: CustomerBookingRecord[];
      results?: CustomerBookingRecord[];
    };

function unwrapList(body: SlotListResponse): SlotRecord[] {
  if (Array.isArray(body)) {
    return body;
  }

  const data = body.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (data && !Array.isArray(data)) {
    return data.items ?? data.results ?? [];
  }

  const upperData = body.Data;
  if (Array.isArray(upperData)) {
    return upperData;
  }

  if (upperData && !Array.isArray(upperData)) {
    return upperData.items ?? upperData.results ?? [];
  }

  return body.items ?? body.results ?? [];
}

/** Convert YYYY-MM-DD → DD/MM/YYYY. Returns the original value if it does not match. */
function toViDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return isoDate;
}

function toHHMM(value = ""): string {
  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }

  const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  return value;
}

function availabilityFromStatus(status?: string): boolean | undefined {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (
    normalized.includes("notavailable") ||
    normalized.includes("not available") ||
    normalized.includes("unavailable") ||
    normalized.includes("book") ||
    normalized.includes("reserved") ||
    normalized.includes("busy") ||
    normalized.includes("pending") ||
    normalized.includes("confirm") ||
    normalized.includes("cancel") ||
    normalized.includes("checkin") ||
    normalized.includes("check-in") ||
    normalized.includes("progress") ||
    normalized.includes("complete")
  ) {
    return false;
  }

  if (
    normalized.includes("available") ||
    normalized.includes("free") ||
    normalized.includes("open")
  ) {
    return true;
  }

  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "available"].includes(normalized)) return true;
    if (["false", "0", "no", "unavailable", "notavailable", "booked"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

function normalizeSlot(raw: SlotRecord): BookingSlot {
  const status = raw.status ?? raw.Status;
  const hasBookingReference = raw.bookingId !== undefined || raw.BookingId !== undefined;
  const isBooked =
    booleanValue(raw.booked ?? raw.Booked) ??
    booleanValue(raw.isBooked ?? raw.IsBooked) ??
    booleanValue(raw.occupied ?? raw.Occupied) ??
    (hasBookingReference ? true : undefined);
  const explicitAvailable =
    availabilityFromStatus(status) ??
    booleanValue(raw.available ?? raw.Available) ??
    booleanValue(raw.isAvailable ?? raw.IsAvailable) ??
    (isBooked !== undefined ? !isBooked : undefined);
  const available = explicitAvailable ?? true;

  const time = toHHMM(
    raw.time ?? raw.Time ?? raw.slot ?? raw.Slot ?? raw.startTime ?? raw.StartTime ?? "",
  );
  
  const endTimeRaw = raw.endTime ?? raw.EndTime ?? "";
  const endTime = endTimeRaw ? toHHMM(endTimeRaw) : undefined;

  return {
    time,
    endTime,
    available,
    availabilityExplicit: explicitAvailable !== undefined,
  };
}

function normalizeBookingResult(body: BookingResponse): BookingResult {
  const raw = body.data ?? body.Data ?? body;
  const bookingId = String(raw.bookingId ?? raw.BookingId ?? raw.id ?? raw.Id ?? "");

  return {
    bookingId,
    id:
      raw.id !== undefined || raw.Id !== undefined
        ? String(raw.id ?? raw.Id)
        : undefined,
    confirmationCode:
      raw.confirmationCode ?? raw.ConfirmationCode ?? raw.code ?? raw.Code,
    message: raw.message ?? raw.Message,
  };
}

function unwrapBookings(body: BookingListResponse): CustomerBookingRecord[] {
  if (Array.isArray(body)) {
    return body;
  }

  const data = body.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (data && !Array.isArray(data)) {
    return data.items ?? data.results ?? [];
  }

  const upperData = body.Data;
  if (Array.isArray(upperData)) {
    return upperData;
  }

  if (upperData && !Array.isArray(upperData)) {
    return upperData.items ?? upperData.results ?? [];
  }

  return body.items ?? body.results ?? [];
}

function normalizeCustomerBooking(raw: CustomerBookingRecord): CustomerBooking {
  const branch = raw.branch ?? raw.Branch;
  const vehicle = raw.vehicle ?? raw.Vehicle;
  const service = raw.service ?? raw.Service;

  return {
    id: String(raw.id ?? raw.Id ?? raw.bookingId ?? raw.BookingId ?? ""),
    branchId:
      raw.branchId !== undefined || raw.BranchId !== undefined
        ? String(raw.branchId ?? raw.BranchId)
        : branch?.id !== undefined ||
            branch?.Id !== undefined ||
            branch?.branchId !== undefined ||
            branch?.BranchId !== undefined
          ? String(branch?.id ?? branch?.Id ?? branch?.branchId ?? branch?.BranchId)
          : undefined,
    vehicleId:
      raw.vehicleId !== undefined || raw.VehicleId !== undefined
        ? String(raw.vehicleId ?? raw.VehicleId)
        : vehicle?.id !== undefined ||
            vehicle?.Id !== undefined ||
            vehicle?.vehicleId !== undefined ||
            vehicle?.VehicleId !== undefined
          ? String(vehicle?.id ?? vehicle?.Id ?? vehicle?.vehicleId ?? vehicle?.VehicleId)
          : undefined,
    branchName:
      raw.branchName ??
      raw.BranchName ??
      branch?.name ??
      branch?.Name ??
      "AutoWash Pro",
    branchAddress:
      raw.branchAddress ?? raw.BranchAddress ?? branch?.address ?? branch?.Address,
    vehicleLicensePlate:
      raw.vehicleLicensePlate ??
      raw.VehicleLicensePlate ??
      raw.licensePlate ??
      raw.LicensePlate ??
      vehicle?.licensePlate ??
      vehicle?.LicensePlate ??
      vehicle?.plateNumber ??
      vehicle?.PlateNumber ??
      "",
    bookingDate: raw.bookingDate ?? raw.BookingDate ?? raw.date ?? raw.Date ?? "",
    startTime: raw.startTime ?? raw.StartTime ?? "",
    endTime: raw.endTime ?? raw.EndTime,
    status: raw.status ?? raw.Status ?? "Đã đặt",
    serviceName: raw.serviceName ?? raw.ServiceName ?? service?.name ?? service?.Name,
    totalPrice: raw.totalPrice ?? raw.TotalPrice ?? raw.price ?? raw.Price,
    cancelReason: raw.cancelReason ?? raw.CancelReason,
  };
}

export async function getSlots(
  token: string,
  branchId: string,
  date: string,
): Promise<BookingSlot[]> {
  const params = new URLSearchParams({
    BranchId: branchId,
    Date: date,
    branchId: branchId,
    date: date,
  });

  const res = await fetch(`${apiBase()}/api/v1/bookings/slot?${params.toString()}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await handleApiResponse<SlotListResponse>(res);
  const rawList = unwrapList(body);
  return rawList.map(normalizeSlot).filter((slot) => slot.time);
}

export async function createBooking(
  token: string,
  payload: CreateBookingPayload,
): Promise<BookingResult> {
  const res = await fetch(`${apiBase()}/api/v1/bookings/`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      branchId: payload.branchId,
      vehicleId: payload.vehicleId,
      voucherId: payload.voucherId,
      bookingDate: payload.bookingDate,
      startTime: payload.startTime,
      redemPoint: payload.redemPoint,
    }),
  });
  const body = await handleApiResponse<BookingResponse>(res);
  return normalizeBookingResult(body);
}

export async function getBookings(
  token: string,
  fromDate: string,
  toDate: string,
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<CustomerBooking[]> {
  // Send both YYYY-MM-DD (ISO) and DD/MM/YYYY (Vietnamese) formats so the
  // backend date filter works regardless of which format it expects.
  const fromVi = toViDate(fromDate);
  const toVi = toViDate(toDate);
  const params = new URLSearchParams({
    fromDate,
    toDate,
    FromDate: fromVi,
    ToDate: toVi,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (status) {
    params.set("status", status);
  }

  const res = await fetch(`${apiBase()}/api/v1/bookings/?${params.toString()}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await handleApiResponse<BookingListResponse>(res);
  return unwrapBookings(body).map(normalizeCustomerBooking);
}

export async function getBooking(token: string, id: string): Promise<CustomerBooking> {
  const res = await fetch(`${apiBase()}/api/v1/bookings/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const raw = await handleApiResponse<
    { data?: CustomerBookingRecord; Data?: CustomerBookingRecord } | CustomerBookingRecord
  >(res);
  const record =
    ("data" in raw && raw.data ? raw.data : "Data" in raw && raw.Data ? raw.Data : raw) as CustomerBookingRecord;
  return normalizeCustomerBooking(record);
}

export async function checkInBooking(token: string, id: string): Promise<void> {
  const res = await fetch(
    `${apiBase()}/api/v1/bookings/${encodeURIComponent(id)}/check-in`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    },
  );
  await handleApiResponse<unknown>(res);
}

export async function cancelBooking(
  token: string,
  id: string,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `${apiBase()}/api/v1/bookings/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ Reason: reason }),
    },
  );

  if (res.status === 204) return;
  await handleApiResponse<unknown>(res);
}
