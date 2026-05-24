// ─── Public Read API — Branches ───────────────────────────────────────────────
// Strategy: public data, revalidate every 5 minutes (300s)
// Called from Server Components or server-side helpers.
// Never pass Authorization token here.

import type { Branch } from '@/types/booking';
import { apiBase, handleApiResponse } from './api-error';

export async function getBranches(): Promise<Branch[]> {
  const url = `${apiBase()}/public/branches`;
  const res = await fetch(url, {
    next: { revalidate: 300 }, // ISR-style caching — branch list changes rarely
  });
  return handleApiResponse<Branch[]>(res);
}
