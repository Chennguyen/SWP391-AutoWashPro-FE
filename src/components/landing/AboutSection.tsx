// Server Component — no interactivity needed
export function AboutSection() {
  const stats = [
    { value: '4 hạng', label: 'Thành viên' },
    { value: '3 gói',  label: 'Dịch vụ rửa xe' },
    { value: '100%',   label: 'Đặt lịch trực tuyến' },
    { value: '24/7',   label: 'Hỗ trợ khách hàng' },
  ] as const;

  return (
    <section id="gioi-thieu" className="bg-white py-28 px-8 md:px-16 border-t border-black/[0.06]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left: label + headline */}
        <div>
          <p className="text-xs tracking-[0.35em] uppercase text-black/40 mb-6 font-semibold">
            Giới thiệu
          </p>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-black leading-tight tracking-tight">
            Nền tảng quản lý rửa xe<br />
            <span className="font-bold">thông minh.</span>
          </h2>
        </div>

        {/* Right: description paragraphs */}
        <div className="space-y-6 text-black/80 text-lg leading-relaxed">
          <p>
            Chào mừng bạn đến với <span className="text-black font-bold">AutoWash Pro</span> — không chỉ là một hệ thống rửa xe đơn thuần, mà là nền tảng quản lý chăm sóc xe thông minh, giúp khách hàng đặt lịch trước, theo dõi toàn bộ lịch sử dịch vụ và tận hưởng chương trình khách hàng thân thiết một cách hoàn toàn tiện lợi.
          </p>
          <p>
            AutoWash Pro được xây dựng theo định hướng hiện đại, chuyên nghiệp và lấy trải nghiệm người dùng làm trung tâm — góp phần nâng cao chất lượng dịch vụ, tối ưu vận hành và tăng cường khả năng giữ chân khách hàng lâu dài.
          </p>
          <p className="text-black/50 text-base pt-1 font-medium">
            Smart Automated Car Wash Management System với tính năng đặt lịch trước và chương trình tích điểm thành viên đa hạng.
          </p>
        </div>
      </div>

      {/* Stat blocks */}
      <div className="max-w-7xl mx-auto mt-20 pt-16 border-t border-black/10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="border-l-2 border-black/15 pl-6">
            <div className="text-4xl md:text-5xl font-bold text-black mb-2">{stat.value}</div>
            <div className="text-xs font-semibold tracking-widest uppercase text-black/50">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
