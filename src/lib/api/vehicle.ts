import type {
  AddVehiclePayload,
  UpdateVehiclePayload,
  Vehicle,
  VehicleType,
} from "@/types/vehicle";
import { apiBase, handleApiResponse } from "./api-error";

type VehicleRecord = {
  id?: string | number;
  Id?: string | number;
  ID?: string | number;
  vehicleId?: string | number;
  vehicleID?: string | number;
  VehicleId?: string | number;
  VehicleID?: string | number;
  plateNumber?: string;
  PlateNumber?: string;
  licensePlate?: string;
  LicensePlate?: string;
  brand?: string;
  Brand?: string;
  model?: string;
  Model?: string;
  color?: string;
  Color?: string;
  vehicleType?: VehicleType;
  VehicleType?: VehicleType;
  licensePlateImageUrl?: string;
  LicensePlateImageUrl?: string;
};

type VehicleListResponse =
  | VehicleRecord[]
  | {
      data?: VehicleRecord[] | { items?: VehicleRecord[]; results?: VehicleRecord[] };
      items?: VehicleRecord[];
      results?: VehicleRecord[];
    };

function vehiclesEndpoint(path = ""): string {
  return `${apiBase()}/api/v1/vehicles${path}`;
}

function vehicleEndpoint(id: string, query = ""): string {
  const suffix = query ? `?${query}` : "";
  return vehiclesEndpoint(`/${encodeURIComponent(id)}${suffix}`);
}

function stringValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function normalizeVehicle(raw: VehicleRecord): Vehicle {
  const id = stringValue(
    raw.vehicleId ??
      raw.vehicleID ??
      raw.VehicleId ??
      raw.VehicleID ??
      raw.id ??
      raw.Id ??
      raw.ID,
  );
  const licensePlate = stringValue(
    raw.licensePlate ?? raw.LicensePlate ?? raw.plateNumber ?? raw.PlateNumber,
  );

  return {
    id: id || licensePlate,
    plateNumber: licensePlate,
    licensePlate,
    brand: stringValue(raw.brand ?? raw.Brand),
    model: stringValue(raw.model ?? raw.Model),
    color: stringValue(raw.color ?? raw.Color),
    vehicleType: raw.vehicleType ?? raw.VehicleType ?? "OTHER",
    licensePlateImageUrl: raw.licensePlateImageUrl ?? raw.LicensePlateImageUrl,
  };
}

function normalizeVehicles(body: VehicleListResponse): Vehicle[] {
  if (Array.isArray(body)) {
    return body.map(normalizeVehicle);
  }

  const data = body.data;
  if (Array.isArray(data)) {
    return data.map(normalizeVehicle);
  }

  if (data && !Array.isArray(data)) {
    return (data.items ?? data.results ?? []).map(normalizeVehicle);
  }

  return (body.items ?? body.results ?? []).map(normalizeVehicle);
}

function unwrapVehicle(body: VehicleRecord | { data?: VehicleRecord }): VehicleRecord {
  return "data" in body && body.data ? body.data : (body as VehicleRecord);
}

export async function getVehicles(token: string, page = 1, pageSize = 20): Promise<Vehicle[]> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(vehiclesEndpoint(`?${params.toString()}`), {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await handleApiResponse<VehicleListResponse>(res);
  return normalizeVehicles(body);
}

export async function getVehicle(token: string, id: string): Promise<Vehicle> {
  const params = new URLSearchParams({
    _: String(Date.now()),
  });

  const res = await fetch(vehicleEndpoint(id, params.toString()), {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  const body = await handleApiResponse<VehicleRecord | { data?: VehicleRecord }>(res);
  return normalizeVehicle(unwrapVehicle(body));
}

export async function addVehicle(
  token: string,
  payload: AddVehiclePayload,
): Promise<Vehicle> {
  const form = new FormData();
  form.append("LicensePlate", payload.licensePlate);
  form.append("Brand", payload.brand);
  form.append("Model", payload.model);
  form.append("Color", payload.color);
  form.append("LicensePlateImageUrl", payload.licensePlateImageFile);

  const res = await fetch(vehiclesEndpoint(), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  const body = await handleApiResponse<VehicleRecord | { data?: VehicleRecord }>(res);
  return normalizeVehicle(unwrapVehicle(body));
}

export async function updateVehicle(
  token: string,
  id: string,
  payload: UpdateVehiclePayload,
): Promise<Vehicle> {
  const res = await fetch(vehicleEndpoint(id), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      brand: payload.brand,
      model: payload.model,
      color: payload.color,
    }),
  });
  const body = await handleApiResponse<VehicleRecord | { data?: VehicleRecord }>(res);
  return normalizeVehicle(unwrapVehicle(body));
}

export async function deleteVehicle(token: string, id: string): Promise<void> {
  const res = await fetch(vehicleEndpoint(id), {
    method: "DELETE",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 204) {
    return;
  }

  await handleApiResponse<unknown>(res);
}
