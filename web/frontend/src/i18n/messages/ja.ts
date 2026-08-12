import type { Messages } from "@/i18n/messages/vi";

export const ja = {
  meta: {
    home: {
      title: "Sayvela — 会議のリアルタイム翻訳と文字起こし",
      description:
        "マイクとシステム音声を2系統で同時に収音し、会議の進行中に文字起こし・翻訳・話者識別まで行います。通話が終わった時点で対訳の記録が残ります。",
      ogTitle: "Sayvela — 会議のリアルタイム翻訳",
      ogDescription:
        "相手の発言はあなたの言語の文字で、あなたの発言は相手の言語の音声で。",
    },
    dashboard: "ダッシュボード — Sayvela",
    sessions: "セッション — Sayvela",
    sessionDetail: "セッション詳細 — Sayvela",
    billing: "プランと利用状況 — Sayvela",
    pricing: {
      title: "料金 — Sayvela",
      description:
        "Sayvelaの4つのプラン（Free・Lite・Pro・Enterprise）。分数の上限、2系統収音、話者識別、翻訳の読み上げを比較できます。",
    },
    auth: {
      title: "ログイン／アカウント作成 — Sayvela",
      description:
        "ログインすると、記録の閲覧、プランの管理、デスクトップアプリとの連携ができます。",
    },
    desktopCallback: "アプリに戻る — Sayvela",
  },

  common: {
    brand: "Sayvela",
    retry: "再試行",
    cancel: "キャンセル",
    delete: "削除",
    close: "閉じる",
    manage: "管理",
    viewAll: "すべて表示",
    loading: "読み込み中…",
    minutes: "分",
    minutesShort: "分",
    days: (n: number) => `${n}日`,
    perMonth: "月あたり",
    of: "／",
  },

  theme: {
    label: "表示",
    light: "ライト",
    dark: "ダーク",
    switchTo: (target: string) => `${target}表示に切り替える`,
  },

  language: {
    label: "言語",
    action: "表示言語を選択",
  },

  nav: {
    overview: "概要",
    features: "機能",
    workflow: "使い方",
    useCases: "活用例",
    faq: "よくある質問",
    dashboard: "ダッシュボード",
    sessions: "セッション",
    billing: "プランと利用状況",
    pricing: "料金",
    workspaces: "ワークスペース",
    notifications: "通知",
    docs: "ドキュメント",
    changelog: "更新履歴",
    profile: "プロフィール",
    security: "セキュリティ",
    apiKeys: "APIキー",
    soon: "準備中",
    account: "アカウント",
    signOut: "ログアウト",
    openMenu: "メニューを開く",
    closeMenu: "メニューを閉じる",
    comingSoon: "準備中",
    checkingSession: "ログイン状態を確認しています…",
    signIn: "ログイン",
    createAccount: "アカウント作成",
    activeSession: (email: string) => `ログイン中 · ${email}`,
    signOutShort: "ログアウト",
  },

  plan: {
    free: "Free",
    lite: "Lite",
    pro: "Pro",
    enterprise: "Enterprise",
    current: "利用中",
    recommended: "おすすめ",
    thrifty: "お得",
    quotaUnavailable: "利用状況を取得できません",
    usage: (used: number, total: number) => `${used}/${total}分`,
    usageTitle: (percent: number) => `今月の上限の${percent}%を使用しています`,
  },

  landing: {
    hero: {
      eyebrow: "会議のリアルタイム翻訳",
      title: "相手は母語のまま。あなたも母語のまま。[[待つ必要はありません]]。",
      lede: "相手の発言は言い終えた瞬間にあなたの言語の文字で表示され、あなたの発言は相手の言語で読み上げられます。通訳も、共通の第三言語も必要ありません。",
      primary: "無料で試す",
      secondary: "料金を見る",
    },
    stats: {
      latency: { value: "500ms未満", label: "処理の遅延" },
      channels: { value: "2系統", label: "同時収音" },
      security: { value: "ゼロトラスト", label: "セキュリティ方式" },
    },
    console: {
      live: "収音中",
      system: "システム",
      mic: "マイク",
      you: "自分",
      speaker: (n: number) => `話者${n}`,
      channelSystem: "システム",
      channelMic: "マイク",
      meterAlt: "2系統のレベルメーター。上がシステム音声、下がマイク",
      tts: "読み上げ ja-JP · 1.0×",
      dual: "2系統収音",
      protection: "画面キャプチャ防止",
    },
    features: {
      eyebrow: "コア技術",
      title: "4つの処理を、1本の音声で同時に",
      lede: "収音・文字起こし・翻訳・話者識別が同じ音声ストリーム上で並行して動くため、どの処理も前の処理を待ちません。",
      items: [
        {
          title: "2系統を個別に収音",
          description:
            "自分のマイクと通話音声を別々の経路で扱うので、声が混ざらず、外部機器も要りません。",
        },
        {
          title: "話しながら文字起こし",
          description:
            "発言が終わった時点で文字になります。相手が話している間に読めるだけの速さです。",
        },
        {
          title: "文脈をふまえた翻訳",
          description:
            "業界用語や社内での言い回しを保ったまま訳します。単語を置き換えるだけの翻訳にはしません。",
        },
        {
          title: "話者の識別",
          description:
            "発言ごとに話者が付くので、記録がそのまま議事録として読めます。",
        },
        {
          title: "翻訳の読み上げ",
          description:
            "合成音声が翻訳を読み上げるため、会話のテンポが途切れません。",
        },
        {
          title: "企業向けのセキュリティ",
          description:
            "外に出せない会話のために、エンドツーエンド暗号化と画面キャプチャ防止を用意しています。",
        },
      ],
    },
    workflow: {
      eyebrow: "使い方",
      title: "3ステップ、あとは意識せずに使えます",
      steps: [
        {
          title: "音声と言語を選ぶ",
          description:
            "マイク、システム音声、言語の組み合わせを指定します。会議前の10秒ほどで済みます。",
        },
        {
          title: "あとは裏で動きます",
          description:
            "会議中は収音・文字起こし・翻訳・話者識別が自動で進み、操作は不要です。",
        },
        {
          title: "対訳の記録を受け取る",
          description:
            "通話が終わった時点で、タイムコードと話者名の付いた記録がWebに同期されています。",
        },
      ],
    },
    useCases: {
      eyebrow: "活用例",
      title: "行き違いのコストが大きい会議のために",
      lede: "実際に多く使われている3つの場面です。",
      items: [
        {
          lane: "経営会議 · JA ↔ EN",
          title: "国をまたぐ経営会議",
          description:
            "後から届く翻訳を待たずに判断でき、議事録は会議が終わった時点でそろっています。",
        },
        {
          lane: "リサーチ · EN ↔ JA",
          title: "海外ユーザーインタビュー",
          description:
            "記録と翻訳は任せて、聞き手は質問そのものに集中できます。",
        },
        {
          lane: "サポート · 複数言語",
          title: "多言語のカスタマーサクセス",
          description:
            "担当者は自分の言語で応対し、お客様は自分の言語で受け取れます。",
        },
      ],
    },
    faq: {
      eyebrow: "よくある質問",
      title: "はじめて使う前によく聞かれること",
      items: [
        {
          question: "どこから音声を取り込みますか。",
          answer:
            "自分のマイクと、パソコンのシステム音声の2か所から同時に取り込みます。2つの流れは並行して処理されるため、どちらかが待たされることはありません。",
        },
        {
          question: "話者の識別はどのように行われますか。",
          answer:
            "システム音声の中で声を分け、発言ごとにラベルを付けます。会議後に記録画面でラベル名を編集できます。",
        },
        {
          question: "翻訳を音声で読み上げられますか。",
          answer:
            "はい。相手の発言が終わり次第、合成音声が翻訳を読み上げます。画面を読むために会話を止める必要はありません。",
        },
        {
          question: "会議のデータはどう守られますか。",
          answer:
            "通信はエンドツーエンドで暗号化され、アプリのウィンドウはスクリーンショットと画面録画を遮断します。記録の保存期間はプランごとに決まっています。",
        },
      ],
    },
    cta: {
      eyebrow: "はじめる",
      title: "次の会議で試してください",
      lede: "無料プランには毎月300分が含まれます。実際の会議で数回試してから判断できます。",
      primary: "アカウントを作成",
      secondary: "料金を見る",
    },
    footer: {
      tagline:
        "言語をまたいで働くチームのための、リアルタイム翻訳と会議記録。",
      product: "製品",
      account: "アカウント",
      strip: "2系統収音 · 話者識別 · 翻訳の読み上げ",
      rights: (year: number) => `© ${year} Sayvela`,
    },
  },

  auth: {
    tabSignIn: "ログイン",
    tabSignUp: "アカウント作成",
    signInTitle: "ログインして続ける",
    signUpTitle: "Sayvelaのアカウントを作成",
    signInLede:
      "ログインすると、同期された記録の閲覧、プランの管理、デスクトップアプリとの連携ができます。",
    signUpLede:
      "会議の記録とプライバシー設定を守るため、十分に強いパスワードを設定してください。",
    email: "メールアドレス",
    password: "パスワード",
    confirmPassword: "パスワード（確認）",
    passwordHint:
      "8文字以上で、大文字・小文字・数字・記号をそれぞれ1つ以上含めてください。",
    submitSignIn: "ログイン",
    submitSignInBusy: "ログインしています…",
    submitSignUp: "アカウントを作成",
    submitSignUpBusy: "作成しています…",
    noAccount: "アカウントをお持ちでない方",
    hasAccount: "すでにアカウントをお持ちの方",
    switchToSignUp: "アカウント作成",
    switchToSignIn: "ログイン",
    registered: "アカウントを作成しました。そのままログインできます。",
    legal:
      "続行すると、Sayvelaによる会議データの取り扱いと保護方針に同意したものとみなされます。",
    backHome: "トップページへ",
    desktopNotice:
      "デスクトップアプリからログインしています。完了するとこのタブがアプリにセッションを引き渡します。",
    modeGroup: "ログインとアカウント作成の切り替え",
    side: {
      title: "2系統の音声を、誰でも読める1つの記録に。",
      strip: "2系統収音 · 話者識別 · 翻訳の読み上げ",
      points: [
        {
          title: "2系統収音",
          body: "自分のマイクと通話音声を別々に記録し、声が混ざりません。",
        },
        {
          title: "話者識別",
          body: "発言ごとに話者が付き、そのまま議事録として読めます。",
        },
        {
          title: "漏えい対策",
          body: "機密性の高い会話のための暗号化と画面キャプチャ防止。",
        },
      ],
    },
    validation: {
      emailRequired: "メールアドレスを入力してください。",
      emailInvalid: "メールアドレスの形式が正しくありません。",
      passwordRequired: "パスワードを入力してください。",
      passwordTooShort: "パスワードは8文字以上にしてください。",
      passwordWeak:
        "大文字・小文字・数字・記号をそれぞれ1つ以上含めてください。",
      confirmRequired: "確認用のパスワードを入力してください。",
      confirmMismatch: "2つのパスワードが一致していません。",
      emailTaken: "このメールアドレスは別のアカウントで使われています。",
      badCredentials: "メールアドレスまたはパスワードが違います。",
      network: "サーバーに接続できませんでした。もう一度お試しください。",
      unknown: "問題が発生しました。しばらくしてからお試しください。",
    },
    callback: {
      successEyebrow: "ログインしました",
      successTitle: "Sayvelaアプリに戻ります",
      sending: "アプリにセッションを引き渡しています…",
      sent: "完了しました。このタブは閉じて構いません。",
      failed:
        "アプリに接続できませんでした。Sayvelaが起動しているか確認して、もう一度お試しください。",
      invalidTitle: "このリンクは無効です",
      invalidBody: "Sayvelaアプリのログインボタンからやり直してください。",
      signInAgain: "もう一度ログイン",
    },
  },

  dashboard: {
    eyebrow: "概要",
    title: "おかえりなさい",
    download: "デスクトップアプリを入手",
    tiles: {
      usage: "今月の使用分数",
      usageRemaining: (n: number) => `残り${n}分`,
      usageReset: (date: string) => `${date}にリセット`,
      plan: "現在のプラン",
      planRetention: (n: number) => `記録の保存期間${n}日`,
      planUpgrade: (plan: string) => `${plan}に変更`,
      sessions: "同期済みセッション",
      sessionsFrom: "Sayvelaデスクトップアプリから",
      sessionsAll: "すべてのセッションを見る",
    },
    recent: {
      title: "最近のセッション",
      empty: "セッションはまだありません",
      emptyHint:
        "デスクトップアプリでセッションを開始すると、記録がここに自動で表示されます。",
      failed: "セッション一覧を読み込めませんでした。",
    },
    quick: {
      title: "ショートカット",
      download: { label: "デスクトップアプリを入手", hint: "Windows · 2系統収音" },
      sessions: { label: "保存済みの記録", hint: "文字起こしと翻訳" },
      billing: { label: "プランと利用状況", hint: "上限・請求・契約" },
      pricing: { label: "プランを比較", hint: "Free · Lite · Pro · Enterprise" },
    },
    billingError: "プラン情報を取得できませんでした。",
    openBilling: "プラン設定を開く",
  },

  sessions: {
    eyebrow: "履歴",
    title: "セッション",
    lede: "Sayvelaデスクトップアプリから同期された記録の一覧です。",
    filterPlaceholder: "このページ内を絞り込み…",
    filterLabel: "このページに表示中のセッションを絞り込む",
    counts: (shown: number, page: number, total: number) =>
      `${page}件中${shown}件を表示 · 全${total}件`,
    columns: {
      session: "セッション",
      duration: "長さ",
      started: "開始",
      status: "状態",
    },
    untitled: "無題のセッション",
    live: "収音中",
    saved: "保存済み",
    noMatch: (query: string) => `「${query}」に一致するセッションはありません。`,
    emptyTitle: "セッションはまだありません",
    emptyBody:
      "Sayvelaデスクトップアプリでセッションを開始すると、記録と翻訳がここに同期されます。",
    emptyAction: "デスクトップアプリを入手",
    errorTitle: "セッション一覧を読み込めませんでした",
    errorBody: "サーバーとの接続が切れています。数秒後にもう一度お試しください。",
    prev: "前へ",
    next: "次へ",
    pageOf: (page: number, total: number) => `${total}ページ中${page}ページ目`,
    retentionHint: "もっと前のセッションをお探しですか。",
    retentionLink: "上位プランでは記録の保存期間が長くなります",
    deleteLabel: (title: string) => `セッション「${title}」を削除`,
    backToList: "すべてのセッション",
    detail: {
      segments: (n: number) => `${n}件の発言`,
      copy: "記録をコピー",
      copied: "コピーしました",
      summary: "要約",
      transcript: "記録",
      all: "すべて",
      you: "自分",
      speaker: (n: number) => `話者${n}`,
      emptyTranscript: "このセッションには記録された発言がありません。",
      notFoundTitle: "セッションが見つかりません",
      notFoundBody:
        "削除されたか、現在のプランの保存期間を過ぎている可能性があります。",
    },
  },

  billing: {
    eyebrow: "プランと利用状況",
    manageTitle: "契約の管理",
    currentPlan: (plan: string) => `現在のプラン：${plan}`,
    resetOn: (date: string) => `${date}に上限がリセットされます。`,
    resetGeneric: "上限は現在の請求サイクルに合わせてリセットされます。",
    pricingLink: "料金",
    quotaTitle: "分数の上限",
    quotaRemaining: (n: number) => `残り${n}分`,
    quotaUsed: (total: number) => `／ ${total}分を使用`,
    quotaPercent: (percent: number) => `今サイクルの${percent}%`,
    resetShort: (date: string) => `${date}にリセット`,
    summaryTitle: "プランの内容",
    summaryMinutes: (n: number) => `毎月${n}分`,
    summaryRetention: (n: number) => `記録の保存期間${n}日`,
    summaryStripe: "決済と請求はStripe経由",
    includedTitle: "このプランに含まれるもの",
    excludedTitle: "まだ利用できないもの",
    baseFeature: "文字起こしと翻訳",
    allUnlocked: "すべての機能が利用可能です。",
    features: {
      dualAudio: "2系統収音",
      speakerDiarization: "話者識別",
      micTranslationTts: "マイク翻訳の読み上げ",
      extendedHistory: "記録の長期保存",
      contentProtection: "画面キャプチャ防止",
    },
    upgrade: {
      toLite: "Liteプランへの変更",
      toPro: "Proプランへの変更",
      liteLede:
        "会議が定期的にある方向けに、分数を増やし、記録の保存期間を長くします。",
      proLede:
        "2系統収音、話者識別、翻訳の読み上げ、画面キャプチャ防止まですべて利用できます。",
      keepMinutes:
        "LiteからProへの変更でも、今サイクルの残り分数はそのまま引き継がれます。",
      viewPricing: "料金を見る",
    },
    portal: {
      manage: "契約を管理",
      opening: "請求ポータルを開いています…",
      failed: "請求ポータルを開けませんでした。",
      missingUrl: "サーバーから請求ポータルのリンクが返りませんでした。",
      network: "サーバーに接続できませんでした。もう一度お試しください。",
    },
    checkout: {
      upgradeTo: (plan: string) => `${plan}に変更`,
      redirecting: "決済ページを開いています…",
      failed: "決済セッションを作成できませんでした。",
      missingUrl: "サーバーから決済リンクが返りませんでした。",
      network: "サーバーに接続できませんでした。もう一度お試しください。",
    },
    entitlementError: "契約情報を取得できませんでした。",
    success: {
      missingEyebrow: "無効なリンク",
      missingTitle: "決済セッションが見つかりません",
      missingBody:
        "このリンクには決済セッションが含まれていません。料金ページからやり直してください。",
      verifyingEyebrow: "確認中",
      verifyingTitle: "お支払いを確認しています",
      verifyingBody:
        "Stripeと照合し、アカウントの契約情報を更新しています。",
      paidEyebrow: "お支払いを受け付けました",
      paidTitle: "プランの準備ができました",
      paidBody: (seconds: number) =>
        `${seconds}秒後に「プランと利用状況」へ移動します。`,
      unpaidEyebrow: "未完了",
      unpaidTitle: "お支払いが完了していません",
      unpaidBody:
        "この決済セッションはまだ支払い済みになっていません。支払いを終えたばかりの場合は、数秒後にもう一度お試しください。",
      invalidEyebrow: "無効",
      invalidTitle: "決済セッションを確認できませんでした",
      invalidBody:
        "リンクが無効か、別のアカウントのものです。料金ページから新しく決済を開始してください。",
      backToPricing: "料金ページへ",
      goBilling: "プランと利用状況へ",
      goHome: "トップページへ",
    },
  },

  pricing: {
    eyebrow: "料金",
    title: "チームの会議の頻度に合わせて選べます",
    lede: "まずは無料で。2系統収音、話者識別、翻訳の読み上げが必要になったらProへ。Enterpriseはセキュリティ要件や購買プロセスが独自の組織向けです。",
    stripeNote: "決済はStripe経由です。いつでも解約できます。",
    intervalGroup: "請求サイクル",
    monthly: "月払い",
    yearly: "年払い",
    perMonth: "USD／月",
    perUserMonth: "USD／ユーザー／月",
    perUserYear: "USD／ユーザー／年",
    saveMonths: (n: number) => `${n}か月分お得`,
    custom: "個別見積",
    enterpriseCaption: "SSO · SLA · 請求書払い",
    startFree: "無料ではじめる",
    contactSales: "営業に相談",
    checkingSession: "ログイン状態を確認しています…",
    checkingSubscription: "契約状況を確認しています…",
    planFeatures: {
      free: (minutes: number, days: number) => [
        `毎月${minutes}分`,
        "文字起こしと翻訳",
        `記録の保存期間${days}日`,
      ],
      lite: (minutes: number, days: number) => [
        `毎月${minutes}分`,
        "文字起こしと翻訳",
        `記録の保存期間${days}日`,
        "請求の自己管理",
      ],
      pro: (minutes: number, days: number) => [
        `毎月${minutes}分`,
        "2系統収音",
        "話者識別",
        "マイク翻訳の読み上げ",
        `記録の保存期間${days}日`,
      ],
      enterprise: [
        "上限とシート数を個別設定",
        "SSO/SAML",
        "監査ログ",
        "請求書払いと契約対応",
      ],
    },
    comparison: {
      title: "機能の比較",
      lede: "4つのプランの上限と機能をまとめています。",
      upgradeCta: "プランを変更",
      feature: "機能",
      yes: "あり",
      no: "なし",
      customValue: "個別",
      rows: {
        minutes: "毎月の分数",
        transcription: "文字起こしと翻訳",
        dualAudio: "2系統収音",
        diarization: "話者識別",
        tts: "マイク翻訳の読み上げ",
        protection: "画面キャプチャ防止",
        retention: "記録の保存期間",
        portal: "請求の自己管理",
        sso: "SSO/SAML",
        audit: "監査ログ",
        invoice: "請求書と契約",
      },
    },
  },
} satisfies Messages;
