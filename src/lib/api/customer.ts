import { apiBase, handleApiResponse } from "./api-error";

export type CustomerProfile = {
  firstName: string;
  lastName: string;
  cccd: string;
};

type CustomerProfileRecord = {
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  cccd?: string;
  Cccd?: string;
  CCCD?: string;
};

type CustomerProfileResponse =
  | CustomerProfileRecord
  | {
      data?: CustomerProfileRecord;
    };

export type UpdateCustomerProfilePayload = {
  firstName: string;
  lastName: string;
  cccd: string;
};

function customerEndpoint(path = "") {
  return `${apiBase()}/api/v1/me${path}`;
}

function unwrapProfile(body: CustomerProfileResponse): CustomerProfileRecord {
  return "data" in body && body.data ? body.data : (body as CustomerProfileRecord);
}

function normalizeProfile(body: CustomerProfileResponse): CustomerProfile {
  const data = unwrapProfile(body);

  return {
    firstName: data.firstName ?? data.FirstName ?? "",
    lastName: data.lastName ?? data.LastName ?? "",
    cccd: data.cccd ?? data.Cccd ?? data.CCCD ?? "",
  };
}

export async function getCustomerProfile(token: string): Promise<CustomerProfile> {
  const res = await fetch(customerEndpoint(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const body = await handleApiResponse<CustomerProfileResponse>(res);
  return normalizeProfile(body);
}

export async function updateCustomerProfile(
  token: string,
  payload: UpdateCustomerProfilePayload,
): Promise<CustomerProfile> {
  const res = await fetch(customerEndpoint(), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await handleApiResponse<CustomerProfileResponse>(res);
  return normalizeProfile(body);
}

export async function changeCustomerPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(customerEndpoint("/password"), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newPassword }),
  });

  await handleApiResponse<unknown>(res);
}
