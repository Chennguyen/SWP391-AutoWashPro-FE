export type CustomerProfile = {
  firstName: string;
  lastName: string;
  cccd: string;
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
