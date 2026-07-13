export function RecoveryFormLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Đang kiểm tra phiên khôi phục mật khẩu.</span>
      <div className="h-4 w-28 rounded-full bg-white/10" />
      <div className="h-12 w-full rounded-full border border-white/10 bg-white/5" />
      <div className="h-12 w-full rounded-full bg-[#d8bd84]/20" />
    </div>
  );
}
