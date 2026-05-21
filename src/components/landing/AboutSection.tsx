export function AboutSection() {
  return (
    <section id="about" className="bg-[#F5F5F2] py-28 px-8 md:px-16 border-t border-[#0A0A0A]/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: label + headline */}
        <div>
          <p className="text-sm tracking-[0.3em] uppercase text-black/60 mb-6 font-medium">Giới thiệu</p>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-medium text-black leading-tight tracking-tight">
            Nền tảng quản lý rửa xe<br />
            <span className="font-bold">thông minh.</span>
          </h2>
        </div>

        {/* Right: description paragraphs */}
        <div className="space-y-6 text-black/80 text-xl leading-relaxed">
          <p>
            Chào mừng bạn đến với <span className="text-black font-bold">AutoWash Pro</span> — không chỉ là một hệ thống rửa xe đơn thuần, mà là nền tảng quản lý chăm sóc xe thông minh, giúp khách hàng đặt lịch trước, theo dõi toàn bộ lịch sử dịch vụ và tận hưởng chương trình khách hàng thân thiết một cách hoàn toàn tiện lợi.
          </p>
          <p>
            AutoWash Pro được xây dựng theo định hướng hiện đại, chuyên nghiệp và lấy trải nghiệm người dùng làm trung tâm — góp phần nâng cao chất lượng dịch vụ, tối ưu vận hành và tăng cường khả năng giữ chân khách hàng lâu dài.
          </p>
          <p className="text-black/60 text-lg pt-1 font-medium">
            Smart Automated Car Wash Management System với tính năng đặt lịch trước và chương trình tích điểm thành viên đa hạng.
          </p>
        </div>
      </div>

      {/* Stat blocks */}
      <div className="max-w-7xl mx-auto mt-20 pt-16 border-t border-black/10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { value: "4 hạng", label: "Thành viên" },
          { value: "3 gói",  label: "Dịch vụ rửa xe" },
          { value: "100%",   label: "Đặt lịch trực tuyến" },
          { value: "24/7",   label: "Hỗ trợ khách hàng" },
        ].map((stat) => (
          <div key={stat.label} className="border-l-2 border-black/20 pl-6">
            <div className="text-4xl md:text-5xl font-bold text-black mb-2">{stat.value}</div>
            <div className="text-base font-medium tracking-widest uppercase text-black/70">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
