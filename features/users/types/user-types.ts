export type CustomerProfile = {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  email?: string;
  phone?: string;
  status?: string;
  rejectReason?: string;
};

export type UpdateCustomerProfilePayload = {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
};

export interface Wallet {
  id?: string;
  balance: number;
  currency?: string;
  updatedAt?: string;
}

export type WalletTopUpStatus =
  | "Pending"
  | "Succeeded"
  | "Failed"
  | "Expired"
  | "Cancelled";

export interface WalletTopUpPayment {
  transactionId: string;
  amount: number;
  currency: string;
  bankName: string;
  bankAccount: string;
  referenceCode: string;
  description: string;
  qrCode: string;
  status: WalletTopUpStatus;
  expiredAt: string;
  message: string;
}

export interface WalletTopUpStatusResult {
  transactionId: string;
  amount: number;
  currency: string;
  referenceCode: string;
  status: WalletTopUpStatus;
  createdAt: string | null;
  expiredAt: string | null;
  paidAt: string | null;
  externalTransactionId: string | null;
  bankReferenceCode: string | null;
}
