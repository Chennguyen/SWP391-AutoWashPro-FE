// ─── API Error Helper ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Lỗi ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? body?.error ?? message;
    } catch {
      // ignore parse error
    }

    if (message.toLowerCase().includes("unexpected error")) {
      message = "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.";
    }

    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return base;
}
