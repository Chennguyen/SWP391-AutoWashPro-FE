export type TransactionType = "Deposit" | "FullPayment" | "WalletTopup" | string;

export interface TransactionItem {
  transactionId: string;
  customerId: string;
  bookingId?: string | null;
  amount: number;
  type: number | TransactionType; // Có thể nhận enum số từ backend hoặc chuỗi quy đổi
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt?: string;
  status?: number | string | null;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface GetTransactionsResponse {
  transactions: TransactionItem[];
  pagination: PaginationInfo;
}
