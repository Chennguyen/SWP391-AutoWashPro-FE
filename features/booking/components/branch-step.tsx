import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Branch } from "@/features/booking/types/booking-types";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, MapPin } from "lucide-react";

interface BranchStepProps {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  selected: Branch | null;
  onSelect: (branch: Branch) => void;
  onNext: () => void;
}

/**
 * Thành phần (Component) BranchStep
 *
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function BranchStep({
  branches,
  loading,
  error,
  usingMock,
  selected,
  onSelect,
  onNext,
}: BranchStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Chọn chi nhánh
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn chi nhánh AutoWash Pro gần bạn nhất.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {usingMock ? (
        <Alert>
          <AlertDescription>Đang dùng dữ liệu chi nhánh test.</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && branches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
            <MapPin className="mb-4 text-muted-foreground" aria-hidden />
            <p className="font-semibold text-foreground">
              Chưa có chi nhánh nào khả dụng.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vui lòng thử lại sau.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {branches.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {branches.map((branch) => {
            const isActive = branch.status === "ACTIVE";
            const isSelected = selected?.id === branch.id;

            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => isActive && onSelect(branch)}
                disabled={!isActive}
                aria-pressed={isSelected}
                className={cn(
                  "group rounded-xl border bg-card p-0 text-left text-card-foreground ring-offset-background transition hover:-translate-y-0.5 hover:ring-2 hover:ring-ring/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
                  isSelected && "border-primary ring-2 ring-ring/30",
                  isActive &&
                    !isSelected &&
                    "border-border hover:border-foreground/30",
                  !isActive && "cursor-not-allowed opacity-55",
                )}
              >
                <Card className="h-full border-0 bg-transparent py-4 ring-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">
                          {branch.name}
                        </CardTitle>
                        <CardDescription>
                          {branch.status === "ACTIVE"
                            ? "Đang nhận lịch"
                            : "Tạm ngưng"}
                        </CardDescription>
                      </div>
                      {isSelected ? (
                        <CheckCircle2
                          className="shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : (
                        <Badge variant={isActive ? "secondary" : "outline"}>
                          {isActive ? "Có thể chọn" : "Không khả dụng"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 pb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="shrink-0" aria-hidden />
                      <span className="truncate">{branch.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="shrink-0" aria-hidden />
                      <span>
                        {branch.openTime} - {branch.closeTime}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={onNext}
          disabled={!selected}
          size="lg"
          className="min-w-32"
        >
          Tiếp tục
        </Button>
      </div>
    </div>
  );
}
