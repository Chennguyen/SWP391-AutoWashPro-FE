export type CustomerProfile = {
  firstName: string;
  lastName: string;
  cccd: string;
  email?: string;
  phone?: string;
  status?: string;
  rejectReason?: string;
};

export type UpdateCustomerProfilePayload = {
  firstName: string;
  lastName: string;
  cccd: string;
  phone?: string;
};

export interface Wallet {
  id?: string;
  balance: number;
  currency?: string;
  updatedAt?: string;
}
