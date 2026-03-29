export type LandingFeature = {
  title: string;
  description: string;
};

export type LandingWorkflowStep = {
  title: string;
  description: string;
};

export type LandingTrustStat = {
  value: string;
  label: string;
};

export const landingFeatures: LandingFeature[] = [
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

export const landingWorkflowSteps: LandingWorkflowStep[] = [
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

export const landingTrustStats: LandingTrustStat[] = [
  { value: "2 nguồn", label: "âm thanh song song" },
  { value: "Realtime", label: "transcript + translation" },
  { value: "Bảo mật", label: "hash password + privacy layer" },
];

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sayvela",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Windows, Web",
  description:
    "Sayvela là nền tảng dịch giọng nói và transcription thời gian thực cho cuộc họp đa ngôn ngữ, hỗ trợ dual audio sources, speaker diarization, TTS và content protection.",
  featureList: landingFeatures.map((feature) => feature.title),
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};
