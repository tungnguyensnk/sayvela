import { AuthActions } from "@/components/landing/AuthActions";

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 pb-20 sm:px-8">
      <div className="glass-panel overflow-hidden p-8 sm:p-10">
        <div className="relative">
          <div className="section-eyebrow">Ready to scale</div>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
            Sẵn sàng dẫn đầu với sức mạnh của AI? Bắt đầu tối ưu hóa giao tiếp toàn cầu ngay hôm nay.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            Khởi tạo tài khoản trong 30 giây để đưa tính năng dịch thuật thời gian thực chuẩn enterprise vào hệ thống làm việc của bạn.
          </p>
          <div className="mt-8">
            <AuthActions compact />
          </div>
        </div>
      </div>
    </section>
  );
}
