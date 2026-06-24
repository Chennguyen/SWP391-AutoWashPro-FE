import Image from 'next/image';

// --- Feature data (no icons, no numbers) ---
const features = [
  {
    title: 'Đặt lịch thông minh',
    description:
      'Chọn gói dịch vụ, ngày giờ phù hợp và xác nhận chỉ trong vài thao tác. Không cần gọi điện, không cần chờ đợi.',
    image: '/images/showcase-interior.png',
    imageAlt: 'Đặt lịch rửa xe trực tuyến AutoWash Pro',
  },
  {
    title: 'Theo dõi lịch sử dịch vụ',
    description:
      'Toàn bộ lịch sử rửa xe, chăm sóc xe được lưu trữ rõ ràng — giúp bạn nắm bắt tình trạng xe bất kỳ lúc nào.',
    image: '/images/showcase-exterior.png',
    imageAlt: 'Lịch sử chăm sóc xe AutoWash Pro',
  },
  {
    title: 'Tích điểm thành viên',
    description:
      'Mỗi lần sử dụng dịch vụ bạn tích lũy điểm thưởng. Càng nhiều điểm, càng nhiều đặc quyền theo từng hạng thành viên.',
    image: '/images/showcase-premium.png',
    imageAlt: 'Chương trình khách hàng thân thiết AutoWash Pro',
  },
] as const;

// Server Component — no interactivity
export function BenefitsSection() {
  return (
    <section id="tinh-nang" className="bg-[#050505] py-28 px-8 md:px-16 border-t border-white/[0.07]">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="mb-16 max-w-2xl">
          <p className="text-xs tracking-[0.35em] uppercase text-white/40 mb-5 font-semibold">
            Tính năng
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-tight mb-5">
            Mọi thứ bạn cần cho<br />
            <span className="font-bold">trải nghiệm hoàn hảo.</span>
          </h2>
          <p className="text-base md:text-lg text-white/60 leading-relaxed">
            AutoWash Pro kết hợp đặt lịch thông minh, theo dõi lịch sử và chương trình thành viên trong một nền tảng thống nhất.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map(({ title, description, image, imageAlt }) => (
            <article
              key={title}
              className="group bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300 overflow-hidden"
            >
              {/* Feature image */}
              <div className="relative w-full h-52 overflow-hidden">
                <Image
                  src={image}
                  alt={imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover grayscale opacity-70 group-hover:opacity-90 group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/60 via-transparent to-transparent" />
              </div>

              {/* Feature text */}
              <div className="p-8">
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  {title}
                </h3>
                <p className="text-sm text-white/65 leading-relaxed">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
