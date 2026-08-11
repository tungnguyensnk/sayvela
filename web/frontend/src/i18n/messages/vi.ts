export const vi = {
  meta: {
    home: {
      title: "Sayvela — Phiên dịch và ghi biên bản hội thoại theo thời gian thực",
      description:
        "Thu song song micro và âm thanh hệ thống, ghi lời, dịch và gán người nói ngay trong cuộc họp. Biên bản song ngữ có ngay khi cuộc họp kết thúc.",
      ogTitle: "Sayvela — Phiên dịch hội thoại theo thời gian thực",
      ogDescription:
        "Thu hai kênh, ghi lời, dịch và gán người nói cho các cuộc họp đa ngôn ngữ.",
    },
    dashboard: "Tổng quan — Sayvela",
    sessions: "Phiên làm việc — Sayvela",
    sessionDetail: "Chi tiết phiên — Sayvela",
    billing: "Gói và mức dùng — Sayvela",
    pricing: {
      title: "Bảng giá — Sayvela",
      description:
        "Bốn gói Sayvela: Free, Lite, Pro và Enterprise. So sánh quota phút, thu hai kênh, gán người nói và đọc bản dịch.",
    },
    auth: {
      title: "Đăng nhập hoặc tạo tài khoản — Sayvela",
      description:
        "Đăng nhập Sayvela để xem biên bản, quản lý gói và đồng bộ với ứng dụng máy tính.",
    },
    desktopCallback: "Quay lại ứng dụng — Sayvela",
  },

  common: {
    brand: "Sayvela",
    retry: "Thử lại",
    cancel: "Hủy",
    delete: "Xóa",
    close: "Đóng",
    manage: "Quản lý",
    viewAll: "Xem tất cả",
    loading: "Đang tải…",
    minutes: "phút",
    minutesShort: "phút",
    days: (n: number) => `${n} ngày`,
    perMonth: "mỗi tháng",
    of: "trên",
  },

  theme: {
    label: "Giao diện",
    light: "Nền sáng",
    dark: "Nền tối",
    switchTo: (target: string) => `Chuyển sang ${target.toLowerCase()}`,
  },

  language: {
    label: "Ngôn ngữ",
    action: "Chọn ngôn ngữ hiển thị",
  },

  nav: {
    overview: "Tổng quan",
    features: "Tính năng",
    workflow: "Quy trình",
    useCases: "Ứng dụng",
    faq: "Hỏi đáp",
    dashboard: "Bảng điều khiển",
    sessions: "Phiên làm việc",
    billing: "Gói và mức dùng",
    pricing: "Bảng giá",
    workspaces: "Không gian nhóm",
    notifications: "Thông báo",
    docs: "Tài liệu",
    changelog: "Nhật ký cập nhật",
    profile: "Hồ sơ",
    security: "Bảo mật",
    apiKeys: "Khóa API",
    soon: "Sắp có",
    account: "Tài khoản",
    signOut: "Đăng xuất",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    comingSoon: "Đang phát triển",
    checkingSession: "Đang kiểm tra phiên đăng nhập…",
    signIn: "Đăng nhập",
    createAccount: "Tạo tài khoản",
    activeSession: (email: string) => `Đang đăng nhập · ${email}`,
    signOutShort: "Đăng xuất",
  },

  plan: {
    free: "Free",
    lite: "Lite",
    pro: "Pro",
    enterprise: "Enterprise",
    current: "đang dùng",
    recommended: "gợi ý",
    thrifty: "tiết kiệm",
    quotaUnavailable: "Chưa đọc được quota",
    usage: (used: number, total: number) => `${used}/${total} phút`,
    usageTitle: (percent: number) => `Đã dùng ${percent}% quota tháng này`,
  },

  landing: {
    hero: {
      eyebrow: "Phiên dịch hội thoại theo thời gian thực",
      title: "Cả phòng họp nói ngôn ngữ của bạn, [[ngay khi họ nói]].",
      lede: "Sayvela thu micro và âm thanh cuộc gọi trên hai kênh riêng, ghi lời, dịch và gán người nói trong lúc cuộc họp đang diễn ra. Kết thúc là có ngay biên bản song ngữ.",
      primary: "Dùng thử miễn phí",
      secondary: "Xem bảng giá",
    },
    stats: {
      latency: { value: "< 500ms", label: "Độ trễ xử lý" },
      channels: { value: "2 kênh", label: "Thu song song" },
      security: { value: "Zero Trust", label: "Chuẩn bảo mật" },
    },
    console: {
      live: "Đang thu",
      system: "Hệ thống",
      mic: "Micro",
      you: "Bạn",
      speaker: (n: number) => `Người nói ${n}`,
      channelSystem: "hệ thống",
      channelMic: "micro",
      meterAlt: "Mức tín hiệu hai kênh: âm thanh hệ thống ở trên, micro ở dưới",
      tts: "Đọc bản dịch ja-JP · 1.0×",
      dual: "Thu hai kênh",
      protection: "Chặn chụp màn hình",
    },
    features: {
      eyebrow: "Công nghệ lõi",
      title: "Bốn việc xảy ra cùng lúc, trong một luồng",
      lede: "Thu, ghi lời, dịch và gán người nói chạy song song trên cùng một dòng âm thanh, nên không có bước nào phải chờ bước nào.",
      items: [
        {
          title: "Thu hai kênh độc lập",
          description:
            "Micro của bạn và âm thanh cuộc gọi đi theo hai đường riêng, không lẫn tiếng và không cần thiết bị ngoài.",
        },
        {
          title: "Ghi lời tức thì",
          description:
            "Lời nói thành văn bản ngay khi vừa dứt câu, đủ nhanh để bạn đọc trong lúc người kia còn đang nói.",
        },
        {
          title: "Dịch theo ngữ cảnh",
          description:
            "Bản dịch bám thuật ngữ ngành và cách nói trong công việc, thay vì dịch từng từ rời rạc.",
        },
        {
          title: "Gán người nói",
          description:
            "Mỗi lượt nói được gán đúng người, nên biên bản đọc lên là biết ai đã nói gì.",
        },
        {
          title: "Đọc bản dịch",
          description:
            "Giọng đọc tổng hợp phát bản dịch ra loa để hội thoại giữ được nhịp tự nhiên.",
        },
        {
          title: "Bảo mật doanh nghiệp",
          description:
            "Mã hóa đầu-cuối và chặn chụp màn hình cho những cuộc trao đổi không được rò rỉ.",
        },
      ],
    },
    workflow: {
      eyebrow: "Cách vận hành",
      title: "Ba bước, và bạn không phải đụng tới nó nữa",
      steps: [
        {
          title: "Chọn nguồn và ngôn ngữ",
          description:
            "Chỉ định micro, âm thanh hệ thống và cặp ngôn ngữ. Mất khoảng mười giây trước khi vào họp.",
        },
        {
          title: "Sayvela chạy nền",
          description:
            "Trong suốt cuộc họp, hệ thống thu, ghi lời, dịch và gán người nói mà không cần bạn thao tác.",
        },
        {
          title: "Nhận biên bản song ngữ",
          description:
            "Cuộc họp kết thúc là bản ghi đã đồng bộ lên web, kèm dấu thời gian và tên người nói.",
        },
      ],
    },
    useCases: {
      eyebrow: "Ứng dụng thực tế",
      title: "Cho những cuộc họp mà hiểu nhầm là tốn kém",
      lede: "Ba tình huống khách hàng dùng Sayvela nhiều nhất.",
      items: [
        {
          lane: "Ban điều hành · JA ↔ VI",
          title: "Họp hội đồng xuyên biên giới",
          description:
            "Quyết định không phải chờ bản dịch gửi sau, và biên bản có sẵn ngay khi cuộc họp khép lại.",
        },
        {
          lane: "Nghiên cứu · EN ↔ VI",
          title: "Phỏng vấn người dùng quốc tế",
          description:
            "Người phỏng vấn tập trung vào câu hỏi, phần ghi chép và dịch để hệ thống lo.",
        },
        {
          lane: "Hỗ trợ · nhiều kênh",
          title: "Chăm sóc khách hàng đa quốc gia",
          description:
            "Đội hỗ trợ trả lời bằng tiếng mẹ đẻ mà khách vẫn nghe đúng ngôn ngữ của họ.",
        },
      ],
    },
    faq: {
      eyebrow: "Hỏi đáp",
      title: "Những câu được hỏi nhiều nhất trước khi dùng thử",
      items: [
        {
          question: "Sayvela xử lý âm thanh từ đâu?",
          answer:
            "Từ hai nguồn cùng lúc: micro của bạn và âm thanh hệ thống của máy. Hai luồng được xử lý song song nên không luồng nào phải xếp hàng chờ luồng còn lại.",
        },
        {
          question: "Việc gán người nói hoạt động thế nào?",
          answer:
            "Hệ thống phân biệt giọng trong luồng âm thanh hệ thống và gán nhãn cho từng người. Bạn có thể đổi tên nhãn trong biên bản sau cuộc họp.",
        },
        {
          question: "Bản dịch có được đọc thành tiếng không?",
          answer:
            "Có. Giọng đọc tổng hợp phát bản dịch ngay sau khi người kia dứt lời, để cuộc trao đổi không bị ngắt quãng vì phải đọc màn hình.",
        },
        {
          question: "Dữ liệu cuộc họp được bảo vệ ra sao?",
          answer:
            "Đường truyền được mã hóa đầu-cuối, cửa sổ ứng dụng chặn chụp và quay màn hình, và bản ghi chỉ lưu trong khoảng thời gian mà gói của bạn quy định.",
        },
      ],
    },
    cta: {
      eyebrow: "Bắt đầu",
      title: "Thử với cuộc họp gần nhất của bạn",
      lede: "Tài khoản miễn phí có sẵn 300 phút mỗi tháng, đủ để kiểm chứng trên vài cuộc họp thật trước khi quyết định.",
      primary: "Tạo tài khoản",
      secondary: "Xem bảng giá",
    },
    footer: {
      tagline:
        "Phiên dịch và ghi biên bản hội thoại theo thời gian thực cho các đội làm việc đa ngôn ngữ.",
      product: "Sản phẩm",
      account: "Tài khoản",
      strip: "Thu hai kênh · Gán người nói · Đọc bản dịch",
      rights: (year: number) => `© ${year} Sayvela`,
    },
  },

  auth: {
    tabSignIn: "Đăng nhập",
    tabSignUp: "Tạo tài khoản",
    signInTitle: "Đăng nhập để tiếp tục",
    signUpTitle: "Tạo tài khoản Sayvela",
    signInLede:
      "Đăng nhập để xem biên bản đã đồng bộ, quản lý gói và kết nối ứng dụng máy tính.",
    signUpLede:
      "Chọn mật khẩu đủ mạnh để bảo vệ biên bản cuộc họp và thiết lập riêng tư của bạn.",
    email: "Email",
    password: "Mật khẩu",
    confirmPassword: "Nhập lại mật khẩu",
    passwordHint:
      "Tối thiểu 8 ký tự, có chữ hoa, chữ thường, chữ số và một ký tự đặc biệt.",
    submitSignIn: "Đăng nhập",
    submitSignInBusy: "Đang đăng nhập…",
    submitSignUp: "Tạo tài khoản",
    submitSignUpBusy: "Đang tạo tài khoản…",
    noAccount: "Chưa có tài khoản?",
    hasAccount: "Đã có tài khoản?",
    switchToSignUp: "Đăng ký ngay",
    switchToSignIn: "Đăng nhập",
    registered: "Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.",
    legal:
      "Khi tiếp tục, bạn đồng ý với cách Sayvela xử lý và bảo vệ dữ liệu cuộc họp.",
    backHome: "Về trang chủ",
    desktopNotice:
      "Bạn đang đăng nhập từ ứng dụng máy tính. Sau khi xong, tab này sẽ tự chuyển thông tin về ứng dụng.",
    modeGroup: "Chọn đăng nhập hoặc tạo tài khoản",
    side: {
      title: "Hai luồng âm thanh, một bản ghi ai cũng đọc được.",
      strip: "Thu hai kênh · Gán người nói · Đọc bản dịch",
      points: [
        {
          title: "Thu hai kênh",
          body: "Micro của bạn và âm thanh cuộc gọi được ghi riêng, không lẫn tiếng.",
        },
        {
          title: "Gán người nói",
          body: "Mỗi lượt nói gắn đúng tên, biên bản đọc như biên bản họp thật.",
        },
        {
          title: "Chặn rò rỉ",
          body: "Mã hóa đầu-cuối và chặn chụp màn hình cho hội thoại nhạy cảm.",
        },
      ],
    },
    validation: {
      emailRequired: "Vui lòng nhập email.",
      emailInvalid: "Email này chưa đúng định dạng.",
      passwordRequired: "Vui lòng nhập mật khẩu.",
      passwordTooShort: "Mật khẩu cần ít nhất 8 ký tự.",
      passwordWeak:
        "Mật khẩu cần có chữ hoa, chữ thường, chữ số và một ký tự đặc biệt.",
      confirmRequired: "Vui lòng nhập lại mật khẩu.",
      confirmMismatch: "Hai lần nhập mật khẩu chưa khớp nhau.",
      emailTaken: "Email này đã được dùng cho một tài khoản khác.",
      badCredentials: "Email hoặc mật khẩu không đúng.",
      network: "Không kết nối được tới máy chủ. Vui lòng thử lại.",
      unknown: "Có lỗi xảy ra. Vui lòng thử lại sau ít phút.",
    },
    callback: {
      successEyebrow: "Đăng nhập thành công",
      successTitle: "Quay lại ứng dụng Sayvela",
      sending: "Đang chuyển thông tin đăng nhập về ứng dụng…",
      sent: "Xong. Bạn có thể đóng tab này.",
      failed:
        "Chưa chuyển được thông tin về ứng dụng. Hãy mở ứng dụng Sayvela rồi thử lại.",
      invalidTitle: "Liên kết không hợp lệ",
      invalidBody: "Hãy bắt đầu lại từ nút đăng nhập trong ứng dụng Sayvela.",
      signInAgain: "Đăng nhập lại",
    },
  },

  dashboard: {
    eyebrow: "Tổng quan",
    title: "Chào bạn quay lại",
    download: "Tải ứng dụng máy tính",
    tiles: {
      usage: "Phút đã dùng tháng này",
      usageRemaining: (n: number) => `Còn ${n} phút`,
      usageReset: (date: string) => `Đặt lại ngày ${date}`,
      plan: "Gói hiện tại",
      planRetention: (n: number) => `Lưu biên bản ${n} ngày`,
      planUpgrade: (plan: string) => `Chuyển lên ${plan}`,
      sessions: "Phiên đã đồng bộ",
      sessionsFrom: "Từ ứng dụng máy tính Sayvela",
      sessionsAll: "Xem tất cả phiên",
    },
    recent: {
      title: "Phiên gần đây",
      empty: "Chưa có phiên nào",
      emptyHint:
        "Bắt đầu một phiên trong ứng dụng máy tính, biên bản sẽ tự xuất hiện ở đây.",
      failed: "Chưa tải được danh sách phiên.",
    },
    quick: {
      title: "Lối tắt",
      download: { label: "Tải ứng dụng máy tính", hint: "Windows · thu hai kênh" },
      sessions: { label: "Biên bản đã lưu", hint: "Bản ghi và bản dịch" },
      billing: { label: "Gói và mức dùng", hint: "Quota, hóa đơn, đăng ký" },
      pricing: { label: "So sánh các gói", hint: "Free · Lite · Pro · Enterprise" },
    },
    billingError: "Chưa đọc được thông tin gói của bạn.",
    openBilling: "Mở trang gói",
  },

  sessions: {
    eyebrow: "Lịch sử",
    title: "Phiên làm việc",
    lede: "Toàn bộ biên bản đã đồng bộ từ ứng dụng máy tính Sayvela.",
    filterPlaceholder: "Lọc trong trang này…",
    filterLabel: "Lọc các phiên đang hiển thị",
    counts: (shown: number, page: number, total: number) =>
      `Hiển thị ${shown}/${page} · tổng ${total} phiên`,
    columns: {
      session: "Phiên",
      duration: "Thời lượng",
      started: "Bắt đầu",
      status: "Trạng thái",
    },
    untitled: "Phiên chưa đặt tên",
    live: "đang thu",
    saved: "đã lưu",
    noMatch: (query: string) => `Không có phiên nào khớp với “${query}”.`,
    emptyTitle: "Chưa có phiên nào",
    emptyBody:
      "Bắt đầu một phiên trong ứng dụng máy tính Sayvela, biên bản và bản dịch sẽ đồng bộ về đây.",
    emptyAction: "Tải ứng dụng máy tính",
    errorTitle: "Chưa tải được danh sách phiên",
    errorBody: "Kết nối tới máy chủ đang gián đoạn. Thử lại sau vài giây.",
    prev: "Trước",
    next: "Sau",
    pageOf: (page: number, total: number) => `Trang ${page} / ${total}`,
    retentionHint: "Cần xem phiên cũ hơn?",
    retentionLink: "Gói cao hơn lưu biên bản dài ngày hơn",
    deleteLabel: (title: string) => `Xóa phiên ${title}`,
    backToList: "Tất cả phiên",
    detail: {
      segments: (n: number) => `${n} lượt nói`,
      copy: "Chép biên bản",
      copied: "Đã chép",
      summary: "Tóm tắt",
      transcript: "Biên bản",
      all: "Tất cả",
      you: "Bạn",
      speaker: (n: number) => `Người nói ${n}`,
      emptyTranscript: "Phiên này chưa có lượt nói nào được ghi.",
      notFoundTitle: "Không tìm thấy phiên này",
      notFoundBody:
        "Phiên có thể đã bị xóa, hoặc đã quá thời gian lưu biên bản của gói hiện tại.",
    },
  },

  billing: {
    eyebrow: "Gói và mức dùng",
    manageTitle: "Quản lý đăng ký",
    currentPlan: (plan: string) => `Gói hiện tại: ${plan}`,
    resetOn: (date: string) => `Quota đặt lại vào ${date}.`,
    resetGeneric: "Quota được đặt lại theo chu kỳ đăng ký hiện tại.",
    pricingLink: "Bảng giá",
    quotaTitle: "Quota phút",
    quotaRemaining: (n: number) => `Còn ${n} phút`,
    quotaUsed: (total: number) => `trên ${total} phút đã dùng`,
    quotaPercent: (percent: number) => `${percent}% chu kỳ hiện tại`,
    resetShort: (date: string) => `Đặt lại ${date}`,
    summaryTitle: "Tóm tắt gói",
    summaryMinutes: (n: number) => `${n} phút mỗi tháng`,
    summaryRetention: (n: number) => `Lưu biên bản ${n} ngày`,
    summaryStripe: "Thanh toán và hóa đơn qua Stripe",
    includedTitle: "Đang có trong gói",
    excludedTitle: "Chưa mở khóa",
    baseFeature: "Ghi lời và dịch",
    allUnlocked: "Gói của bạn đã mở toàn bộ tính năng.",
    features: {
      dualAudio: "Thu hai kênh",
      speakerDiarization: "Gán người nói",
      micTranslationTts: "Đọc bản dịch từ micro",
      extendedHistory: "Lưu biên bản dài ngày",
      contentProtection: "Chặn chụp màn hình",
    },
    upgrade: {
      toLite: "Chuyển lên gói Lite",
      toPro: "Chuyển lên gói Pro",
      liteLede:
        "Dành cho nhịp họp đều đặn: nhiều phút hơn và biên bản được lưu lâu hơn.",
      proLede:
        "Mở toàn bộ luồng làm việc: thu hai kênh, gán người nói, đọc bản dịch và chặn chụp màn hình.",
      keepMinutes:
        "Chuyển Lite lên Pro vẫn giữ nguyên số phút còn lại của chu kỳ hiện tại.",
      viewPricing: "Xem bảng giá",
    },
    portal: {
      manage: "Quản lý đăng ký",
      opening: "Đang mở cổng thanh toán…",
      failed: "Chưa mở được cổng quản lý thanh toán.",
      missingUrl: "Máy chủ không trả về liên kết cổng thanh toán.",
      network: "Không kết nối được tới máy chủ. Vui lòng thử lại.",
    },
    checkout: {
      upgradeTo: (plan: string) => `Chuyển lên ${plan}`,
      redirecting: "Đang chuyển tới trang thanh toán…",
      failed: "Chưa tạo được phiên thanh toán.",
      missingUrl: "Máy chủ không trả về liên kết thanh toán.",
      network: "Không kết nối được tới máy chủ. Vui lòng thử lại.",
    },
    entitlementError: "Chưa đọc được thông tin đăng ký của bạn.",
    success: {
      missingEyebrow: "Liên kết không hợp lệ",
      missingTitle: "Thiếu mã phiên thanh toán",
      missingBody:
        "Liên kết này không kèm mã phiên thanh toán. Hãy quay lại bảng giá và bắt đầu lại.",
      verifyingEyebrow: "Đang xác nhận",
      verifyingTitle: "Đang xác nhận thanh toán",
      verifyingBody:
        "Chúng tôi đang đối chiếu với Stripe và cập nhật đăng ký cho tài khoản của bạn.",
      paidEyebrow: "Đã ghi nhận thanh toán",
      paidTitle: "Gói của bạn đã sẵn sàng",
      paidBody: (seconds: number) =>
        `Trang sẽ tự chuyển về mục Gói và mức dùng sau ${seconds} giây.`,
      unpaidEyebrow: "Chưa hoàn tất",
      unpaidTitle: "Thanh toán chưa hoàn tất",
      unpaidBody:
        "Phiên thanh toán này chưa được ghi nhận. Nếu bạn vừa thanh toán xong, hãy thử lại sau vài giây.",
      invalidEyebrow: "Không hợp lệ",
      invalidTitle: "Không xác nhận được phiên thanh toán",
      invalidBody:
        "Liên kết không hợp lệ hoặc không thuộc về tài khoản đang đăng nhập. Hãy tạo lại phiên thanh toán từ bảng giá.",
      backToPricing: "Về bảng giá",
      goBilling: "Tới mục Gói và mức dùng",
      goHome: "Về trang chủ",
    },
  },

  pricing: {
    eyebrow: "Bảng giá",
    title: "Chọn gói theo nhịp làm việc của đội bạn",
    lede: "Bắt đầu miễn phí, chuyển lên Pro khi cần thu hai kênh, gán người nói và đọc bản dịch. Enterprise dành cho tổ chức có yêu cầu bảo mật và mua sắm riêng.",
    stripeNote: "Thanh toán qua Stripe. Bạn có thể hủy bất kỳ lúc nào.",
    intervalGroup: "Chu kỳ thanh toán",
    monthly: "Tháng",
    yearly: "Năm",
    perMonth: "USD mỗi tháng",
    perUserMonth: "USD mỗi người dùng, mỗi tháng",
    perUserYear: "USD mỗi người dùng, mỗi năm",
    saveMonths: (n: number) => `tiết kiệm ${n} tháng`,
    custom: "Thỏa thuận",
    enterpriseCaption: "SSO · SLA · hóa đơn doanh nghiệp",
    startFree: "Bắt đầu miễn phí",
    contactSales: "Liên hệ kinh doanh",
    checkingSession: "Đang kiểm tra phiên đăng nhập…",
    checkingSubscription: "Đang kiểm tra đăng ký…",
    planFeatures: {
      free: (minutes: number, days: number) => [
        `${minutes} phút mỗi tháng`,
        "Ghi lời và dịch",
        `Lưu biên bản ${days} ngày`,
      ],
      lite: (minutes: number, days: number) => [
        `${minutes} phút mỗi tháng`,
        "Ghi lời và dịch",
        `Lưu biên bản ${days} ngày`,
        "Tự quản lý hóa đơn",
      ],
      pro: (minutes: number, days: number) => [
        `${minutes} phút mỗi tháng`,
        "Thu hai kênh",
        "Gán người nói",
        "Đọc bản dịch từ micro",
        `Lưu biên bản ${days} ngày`,
      ],
      enterprise: [
        "Quota và số chỗ tùy chỉnh",
        "SSO/SAML",
        "Nhật ký kiểm toán",
        "Hóa đơn và hợp đồng doanh nghiệp",
      ],
    },
    comparison: {
      title: "So sánh chi tiết",
      lede: "Đối chiếu quota và tính năng của bốn gói.",
      upgradeCta: "Chuyển gói ngay",
      feature: "Tính năng",
      yes: "Có",
      no: "Không",
      customValue: "tùy chỉnh",
      rows: {
        minutes: "Phút mỗi tháng",
        transcription: "Ghi lời và dịch",
        dualAudio: "Thu hai kênh",
        diarization: "Gán người nói",
        tts: "Đọc bản dịch từ micro",
        protection: "Chặn chụp màn hình",
        retention: "Thời gian lưu biên bản",
        portal: "Tự quản lý hóa đơn",
        sso: "SSO/SAML",
        audit: "Nhật ký kiểm toán",
        invoice: "Hóa đơn và hợp đồng",
      },
    },
  },
};

export type Messages = typeof vi;
