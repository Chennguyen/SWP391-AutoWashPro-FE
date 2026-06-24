import { Logo } from '@/shared/components/logo';

/**
 * Thành phần (Component) Footer
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function Footer() {
  return (
    <footer id="ho-tro" className="bg-[#000000] px-8 md:px-16 pt-16 pb-10 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-10">
        {/* Brand block */}
        <div className="max-w-xs">
          <Logo />
          <p className="mt-5 text-xs text-[#555] leading-relaxed">
            Nền tảng đặt lịch rửa xe thông minh và chương trình thành viên tích điểm đa hạng — hiện đại, chuyên nghiệp và lấy trải nghiệm người dùng làm trung tâm.
          </p>
        </div>

        {/* Contact / support */}
        <div>
          <h4 className="text-[10px] tracking-[0.3em] uppercase text-[#444] mb-5">Hỗ trợ</h4>
          <p className="text-xs text-[#555] leading-relaxed">
            Mọi thắc mắc vui lòng liên hệ:<br />
            <span className="text-[#888]">support@autowashpro.vn</span>
          </p>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-[10px] tracking-wider text-[#444] uppercase">
          &copy; {new Date().getFullYear()} AutoWash Pro. All rights reserved.
        </p>
        <p className="text-[10px] text-[#333] uppercase tracking-widest">Vietnam</p>
      </div>
    </footer>
  );
}