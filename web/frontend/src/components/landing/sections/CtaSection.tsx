import { AuthActions } from "@/components/landing/AuthActions";

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 pb-20 sm:px-8">
      <div className="glass-panel overflow-hidden p-8 sm:p-10">
        <div className="relative">
          <div className="section-eyebrow">Ready to start</div>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
            Đăng ký tài khoản để đưa transcript, translation và quyền riêng tư vào cùng một workflow.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            Tạo tài khoản mới trong vài giây, đăng nhập an toàn và bắt đầu chuẩn hóa các cuộc trao đổi đa ngôn ngữ của
            đội ngũ ngay từ hôm nay.
          </p>
          <div className="mt-8">
            <AuthActions compact />
          </div>
        </div>
      </div>
    </section>
  );
}
