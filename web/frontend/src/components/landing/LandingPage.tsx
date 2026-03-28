import dynamic from "next/dynamic";
import Link from "next/link";
import { SayvelaBrand } from "@/components/brand/SayvelaBrand";
import { AuthActions } from "@/components/landing/AuthActions";
import { LandingHeader } from "@/components/landing/LandingHeader";

const UseCasesSection = dynamic(
  () => import("@/components/landing/UseCasesSection"),
  {
    loading: () => <SectionLoading label="Đang tải tình huống sử dụng..." />,
  },
);

const FaqSection = dynamic(() => import("@/components/landing/FaqSection"), {
  loading: () => <SectionLoading label="Đang tải câu hỏi thường gặp..." />,
});

const features = [
  {
    title: "Dual Audio Sources",
    description:
      "Thu đồng thời loopback hệ thống và microphone để không bỏ lỡ bất kỳ nguồn hội thoại nào.",
  },
  {
    title: "Real-time Transcription",
    description:
      "Ghi lời nói thành văn bản theo thời gian thực để bạn theo dõi cuộc trò chuyện ngay khi nó diễn ra.",
  },
  {
    title: "Intelligent Translation",
    description:
      "Dịch nội dung sang ngôn ngữ đích một cách tức thì, tối ưu cho cuộc họp và giao tiếp liên phòng ban.",
  },
  {
    title: "Speaker Diarization",
    description:
      "Tách người nói rõ ràng để transcript gọn gàng, dễ kiểm tra và dễ hành động sau phiên làm việc.",
  },
  {
    title: "TTS Output",
    description:
      "Phát lại bản dịch của mic qua text-to-speech để tạo vòng phản hồi liên tục và mượt mà.",
  },
  {
    title: "Content Protection",
    description:
      "Tăng quyền riêng tư với cơ chế hạn chế screenshot và screen-share cho các phiên nhạy cảm.",
  },
];

const workflowSteps = [
  {
    title: "Kết nối âm thanh",
    description:
      "Chọn nguồn loopback và microphone, đặt input/output language phù hợp cho từng luồng.",
  },
  {
    title: "Dịch và theo dõi tức thì",
    description:
      "Sayvela ghi âm, nhận diện ngôn ngữ, tạo transcript và dịch ngay trong cùng một giao diện.",
  },
  {
    title: "Phản hồi tự tin hơn",
    description:
      "Dùng speaker lanes, TTS và context để hiểu nhanh bối cảnh và phản hồi chính xác hơn.",
  },
];

