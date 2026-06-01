export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyErrors(errors: unknown): string | null {
  if (Array.isArray(errors)) {
    return errors.map(String).filter(Boolean).join(" ");
  }

  if (!isRecord(errors)) {
    return null;
  }

  return Object.entries(errors)
    .flatMap(([field, messages]) => {
      if (Array.isArray(messages)) {
        return messages.map((message) => `${field}: ${String(message)}`);
      }

      return [`${field}: ${String(messages)}`];
    })
    .filter(Boolean)
    .join(" ");
}

function pickErrorMessage(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (!isRecord(body)) {
    return `Lỗi ${status}`;
  }

  const errors = stringifyErrors(body.errors);
  const message =
    body.message ??
    body.error ??
    body.detail ??
    errors ??
    body.title ??
    `Lỗi ${status}`;

  return String(message);
}

export async function handleApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    let message = pickErrorMessage(body, res.status);

    if (message.toLowerCase().includes("unexpected error")) {
      message = `Có lỗi hệ thống xảy ra (Status: ${res.status}). Vui lòng thử lại sau.`;
    }

    throw new ApiError(message, res.status);
  }

  return body as T;
}

export function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return base;
}
