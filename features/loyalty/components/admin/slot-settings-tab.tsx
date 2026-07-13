"use client";

import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Save } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLoyaltySettings,
  updateSystemConfig,
  type LoyaltyPointsConfig,
} from "@/features/loyalty/loyalty-admin-service";
import { AdminError } from "@/features/admin/components/admin-ui";

interface Props {
  token: string;
}

const slotSettingsSchema = z.object({
  slotDurationMinutes: z
    .number({ error: "Khoảng cách giữa các slot phải là một số." })
    .int("Khoảng cách giữa các slot phải là số nguyên.")
    .min(1, "Khoảng cách giữa các slot phải từ 1 phút.")
    .max(60, "Khoảng cách giữa các slot không được vượt quá 60 phút."),
  slotBreakMinutes: z
    .number({ error: "Thời gian nghỉ giữa các slot phải là một số." })
    .int("Thời gian nghỉ giữa các slot phải là số nguyên.")
    .min(1, "Thời gian nghỉ giữa các slot phải từ 1 phút.")
    .max(60, "Thời gian nghỉ giữa các slot không được vượt quá 60 phút."),
  workingStartHour: z.string(),
  workingEndHour: z.string(),
  cancellationDeadlineHours: z
    .number({ error: "Hạn chót hủy lịch phải là một số." })
    .int("Hạn chót hủy lịch phải là số nguyên.")
    .min(0, "Hạn chót hủy lịch phải lớn hơn hoặc bằng 0."),
  cancelTimeMinutes: z
    .number({ error: "Thời gian tự động hủy phải là một số." })
    .int("Thời gian tự động hủy phải là số nguyên.")
    .min(1, "Thời gian tự động hủy phải từ 1 phút."),
});

type SlotSettingsFormValues = z.infer<typeof slotSettingsSchema>;

const defaultValues: SlotSettingsFormValues = {
  slotDurationMinutes: 15,
  slotBreakMinutes: 1,
  workingStartHour: "08:00",
  workingEndHour: "17:00",
  cancellationDeadlineHours: 72,
  cancelTimeMinutes: 3,
};

const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  `${String(hour).padStart(2, "0")}:00`,
);

/**
 * Quản lý cấu hình thời lượng slot, thời gian nghỉ và khung giờ đặt lịch.
 */
