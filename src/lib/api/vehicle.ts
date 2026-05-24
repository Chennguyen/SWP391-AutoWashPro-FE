// ─── Vehicle API ──────────────────────────────────────────────────────────────
// Strategy: user-specific data — always no-store.
// Token must be passed from the caller (client component or server-side with cookies).

import type { Vehicle, AddVehiclePayload } from '@/types/vehicle';
import { apiBase, handleApiResponse } from './api-error';

/**
 * Fetch all vehicles belonging to the current user.
 * Pass the auth token from session/cookie.
 * cache: 'no-store' — never cache user personal data.
 */
export async function getVehicles(token: string): Promise<Vehicle[]> {
  const url = `${apiBase()}/vehicles`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleApiResponse<Vehicle[]>(res);
}

/**
 * Add a new vehicle for the current user.
 * Always POST — no caching.
 */
export async function addVehicle(
  token: string,
  payload: AddVehiclePayload,
): Promise<Vehicle> {
  const url = `${apiBase()}/vehicles`;
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<Vehicle>(res);
}
