import { CalendarCheck, ClipboardList, Award } from 'lucide-react';

const features = [
  {
    icon: CalendarCheck,
    title: 'Đặt lịch thông minh',
    description:
      'Chọn gói dịch vụ, ngày giờ phù hợp và xác nhận chỉ trong vài thao tác. Không cần gọi điện, không cần chờ đợi.',
  },
  {
    icon: ClipboardList,
    title: 'Theo dõi lịch sử dịch vụ',
    description:
      'Toàn bộ lịch sử rửa xe, chăm sóc xe được lưu trữ và hiển thị rõ ràng, giúp bạn nắm bắt tình trạng xe bất kỳ lúc nào.',
  },
  {
    icon: Award,
    title: 'Tích điểm thành viên',
    description:
      'Mỗi lần sử dụng dịch vụ bạn tích lũy điểm thưởng. Càng nhiều điểm, càng nhiều đặc quyền theo từng hạng thành viên.',
  },
];

export function BenefitsSection() {
  return (
    <section id="benefits" className="bg-[#F5F5F2] py-28 px-8 md:px-16 border-t border-[#0A0A0A]/8">
      <div className="max-w-7xl mx-auto">
        {/* Label */}
        <p className="text-sm tracking-[0.3em] uppercase text-black/60 mb-6 font-medium">Tính năng</p>

        {/* Headline */}
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-medium text-black tracking-tight mb-20 max-w-3xl leading-tight">
          Mọi thứ bạn cần cho<br />
          <span className="font-bold">trải nghiệm hoàn hảo.</span>
        </h2>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-black/10">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="pt-12 pb-14 pr-12 border-b md:border-b-0 md:border-r border-black/10 last:border-r-0 group"
              >
                {/* Icon */}
                <div className="mb-8">
                  <Icon className="w-8 h-8 text-black/50 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
                </div>
                {/* Number */}
                <p className="text-base tracking-[0.25em] text-black/40 mb-4 font-bold">
                  {String(i + 1).padStart(2, '0')}
                </p>
                {/* Title */}
                <h3 className="text-3xl font-bold text-black mb-4 tracking-tight">{feat.title}</h3>
                {/* Description */}
                <p className="text-lg text-black/80 leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
