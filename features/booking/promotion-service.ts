import { apiBase, handleApiResponse } from "@/lib/api-error";

export type AppliedPromotion = {
  id: string;
  name: string;
  description: string;
  discountType: "Percentage" | "FixedAmount";
  discountValue: number;
  endTime: string | null;
};

type AppliedPromotionRecord = {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  description?: string | null;
  Description?: string | null;
  discountType?: string | number;
  DiscountType?: string | number;
  discountValue?: number | string;
  DiscountValue?: number | string;
  endTime?: string | null;
  EndTime?: string | null;
  endDate?: string | null;
  EndDate?: string | null;
};

type AppliedPromotionResponse =
  | AppliedPromotionRecord[]
  | {
      data?: AppliedPromotionRecord[];
      Data?: AppliedPromotionRecord[];
    }
  | null;

function normalizeDiscountType(
  value: string | number | undefined,
): AppliedPromotion["discountType"] {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "percentage" || normalized === "0") {
    return "Percentage";
  }
  if (normalized === "fixedamount" || normalized === "1") {
    return "FixedAmount";
  }

  throw new Error("API trả về loại khuyến mãi không hợp lệ.");
}

function normalizePromotion(
  promotion: AppliedPromotionRecord,
): AppliedPromotion {
  const id = String(promotion.id ?? promotion.Id ?? "").trim();
  const name = String(promotion.name ?? promotion.Name ?? "").trim();
  const discountValue = Number(
    promotion.discountValue ?? promotion.DiscountValue,
  );

  if (!id || !name || !Number.isFinite(discountValue)) {
    throw new Error("API trả về dữ liệu khuyến mãi không hợp lệ.");
  }

  return {
    id,
    name,
    description: String(
      promotion.description ?? promotion.Description ?? "",
    ),
    discountType: normalizeDiscountType(
      promotion.discountType ?? promotion.DiscountType,
    ),
    discountValue,
    endTime:
      promotion.endTime ??
      promotion.EndTime ??
      promotion.endDate ??
      promotion.EndDate ??
      null,
  };
}

export async function getAppliedPromotions(
  token: string,
): Promise<AppliedPromotion[]> {
  const response = await fetch(`${apiBase()}/api/v1/promotions/available`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await handleApiResponse<AppliedPromotionResponse>(response);
  let promotions: AppliedPromotionRecord[];

  if (Array.isArray(body)) {
    promotions = body;
  } else if (body && Array.isArray(body.data ?? body.Data)) {
    promotions = body.data ?? body.Data ?? [];
  } else {
    throw new Error("API trả về danh sách khuyến mãi không hợp lệ.");
  }

  return promotions.map(normalizePromotion);
}
