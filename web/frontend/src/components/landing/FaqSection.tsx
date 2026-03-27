"use client";

const items = [
  {
    question: "Sayvela hoạt động với những nguồn âm thanh nào?",
    answer:
      "Hệ thống có thể xử lý đồng thời loopback từ loa hệ thống và microphone để giữ trọn ngữ cảnh cuộc hội thoại.",
  },
  {
    question: "Có hỗ trợ nhận diện người nói không?",
    answer:
      "Có. Speaker diarization giúp tách người nói, giữ transcript rõ ràng và hỗ trợ theo dõi cuộc trao đổi dễ hơn.",
  },
  {
    question: "Bản dịch có thể phát lại bằng giọng nói không?",
    answer:
      "Có. Bạn có thể bật TTS cho mic translation để nghe bản dịch tức thì qua loa đầu ra phù hợp.",
  },
  {
    question: "Dữ liệu nhạy cảm có được bảo vệ không?",
    answer:
      "Sayvela ưu tiên quyền riêng tư với các tùy chọn content protection và thiết kế auth bảo mật bằng password hashing.",
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <div className="flex flex-col gap-4">
        <div className="section-eyebrow">FAQ</div>
        <h2 className="max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Những câu hỏi thường gặp trước khi bắt đầu
        </h2>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.question} className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white">{item.question}</h3>
            <p className="mt-3 text-sm leading-7 text-white/70">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
