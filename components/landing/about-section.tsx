// Server Component - no interactivity needed.
export function AboutSection() {
  const stats = [
    { value: '4 hạng', label: 'Thành viên' },
    { value: '100%',   label: 'Đặt lịch trực tuyến' },
    { value: '24/7',   label: 'Hỗ trợ khách hàng' },
  ] as const;

  return (
    <section
      id="gioi-thieu"
      className="scroll-mt-20 border-t border-white/[0.08] bg-[var(--background-outer)] px-5 py-16 sm:px-8 md:py-20 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-white md:text-5xl">
            Một nền tảng. Mọi lần rửa.
          </h2>
          <p className="mt-5 max-w-[62ch] text-base leading-7 text-[#c4c0b6] md:text-lg">
            Đặt lịch, theo dõi lịch sử chăm sóc xe và quản lý quyền lợi thành viên trong cùng một trải nghiệm rõ ràng.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-7 border-t border-white/[0.1] pt-10 sm:grid-cols-3 md:gap-10">
          {stats.map((stat) => (
            <div key={stat.label} className="border-l border-[#bca374]/45 pl-5">
              <div className="text-3xl font-bold text-white md:text-4xl">{stat.value}</div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a09c94]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
