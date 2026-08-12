import type { Messages } from "@/i18n/messages/vi";

export const en = {
  meta: {
    home: {
      title: "Sayvela — Real-time meeting translation and transcripts",
      description:
        "Capture your microphone and system audio on separate channels, transcribe, translate and label speakers while the meeting runs. The bilingual transcript is ready the moment you hang up.",
      ogTitle: "Sayvela — Real-time meeting translation",
      ogDescription:
        "Their words land as text in your language; yours are spoken aloud in theirs.",
    },
    dashboard: "Overview — Sayvela",
    sessions: "Sessions — Sayvela",
    sessionDetail: "Session detail — Sayvela",
    billing: "Plan and usage — Sayvela",
    pricing: {
      title: "Pricing — Sayvela",
      description:
        "Four Sayvela plans: Free, Lite, Pro and Enterprise. Compare minute quotas, dual-channel capture, speaker labelling and translation playback.",
    },
    auth: {
      title: "Sign in or create an account — Sayvela",
      description:
        "Sign in to read your transcripts, manage your plan and connect the Sayvela desktop app.",
    },
    desktopCallback: "Return to the app — Sayvela",
  },

  common: {
    brand: "Sayvela",
    retry: "Try again",
    cancel: "Cancel",
    delete: "Delete",
    close: "Close",
    manage: "Manage",
    viewAll: "View all",
    loading: "Loading…",
    minutes: "minutes",
    minutesShort: "min",
    days: (n: number) => `${n} days`,
    perMonth: "per month",
    of: "of",
  },

  theme: {
    label: "Appearance",
    light: "Light",
    dark: "Dark",
    switchTo: (target: string) => `Switch to ${target.toLowerCase()} appearance`,
  },

  language: {
    label: "Language",
    action: "Choose the interface language",
  },

  nav: {
    overview: "Overview",
    features: "Features",
    workflow: "How it works",
    useCases: "Use cases",
    faq: "FAQ",
    dashboard: "Dashboard",
    sessions: "Sessions",
    billing: "Plan & usage",
    pricing: "Pricing",
    workspaces: "Workspaces",
    notifications: "Notifications",
    docs: "Docs",
    changelog: "Changelog",
    profile: "Profile",
    security: "Security",
    apiKeys: "API keys",
    soon: "Soon",
    account: "Account",
    signOut: "Sign out",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    comingSoon: "In progress",
    checkingSession: "Checking your session…",
    signIn: "Sign in",
    createAccount: "Create account",
    activeSession: (email: string) => `Signed in · ${email}`,
    signOutShort: "Sign out",
  },

  plan: {
    free: "Free",
    lite: "Lite",
    pro: "Pro",
    enterprise: "Enterprise",
    current: "current plan",
    recommended: "recommended",
    thrifty: "best value",
    quotaUnavailable: "Quota unavailable",
    usage: (used: number, total: number) => `${used}/${total} min`,
    usageTitle: (percent: number) => `${percent}% of this month's quota used`,
  },

  landing: {
    hero: {
      eyebrow: "Real-time meeting translation",
      title: "They speak theirs. You speak yours. [[Nobody waits]].",
      lede: "Their words land as text in your language the moment they finish; yours are spoken aloud in theirs. No interpreter, and nobody has to fall back on a third language.",
      primary: "Start for free",
      secondary: "See pricing",
    },
    stats: {
      latency: { value: "< 500ms", label: "Processing latency" },
      channels: { value: "2 channels", label: "Captured in parallel" },
      security: { value: "Zero Trust", label: "Security model" },
    },
    console: {
      live: "Recording",
      system: "System",
      mic: "Microphone",
      you: "You",
      speaker: (n: number) => `Speaker ${n}`,
      channelSystem: "system",
      channelMic: "mic",
      meterAlt: "Two-channel signal level: system audio above, microphone below",
      tts: "Playback ja-JP · 1.0×",
      dual: "Dual capture",
      protection: "Screen capture blocked",
    },
    features: {
      eyebrow: "Core technology",
      title: "Four things happening at once, in one pass",
      lede: "Capture, transcription, translation and speaker labelling run in parallel on the same audio stream, so no stage waits on another.",
      items: [
        {
          title: "Two independent channels",
          description:
            "Your microphone and the call audio travel separately — no bleed between voices, no extra hardware.",
        },
        {
          title: "Transcription as you speak",
          description:
            "Speech becomes text the moment a sentence ends, fast enough to read while the other side is still talking.",
        },
        {
          title: "Translation that keeps context",
          description:
            "Industry terms and the way your team actually phrases things survive the translation instead of being taken word by word.",
        },
        {
          title: "Speaker labelling",
          description:
            "Every turn is attributed, so the transcript reads like minutes rather than a wall of text.",
        },
        {
          title: "Translation playback",
          description:
            "A synthesised voice reads the translation aloud, so the conversation keeps its natural rhythm.",
        },
        {
          title: "Enterprise security",
          description:
            "End-to-end encryption and screen-capture blocking for conversations that must not leak.",
        },
      ],
    },
    workflow: {
      eyebrow: "How it works",
      title: "Three steps, then you can forget it is there",
      steps: [
        {
          title: "Pick your sources and languages",
          description:
            "Choose the microphone, the system audio and the language pair. It takes about ten seconds before the call starts.",
        },
        {
          title: "Sayvela runs in the background",
          description:
            "Through the whole meeting it captures, transcribes, translates and labels speakers without any input from you.",
        },
        {
          title: "Collect the bilingual transcript",
          description:
            "When the call ends the record is already synced to the web, with timestamps and speaker names in place.",
        },
      ],
    },
    useCases: {
      eyebrow: "In practice",
      title: "For meetings where a misunderstanding is expensive",
      lede: "The three situations customers reach for Sayvela most often.",
      items: [
        {
          lane: "Board · JA ↔ EN",
          title: "Cross-border board meetings",
          description:
            "Decisions stop waiting on a translation sent afterwards, and the minutes exist the moment the call ends.",
        },
        {
          lane: "Research · EN ↔ VI",
          title: "International user interviews",
          description:
            "The interviewer stays on the questions while note-taking and translation are handled for them.",
        },
        {
          lane: "Support · multi-lane",
          title: "Multilingual customer success",
          description:
            "Your team answers in their own language and the customer still hears theirs.",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "What people ask before their first call",
      items: [
        {
          question: "Where does Sayvela take audio from?",
          answer:
            "From two sources at once: your microphone and your machine's system audio. Both streams are processed in parallel, so neither queues behind the other.",
        },
        {
          question: "How does speaker labelling work?",
          answer:
            "Sayvela separates voices inside the system-audio stream and tags each turn. You can rename the labels in the transcript after the call.",
        },
        {
          question: "Can it read the translation aloud?",
          answer:
            "Yes. A synthesised voice plays the translation as soon as the other side finishes speaking, so nobody has to stop and read the screen.",
        },
        {
          question: "How is meeting data protected?",
          answer:
            "Traffic is encrypted end to end, the app window blocks screenshots and screen recording, and transcripts are kept only for the retention period of your plan.",
        },
      ],
    },
    cta: {
      eyebrow: "Get started",
      title: "Try it on your next call",
      lede: "The free plan includes 300 minutes a month — enough to test it against a few real meetings before you decide.",
      primary: "Create an account",
      secondary: "See pricing",
    },
    footer: {
      tagline:
        "Real-time translation and meeting transcripts for teams that work across languages.",
      product: "Product",
      account: "Account",
      strip: "Dual capture · Speaker labelling · Translation playback",
      rights: (year: number) => `© ${year} Sayvela`,
    },
  },

  auth: {
    tabSignIn: "Sign in",
    tabSignUp: "Sign up",
    signInTitle: "Sign in to continue",
    signUpTitle: "Create your Sayvela account",
    signInLede:
      "Sign in to read your synced transcripts, manage your plan and connect the desktop app.",
    signUpLede:
      "Pick a strong password — it protects your meeting transcripts and privacy settings.",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    passwordHint:
      "At least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character.",
    submitSignIn: "Sign in",
    submitSignInBusy: "Signing in…",
    submitSignUp: "Create account",
    submitSignUpBusy: "Creating account…",
    noAccount: "No account yet?",
    hasAccount: "Already have an account?",
    switchToSignUp: "Sign up",
    switchToSignIn: "Sign in",
    registered: "Account created. You can sign in now.",
    legal:
      "By continuing you agree to how Sayvela processes and protects your meeting data.",
    backHome: "Back to home",
    desktopNotice:
      "You are signing in from the desktop app. This tab will hand the session back to the app when you are done.",
    modeGroup: "Choose sign in or sign up",
    side: {
      title: "Two audio channels, one transcript anyone can read.",
      strip: "Dual capture · Speaker labelling · Translation playback",
      points: [
        {
          title: "Dual capture",
          body: "Your microphone and the call audio are recorded separately, with no bleed.",
        },
        {
          title: "Speaker labelling",
          body: "Every turn is attributed, so the transcript reads like real minutes.",
        },
        {
          title: "Leak protection",
          body: "End-to-end encryption and screen-capture blocking for sensitive calls.",
        },
      ],
    },
    validation: {
      emailRequired: "Enter your email.",
      emailInvalid: "That email address does not look right.",
      passwordRequired: "Enter your password.",
      passwordTooShort: "Use at least 8 characters.",
      passwordWeak:
        "Include an uppercase letter, a lowercase letter, a number and a special character.",
      confirmRequired: "Repeat your password.",
      confirmMismatch: "The two passwords do not match.",
      emailTaken: "That email already belongs to another account.",
      badCredentials: "Email or password is incorrect.",
      network: "Could not reach the server. Please try again.",
      unknown: "Something went wrong. Please try again in a moment.",
    },
    callback: {
      successEyebrow: "Signed in",
      successTitle: "Back to the Sayvela app",
      sending: "Handing your session back to the app…",
      sent: "Done. You can close this tab.",
      failed:
        "Could not reach the app. Make sure Sayvela is running, then try again.",
      invalidTitle: "This link is not valid",
      invalidBody: "Start again from the sign-in button inside the Sayvela app.",
      signInAgain: "Sign in again",
    },
  },

  dashboard: {
    eyebrow: "Overview",
    title: "Welcome back",
    download: "Download desktop app",
    tiles: {
      usage: "Minutes used this month",
      usageRemaining: (n: number) => `${n} minutes left`,
      usageReset: (date: string) => `Resets ${date}`,
      plan: "Current plan",
      planRetention: (n: number) => `Transcripts kept ${n} days`,
      planUpgrade: (plan: string) => `Move up to ${plan}`,
      sessions: "Sessions synced",
      sessionsFrom: "From the Sayvela desktop app",
      sessionsAll: "View all sessions",
    },
    recent: {
      title: "Recent sessions",
      empty: "No sessions yet",
      emptyHint:
        "Start a session in the desktop app and the transcript will appear here on its own.",
      failed: "Could not load your sessions.",
    },
    quick: {
      title: "Shortcuts",
      download: { label: "Download desktop app", hint: "Windows · dual capture" },
      sessions: { label: "Saved transcripts", hint: "Records and translations" },
      billing: { label: "Plan & usage", hint: "Quota, invoices, subscription" },
      pricing: { label: "Compare plans", hint: "Free · Lite · Pro · Enterprise" },
    },
    billingError: "Could not read your plan details.",
    openBilling: "Open plan settings",
  },

  sessions: {
    eyebrow: "History",
    title: "Sessions",
    lede: "Every transcript synced from the Sayvela desktop app.",
    filterPlaceholder: "Filter this page…",
    filterLabel: "Filter the sessions shown on this page",
    counts: (shown: number, page: number, total: number) =>
      `Showing ${shown} of ${page} · ${total} in total`,
    columns: {
      session: "Session",
      duration: "Length",
      started: "Started",
      status: "Status",
    },
    untitled: "Untitled session",
    live: "recording",
    saved: "saved",
    noMatch: (query: string) => `No session matches “${query}”.`,
    emptyTitle: "No sessions yet",
    emptyBody:
      "Start a session in the Sayvela desktop app and the transcript and translation will sync here.",
    emptyAction: "Download desktop app",
    errorTitle: "Could not load your sessions",
    errorBody: "The connection to the server dropped. Try again in a few seconds.",
    prev: "Previous",
    next: "Next",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    retentionHint: "Looking for an older session?",
    retentionLink: "Higher plans keep transcripts longer",
    deleteLabel: (title: string) => `Delete session ${title}`,
    backToList: "All sessions",
    detail: {
      segments: (n: number) => `${n} turns`,
      copy: "Copy transcript",
      copied: "Copied",
      summary: "Summary",
      transcript: "Transcript",
      all: "All",
      you: "You",
      speaker: (n: number) => `Speaker ${n}`,
      emptyTranscript: "No turns were recorded in this session.",
      notFoundTitle: "Session not found",
      notFoundBody:
        "It may have been deleted, or it fell outside the retention window of your current plan.",
    },
  },

  billing: {
    eyebrow: "Plan & usage",
    manageTitle: "Manage your subscription",
    currentPlan: (plan: string) => `Current plan: ${plan}`,
    resetOn: (date: string) => `Quota resets on ${date}.`,
    resetGeneric: "Your quota resets with the current billing cycle.",
    pricingLink: "Pricing",
    quotaTitle: "Minute quota",
    quotaRemaining: (n: number) => `${n} minutes left`,
    quotaUsed: (total: number) => `of ${total} minutes used`,
    quotaPercent: (percent: number) => `${percent}% of this cycle`,
    resetShort: (date: string) => `Resets ${date}`,
    summaryTitle: "Plan summary",
    summaryMinutes: (n: number) => `${n} minutes per month`,
    summaryRetention: (n: number) => `Transcripts kept ${n} days`,
    summaryStripe: "Billing and invoices through Stripe",
    includedTitle: "Included in your plan",
    excludedTitle: "Not unlocked yet",
    baseFeature: "Transcription and translation",
    allUnlocked: "Your plan already includes every feature.",
    features: {
      dualAudio: "Dual-channel capture",
      speakerDiarization: "Speaker labelling",
      micTranslationTts: "Microphone translation playback",
      extendedHistory: "Extended transcript retention",
      contentProtection: "Screen-capture blocking",
    },
    upgrade: {
      toLite: "Move up to the Lite plan",
      toPro: "Move up to the Pro plan",
      liteLede:
        "For a steady meeting load: more minutes and transcripts that stay around longer.",
      proLede:
        "Unlock the full workflow: dual capture, speaker labelling, translation playback and screen-capture blocking.",
      keepMinutes:
        "Moving from Lite to Pro keeps the minutes left in your current cycle.",
      viewPricing: "See pricing",
    },
    portal: {
      manage: "Manage subscription",
      opening: "Opening the billing portal…",
      failed: "Could not open the billing portal.",
      missingUrl: "The server did not return a billing portal link.",
      network: "Could not reach the server. Please try again.",
    },
    checkout: {
      upgradeTo: (plan: string) => `Move up to ${plan}`,
      redirecting: "Opening checkout…",
      failed: "Could not start the checkout session.",
      missingUrl: "The server did not return a checkout link.",
      network: "Could not reach the server. Please try again.",
    },
    entitlementError: "Could not read your subscription details.",
    success: {
      missingEyebrow: "Invalid link",
      missingTitle: "Checkout session missing",
      missingBody:
        "This link does not carry a checkout session. Go back to pricing and start again.",
      verifyingEyebrow: "Verifying",
      verifyingTitle: "Confirming your payment",
      verifyingBody:
        "We are checking with Stripe and updating the subscription on your account.",
      paidEyebrow: "Payment received",
      paidTitle: "Your plan is ready",
      paidBody: (seconds: number) =>
        `You will be sent to Plan & usage in ${seconds} seconds.`,
      unpaidEyebrow: "Not complete",
      unpaidTitle: "Payment not completed",
      unpaidBody:
        "This checkout session has not been marked as paid. If you just finished paying, try again in a few seconds.",
      invalidEyebrow: "Invalid",
      invalidTitle: "Could not verify this checkout session",
      invalidBody:
        "The link is invalid or belongs to another account. Start a new checkout from the pricing page.",
      backToPricing: "Back to pricing",
      goBilling: "Go to Plan & usage",
      goHome: "Back to home",
    },
  },

  pricing: {
    eyebrow: "Pricing",
    title: "Pick the plan that matches how your team meets",
    lede: "Start free and move up to Pro when you need dual capture, speaker labelling and translation playback. Enterprise is for organisations with their own security and procurement requirements.",
    stripeNote: "Billed through Stripe. Cancel whenever you want.",
    intervalGroup: "Billing period",
    monthly: "Monthly",
    yearly: "Yearly",
    perMonth: "USD per month",
    perUserMonth: "USD per user, per month",
    perUserYear: "USD per user, per year",
    saveMonths: (n: number) => `${n} months free`,
    custom: "Custom",
    enterpriseCaption: "SSO · SLA · company invoicing",
    startFree: "Start for free",
    contactSales: "Talk to sales",
    checkingSession: "Checking your session…",
    checkingSubscription: "Checking your subscription…",
    planFeatures: {
      free: (minutes: number, days: number) => [
        `${minutes} minutes per month`,
        "Transcription and translation",
        `Transcripts kept ${days} days`,
      ],
      lite: (minutes: number, days: number) => [
        `${minutes} minutes per month`,
        "Transcription and translation",
        `Transcripts kept ${days} days`,
        "Self-serve invoicing",
      ],
      pro: (minutes: number, days: number) => [
        `${minutes} minutes per month`,
        "Dual-channel capture",
        "Speaker labelling",
        "Microphone translation playback",
        `Transcripts kept ${days} days`,
      ],
      enterprise: [
        "Custom quota and seats",
        "SSO/SAML",
        "Audit log",
        "Company invoicing and contracts",
      ],
    },
    comparison: {
      title: "Full comparison",
      lede: "Quotas and features across the four plans.",
      upgradeCta: "Change plan",
      feature: "Feature",
      yes: "Included",
      no: "Not included",
      customValue: "custom",
      rows: {
        minutes: "Minutes per month",
        transcription: "Transcription and translation",
        dualAudio: "Dual-channel capture",
        diarization: "Speaker labelling",
        tts: "Microphone translation playback",
        protection: "Screen-capture blocking",
        retention: "Transcript retention",
        portal: "Self-serve invoicing",
        sso: "SSO/SAML",
        audit: "Audit log",
        invoice: "Invoicing and contracts",
      },
    },
  },
} satisfies Messages;
