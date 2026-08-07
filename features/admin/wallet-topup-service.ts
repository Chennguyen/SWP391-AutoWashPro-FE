import { axiosInstance } from "@/lib/axios";
import type {
  WalletTopUpRevenueSummary,
  WalletTopUpTransactionFilters,
  WalletTopUpTransactionPage,
  WalletTopUpTransactionQuery,
} from "@/features/admin/types/admin-types";

type ApiEnvelope<T> = {
  data?: T;
  Data?: T;
};

const SUMMARY_PAGE_SIZE = 100;

function toSearchParams(params: WalletTopUpTransactionQuery) {
  const searchParams = new URLSearchParams({
    pageIndex: String(params.pageIndex),
    pageSize: String(params.pageSize),
  });

  if (params.keyword?.trim()) {
    searchParams.set("keyword", params.keyword.trim());
  }
  if (params.status) searchParams.set("status", params.status);
  if (params.fromDate) searchParams.set("fromDate", params.fromDate);
  if (params.toDate) searchParams.set("toDate", params.toDate);
  if (params.minAmount !== undefined) {
    searchParams.set("minAmount", String(params.minAmount));
  }
  if (params.maxAmount !== undefined) {
    searchParams.set("maxAmount", String(params.maxAmount));
  }

  return searchParams;
}

function unwrapPage(payload: ApiEnvelope<WalletTopUpTransactionPage> | WalletTopUpTransactionPage) {
  if ("data" in payload && payload.data) return payload.data;
  if ("Data" in payload && payload.Data) return payload.Data;
  return payload as WalletTopUpTransactionPage;
}

export async function getWalletTopUpTransactions(
  token: string,
  params: WalletTopUpTransactionQuery,
): Promise<WalletTopUpTransactionPage> {
  void token;
  const searchParams = toSearchParams(params);
  const response = await axiosInstance.get<
    ApiEnvelope<WalletTopUpTransactionPage> | WalletTopUpTransactionPage
  >(`/api/v1/admin/wallet-topup-transactions?${searchParams.toString()}`);

  return unwrapPage(response.data);
}

export async function getWalletTopUpRevenueSummary(
  token: string,
  filters: WalletTopUpTransactionFilters,
): Promise<WalletTopUpRevenueSummary> {
  if (filters.status && filters.status !== "Succeeded") {
    return { totalRevenue: 0, succeededTransactions: 0 };
  }

  const summaryFilters: WalletTopUpTransactionFilters = {
    ...filters,
    status: "Succeeded",
  };
  const firstPage = await getWalletTopUpTransactions(token, {
    ...summaryFilters,
    pageIndex: 1,
    pageSize: SUMMARY_PAGE_SIZE,
  });
  const totalPages = Math.ceil(firstPage.totalItems / SUMMARY_PAGE_SIZE);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      getWalletTopUpTransactions(token, {
        ...summaryFilters,
        pageIndex: index + 2,
        pageSize: SUMMARY_PAGE_SIZE,
      }),
    ),
  );
  const succeededTransactions = [
    ...firstPage.items,
    ...remainingPages.flatMap((page) => page.items),
  ];

  return {
    totalRevenue: succeededTransactions.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    ),
    succeededTransactions: firstPage.totalItems,
  };
}