export function SlotSettingsTab({ token }: Props) {
  const [settings, setSettings] = useState<LoyaltyPointsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SlotSettingsFormValues>({
    resolver: zodResolver(slotSettingsSchema),
    defaultValues,
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getLoyaltySettings(token);
      setSettings(data);
      reset({
        slotDurationMinutes: data.slotDurationMinutes ?? defaultValues.slotDurationMinutes,
        slotBreakMinutes: data.slotBreakMinutes ?? defaultValues.slotBreakMinutes,
        workingStartHour: data.workingStartHour ?? defaultValues.workingStartHour,
        workingEndHour: data.workingEndHour ?? defaultValues.workingEndHour,
        cancellationDeadlineHours:
          data.cancellationDeadlineHours ?? defaultValues.cancellationDeadlineHours,
        cancelTimeMinutes: data.cancelTimeMinutes ?? defaultValues.cancelTimeMinutes,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải cài đặt.");
    } finally {
      setLoading(false);
    }
  }, [reset, token]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function onSubmit(values: SlotSettingsFormValues) {
    setError(null);
    setSuccess(false);

    try {
      const startHour = Number(values.workingStartHour.split(":")[0]);
      const endHour = Number(values.workingEndHour.split(":")[0]);

      await Promise.all([
        updateSystemConfig(token, "SlotDurationMinutes", values.slotDurationMinutes),
        updateSystemConfig(token, "SlotBreakMinutes", values.slotBreakMinutes),
        updateSystemConfig(token, "WorkingStartHour", startHour),
        updateSystemConfig(token, "WorkingEndHour", endHour),
        updateSystemConfig(token, "CancellationDeadlineHours", values.cancellationDeadlineHours),
        updateSystemConfig(token, "CancelTimeMinutes", values.cancelTimeMinutes),
      ]);
      setSuccess(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu cài đặt.");
    }
  }

  if (loading && !settings) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Đang tải cài đặt...</div>;
  }

  return (
    <div className="admin-brand-surface max-w-xl">
      {error ? <AdminError message={error} onRetry={load} /> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
          <h3 className="border-b pb-2 font-bold text-foreground">
            Cấu hình Đặt lịch (Booking Slots)
          </h3>

          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.slotDurationMinutes)}>
                <FieldLabel htmlFor="slot-duration">Khoảng cách giữa các slot (phút)</FieldLabel>
                <Input
                  id="slot-duration"
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  aria-invalid={Boolean(errors.slotDurationMinutes)}
                  {...register("slotDurationMinutes", { valueAsNumber: true })}
                />
                <FieldDescription>Độ dài mỗi ca rửa xe, từ 1 đến 60 phút.</FieldDescription>
                <FieldError errors={[errors.slotDurationMinutes]} />
              </Field>

              <Field data-invalid={Boolean(errors.slotBreakMinutes)}>
                <FieldLabel htmlFor="slot-break">Thời gian nghỉ giữa các slot (phút)</FieldLabel>
                <Input
                  id="slot-break"
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  aria-invalid={Boolean(errors.slotBreakMinutes)}
                  {...register("slotBreakMinutes", { valueAsNumber: true })}
                />
                <FieldDescription>Khoảng nghỉ sau mỗi slot, từ 1 đến 60 phút.</FieldDescription>
                <FieldError errors={[errors.slotBreakMinutes]} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="working-start">Giờ bắt đầu làm việc</FieldLabel>
                <Controller
                  name="workingStartHour"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(String(value))}>
                      <SelectTrigger id="working-start" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="admin-brand-surface">
                        <SelectGroup>
                          {hourOptions.map((hour) => (
                            <SelectItem key={hour} value={hour}>
                              {hour}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="working-end">Giờ kết thúc làm việc</FieldLabel>
                <Controller
                  name="workingEndHour"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(String(value))}>
                      <SelectTrigger id="working-end" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="admin-brand-surface">
                        <SelectGroup>
                          {hourOptions.map((hour) => (
                            <SelectItem key={hour} value={hour}>
                              {hour}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <FieldDescription>
              Giờ làm việc giới hạn ở các mốc giờ chẵn để tương thích với back-end.
            </FieldDescription>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.cancellationDeadlineHours)}>
                <FieldLabel htmlFor="cancellation-deadline">Hạn chót hủy lịch (giờ)</FieldLabel>
                <Input
                  id="cancellation-deadline"
                  type="number"
                  min={0}
                  step={1}
                  aria-invalid={Boolean(errors.cancellationDeadlineHours)}
                  {...register("cancellationDeadlineHours", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.cancellationDeadlineHours]} />
              </Field>

              <Field data-invalid={Boolean(errors.cancelTimeMinutes)}>
                <FieldLabel htmlFor="cancel-time">Tự động hủy đơn chưa cọc (phút)</FieldLabel>
                <Input
                  id="cancel-time"
                  type="number"
                  min={1}
                  step={1}
                  aria-invalid={Boolean(errors.cancelTimeMinutes)}
                  {...register("cancelTimeMinutes", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.cancelTimeMinutes]} />
              </Field>
            </div>

            <FieldDescription>
              Quy định hạn chót hủy lịch và thời hạn giữ chỗ tối đa khi chưa hoàn tất tiền cọc.
            </FieldDescription>
          </FieldGroup>
        </div>

        {success ? (
          <Alert>
            <AlertDescription>Đã lưu cài đặt thành công.</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? (
            <RefreshCw data-icon="inline-start" className="animate-spin" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          Lưu cài đặt
        </Button>
      </form>
    </div>
  );
}
