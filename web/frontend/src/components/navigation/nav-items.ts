export type NavAvailability = "available" | "soon";
export type NavKind = "internal" | "external";
export type NavIcon = "gauge" | "list" | "card" | "spark";

/** Khóa tra cứu trong từ điển — nhãn hiển thị đến từ ngôn ngữ đang chọn. */
export type NavId =
  | "overview"
  | "features"
  | "workflow"
  | "useCases"
  | "faq"
  | "dashboard"
  | "sessions"
  | "billing"
  | "pricing"
  | "workspaces"
  | "notifications"
  | "docs"
  | "changelog"
  | "profile"
  | "security"
  | "apiKeys";

export type NavItem = {
  id: NavId;
  href: string;
  kind: NavKind;
  availability: NavAvailability;
  requiresAuth: boolean;
  icon?: NavIcon;
};

export const marketingNavItems = [
  { id: "overview", href: "/#hero", kind: "internal", availability: "available", requiresAuth: false },
  { id: "features", href: "/#features", kind: "internal", availability: "available", requiresAuth: false },
  { id: "workflow", href: "/#workflow", kind: "internal", availability: "available", requiresAuth: false },
  { id: "useCases", href: "/#use-cases", kind: "internal", availability: "available", requiresAuth: false },
  { id: "faq", href: "/#faq", kind: "internal", availability: "available", requiresAuth: false },
] satisfies NavItem[];

export const appPrimaryNavItems = [
  {
    id: "dashboard",
    href: "/dashboard",
    kind: "internal",
    availability: "available",
    requiresAuth: true,
    icon: "gauge",
  },
  {
    id: "sessions",
    href: "/sessions",
    kind: "internal",
    availability: "available",
    requiresAuth: true,
    icon: "list",
  },
  {
    id: "billing",
    href: "/settings/billing",
    kind: "internal",
    availability: "available",
    requiresAuth: true,
    icon: "card",
  },
  {
    id: "pricing",
    href: "/pricing",
    kind: "internal",
    availability: "available",
    requiresAuth: false,
    icon: "spark",
  },
] satisfies NavItem[];

export const appSecondaryNavItems = [
  { id: "workspaces", href: "/workspaces", kind: "internal", availability: "soon", requiresAuth: true },
  { id: "notifications", href: "/notifications", kind: "internal", availability: "soon", requiresAuth: true },
  { id: "docs", href: "https://docs.sayvela.local", kind: "external", availability: "soon", requiresAuth: false },
  { id: "changelog", href: "/changelog", kind: "internal", availability: "soon", requiresAuth: false },
] satisfies NavItem[];

export const userMenuItems = [
  {
    id: "billing",
    href: "/settings/billing",
    kind: "internal",
    availability: "available",
    requiresAuth: true,
  },
  { id: "profile", href: "/settings/profile", kind: "internal", availability: "soon", requiresAuth: true },
  { id: "security", href: "/settings/security", kind: "internal", availability: "soon", requiresAuth: true },
  { id: "apiKeys", href: "/settings/api-keys", kind: "internal", availability: "soon", requiresAuth: true },
] satisfies NavItem[];
