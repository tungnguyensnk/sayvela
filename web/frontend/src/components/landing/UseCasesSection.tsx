"use client";

const useCases = [
  {
    title: "Cuộc họp đa ngôn ngữ",
    description:
      "Theo dõi song song transcript, bản dịch và phân tách người nói để cả nhóm ra quyết định nhanh hơn.",
  },
  {
    title: "Phỏng vấn và nghiên cứu",
    description:
      "Ghi lại nội dung theo thời gian thực, giữ nguyên bối cảnh và giảm thời gian tổng hợp sau buổi trao đổi.",
  },
  {
    title: "Hỗ trợ khách hàng toàn cầu",
    description:
      "Phản hồi chính xác hơn khi agent và khách hàng dùng ngôn ngữ khác nhau trên cùng một luồng âm thanh.",
  },
];

export default function UseCasesSection() {
  return (
    <section id="use-cases" className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <div className="glass-panel p-8 sm:p-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="section-eyebrow">Ứng dụng thực tế</div>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Sẵn sàng cho meeting, phỏng vấn và phối hợp xuyên biên giới
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/68 sm:text-base">
            Từ call nội bộ đến buổi làm việc với đối tác, Sayvela giúp nội dung
            được ghi nhận rõ ràng và dễ hành động ngay sau khi cuộc trò chuyện kết thúc.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {useCases.map((useCase) => (
            <article key={useCase.title} className="glass-panel-muted p-6">
              <div className="text-lg font-semibold text-white">
                {useCase.title}
              </div>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {useCase.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
