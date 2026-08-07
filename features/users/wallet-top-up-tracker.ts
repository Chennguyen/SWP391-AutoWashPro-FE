import type { WalletTopUpPayment } from "./types/user-types";

const STORAGE_KEY = "autowash-wallet-top-ups:v1";
const CHANGE_EVENT = "autowash-wallet-top-ups-changed";

export interface PendingWalletTopUp {
  transactionId: string;
  amount: number;
  ownerId: string;
}

const EMPTY_PENDING_TOP_UPS: readonly PendingWalletTopUp[] = [];

let cachedStorageValue: string | null | undefined;
let cachedPendingTopUps: readonly PendingWalletTopUp[] = EMPTY_PENDING_TOP_UPS;
let storageUnavailable = false;

function parsePendingTopUps(value: string | null): readonly PendingWalletTopUp[] {
  if (!value) return EMPTY_PENDING_TOP_UPS;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("items" in parsed) ||
      !Array.isArray(parsed.items)
    ) {
      return EMPTY_PENDING_TOP_UPS;
    }

    return parsed.items.flatMap((item): PendingWalletTopUp[] => {
      if (typeof item !== "object" || item === null) return [];

      const transactionId =
        "transactionId" in item && typeof item.transactionId === "string"
          ? item.transactionId.trim()
          : "";
      const amount =
        "amount" in item && typeof item.amount === "number"
          ? item.amount
          : Number.NaN;
      const ownerId =
        "ownerId" in item && typeof item.ownerId === "string"
          ? item.ownerId
          : "";

      return transactionId && Number.isFinite(amount) && amount > 0
        ? [{ transactionId, amount, ownerId }]
        : [];
    });
  } catch {
    return EMPTY_PENDING_TOP_UPS;
  }
}

export function getPendingWalletTopUpsSnapshot(): readonly PendingWalletTopUp[] {
  if (typeof window === "undefined") return EMPTY_PENDING_TOP_UPS;
  if (storageUnavailable) return cachedPendingTopUps;

  let storageValue: string | null;
  try {
    storageValue = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedPendingTopUps;
  }

  if (storageValue === cachedStorageValue) return cachedPendingTopUps;

  cachedStorageValue = storageValue;
  cachedPendingTopUps = parsePendingTopUps(storageValue);
  return cachedPendingTopUps;
}

export function getPendingWalletTopUpsServerSnapshot(): readonly PendingWalletTopUp[] {
  return EMPTY_PENDING_TOP_UPS;
}

export function subscribeToPendingWalletTopUps(
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) {
      storageUnavailable = false;
      cachedStorageValue = undefined;
      onStoreChange();
    }
  }

  function handleLocalChange() {
    onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleLocalChange);
  };
}

function writePendingWalletTopUps(items: readonly PendingWalletTopUp[]) {
  if (typeof window === "undefined") return;

  const storageValue = JSON.stringify({ version: 1, items });
  cachedStorageValue = storageValue;
  cachedPendingTopUps = items;

  try {
    window.localStorage.setItem(STORAGE_KEY, storageValue);
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
    // Polling vẫn tiếp tục trong phiên hiện tại nếu trình duyệt chặn storage.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function trackPendingWalletTopUp(payment: WalletTopUpPayment) {
  if (typeof window === "undefined") return;

  let ownerId = "";
  try {
    ownerId = window.localStorage.getItem("userId") ?? "";
  } catch {
    // ownerId chỉ dùng để tránh polling chéo tài khoản trên cùng trình duyệt.
  }
  const current = getPendingWalletTopUpsSnapshot();
  const next = current.filter(
    (item) => item.transactionId !== payment.transactionId,
  );

  writePendingWalletTopUps([
    ...next,
    {
      transactionId: payment.transactionId,
      amount: payment.amount,
      ownerId,
    },
  ]);
}

export function untrackPendingWalletTopUp(transactionId: string) {
  const current = getPendingWalletTopUpsSnapshot();
  const next = current.filter((item) => item.transactionId !== transactionId);

  if (next.length !== current.length) {
    writePendingWalletTopUps(next);
  }
}
