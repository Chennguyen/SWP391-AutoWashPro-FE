import Image from 'next/image';

const steps = [
  {
    number: '01',
    title: 'Chọn chi nhánh phù hợp',
    description: 'Lựa chọn chi nhánh phù hợp với nhu cầu và vị trí của bạn.',
  },
  {
    number: '02',
    title: 'Chọn ngày và khung giờ',
    description: 'Đặt lịch hẹn trực tuyến bất kỳ lúc nào, chủ động sắp xếp thời gian.',
  },
  {
    number: '03',
    title: 'Xác nhận lịch hẹn',
    description: 'Nhận thông báo xác nhận ngay lập tức và nhắc nhở trước giờ hẹn.',
  },
  {
    number: '04',
    title: 'Nhận điểm sau khi hoàn tất',
    description: 'Tích lũy điểm thưởng sau mỗi lần sử dụng dịch vụ, mở khóa ưu đãi thành viên.',
  },
];

export function HowItWorks() {
  return (
    <section id="quy-trinh" className="bg-[#050505] border-t border-white/[0.07]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2">

        {/* Left — single cinematic image */}
        <div className="relative h-72 lg:h-auto min-h-[560px] overflow-hidden">
          <Image
            src="/images/showcase-exterior.png"
            alt="Chăm sóc ngoại thất AutoWash Pro"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover grayscale opacity-75"
          />
          {/* Right-edge fade blending into dark steps panel */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050505]/80 hidden lg:block" />
          {/* Bottom-edge fade for mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent lg:hidden" />
        </div>

        {/* Right — steps */}
        <div className="bg-transparent px-10 md:px-16 py-20 flex flex-col justify-center">
          {/* Section header */}
          <p className="text-sm tracking-[0.3em] uppercase text-white/70 mb-5 font-medium">Quy trình</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-14 leading-tight">
            Đặt lịch<br />
            <span className="font-bold">đơn giản.</span>
          </h2>

          {/* Steps list */}
          <ol className="space-y-0">
            {steps.map((step, index) => (
              <li
                key={step.number}
                className={`flex gap-7 pb-10 ${
                  index < steps.length - 1
                    ? 'border-b border-white/20 mb-10'
                    : ''
                }`}
              >
                {/* Number */}
                <span className="text-lg font-bold tracking-[0.25em] text-white/60 pt-1 shrink-0 w-10">
                  {step.number}
                </span>

                {/* Text */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-lg text-white/80 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </section>
  );
}