const trustStats = [
  { value: "2 nguồn", label: "âm thanh song song" },
  { value: "Realtime", label: "transcript + translation" },
  { value: "Bảo mật", label: "hash password + privacy layer" },
];

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sayvela",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Windows, Web",
  description:
    "Sayvela là nền tảng dịch giọng nói và transcription thời gian thực cho cuộc họp đa ngôn ngữ, hỗ trợ dual audio sources, speaker diarization, TTS và content protection.",
  featureList: features.map((feature) => feature.title),
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export function LandingPage() {
  return (
    <main className="relative flex-1">
      <LandingHeader />

      <div className="relative overflow-x-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />

        <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-12 pt-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
        <div className="flex flex-col justify-center">
          <div className="glass-chip w-fit">
            Real-time voice translation cho team toàn cầu
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Hiểu mọi cuộc trò chuyện đa ngôn ngữ trong một giao diện glass mượt và rõ ràng.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
            Sayvela kết hợp dual audio capture, transcription, translation, speaker
            diarization và TTS để bạn theo dõi, dịch và phản hồi tức thì mà không
            đánh mất ngữ cảnh.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/auth?mode=register" className="primary-button">
              Bắt đầu miễn phí
            </Link>
            <Link href="/pricing" className="glass-button">
              Xem pricing
            </Link>
            <a href="#features" className="glass-button">
              Xem tính năng
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {trustStats.map((stat) => (
              <div key={stat.label} className="glass-panel-muted p-5">
                <div className="text-2xl font-semibold text-white">{stat.value}</div>
                <div className="mt-2 text-sm text-white/62">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="floating-orb left-5 top-5" />
          <div className="floating-orb floating-orb-secondary bottom-10 right-8" />

          <div className="glass-panel hero-visual relative overflow-hidden p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/72">
                  Live workspace
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  Bảng điều phối transcript theo thời gian thực
                </div>
              </div>
              <div className="glass-chip">Speaker lanes</div>
            </div>

            <div className="mt-8 grid gap-4">
              <div className="glass-panel-muted p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white/70">System audio</div>
                    <div className="mt-2 text-lg text-white">
                      “We need the Japanese translation for the meeting notes.”
                    </div>
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-cyan-400/14 ring-1 ring-cyan-200/28" />
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass-panel-muted p-5">
                  <div className="text-sm text-white/62">Transcript</div>
                  <div className="mt-3 text-sm leading-7 text-white/80">
                    こんにちは。会議メモの翻訳をすぐに共有します。
                  </div>
                </div>
                <div className="glass-panel-muted p-5">
                  <div className="text-sm text-white/62">Translation</div>
                  <div className="mt-3 text-sm leading-7 text-white/80">
                    Xin chào, tôi sẽ chia sẻ bản dịch ghi chú cuộc họp ngay bây giờ.
                  </div>
                </div>
              </div>

              <div className="glass-panel-muted p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-white/62">Mic translation TTS</div>
                    <div className="mt-2 text-base text-white">
                      Japanese voice output · 1.0x · privacy protection enabled
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                    <span className="text-sm text-white/70">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="section-eyebrow">Core capabilities</div>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Một bộ tính năng đủ sâu để biến cuộc hội thoại thành hành động
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/68 sm:text-base">
            Toàn bộ luồng capture, transcription, translation và phản hồi được thiết kế
            để làm việc trong môi trường cần tốc độ, độ rõ ràng và tính riêng tư.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="glass-panel group min-h-52 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/28 hover:bg-white/12"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-cyan-100 transition duration-300 group-hover:bg-cyan-300/18">
                {feature.title.charAt(0)}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <div className="glass-panel p-8 sm:p-10">
          <div className="section-eyebrow">How it works</div>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
            Ba bước để đi từ âm thanh thô đến phản hồi chính xác hơn
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article key={step.title} className="glass-panel-muted p-6">
                <div className="glass-chip w-fit">{`0${index + 1}`}</div>
                <h3 className="mt-4 text-xl font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <UseCasesSection />
      <FaqSection />

      <section className="mx-auto w-full max-w-6xl px-6 py-10 pb-20 sm:px-8">
        <div className="glass-panel overflow-hidden p-8 sm:p-10">
          <div className="relative">
            <div className="section-eyebrow">Ready to start</div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
              Đăng ký tài khoản để đưa transcript, translation và quyền riêng tư vào cùng một workflow.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Tạo tài khoản mới trong vài giây, đăng nhập an toàn và bắt đầu chuẩn hóa
              các cuộc trao đổi đa ngôn ngữ của đội ngũ ngay từ hôm nay.
            </p>
            <div className="mt-8">
              <AuthActions compact />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 text-sm text-white/64 sm:px-8 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <SayvelaBrand size="sm" />
            <p className="mt-3 max-w-xl leading-7">
              Real-time voice translation và transcription cho team làm việc xuyên
              ngôn ngữ, được tối ưu cho tốc độ, sự rõ ràng và quyền riêng tư.
            </p>
          </div>

          <div className="grid gap-3 md:justify-items-end">
            <a href="#features" className="nav-link">
              Tính năng
            </a>
            <a href="#workflow" className="nav-link">
              Workflow
            </a>
            <a href="#faq" className="nav-link">
              FAQ
            </a>
            <Link href="/auth?mode=register" className="nav-link">
              Tạo tài khoản
            </Link>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
      </div>
    </main>
  );
}

function SectionLoading({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <div className="glass-panel p-6 text-sm text-white/58">{label}</div>
    </div>
  );
}
