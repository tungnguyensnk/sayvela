export type NavAvailability = "available" | "soon";
export type NavKind = "internal" | "external";

export type NavItem = {
  label: string;
  href: string;
  kind: NavKind;
  availability: NavAvailability;
  requiresAuth: boolean;
};

export const marketingNavItems = [
  {
    label: "Pricing",
    href: "/pricing",
    kind: "internal",
    availability: "available",
    requiresAuth: false,
  },
  {
    label: "Tính năng",
    href: "/#features",
    kind: "internal",
    availability: "available",
    requiresAuth: false,
  },
  {
    label: "Cách hoạt động",
    href: "/#workflow",
    kind: "internal",
    availability: "available",
    requiresAuth: false,
  },
  {
    label: "Use cases",
    href: "/#use-cases",
    kind: "internal",
    availability: "available",
    requiresAuth: false,
  },
  {
    label: "FAQ",
    href: "/#faq",
    kind: "internal",
    availability: "available",
    requiresAuth: false,
  },
] satisfies NavItem[];

export const appPrimaryNavItems = [
  {
    label: "Dashboard",
    href: "/app",
    kind: "internal",
    availability: "soon",
    requiresAuth: true,
  },
  {
    label: "Sessions",
    href: "/sessions",
    kind: "internal",
    availability: "soon",
    requiresAuth: true,
  },
  {
    label: "Pricing",
    href: "/pricing",
    kind: "internal",
    availability: "available",
    requiresAuth: false,
  },
  {
    label: "Billing & usage",
    href: "/settings/billing",
    kind: "internal",
    availability: "available",
    requiresAuth: true,
  },
] satisfies NavItem[];

export const appSecondaryNavItems = [
  {
    label: "Workspaces",
    href: "/workspaces",
    kind: "internal",
    availability: "soon",
    requiresAuth: true,
  },
  {
    label: "Notifications",
    href: "/notifications",
    kind: "internal",
    availability: "soon",
    requiresAuth: true,
  },
  {
    label: "Docs",
    href: "https://docs.sayvela.local",
    kind: "external",
    availability: "soon",
    requiresAuth: false,
  },
  {
    label: "Changelog",
    href: "/changelog",
    kind: "internal",
    availability: "soon",
    requiresAuth: false,
  },
] satisfies NavItem[];

export const userMenuItems = [
  {
    label: "Billing & usage",
    href: "/settings/billing",
    kind: "internal",
    availability: "available",
    requiresAuth: true,
  },
  {
    label: "Profile",
    href: "/settings/profile",
    kind: "internal",
    availability: "soon",
    requiresAuth: true,
  },
  {
    label: "Security",
    href: "/settings/security",
    kind: "internal",
    availability: "soon",
    requiresAuth: true,
  },
  {
    label: "API keys",
    href: "/settings/api-keys",
    kind: "internal",
    availability: "soon",
    requiresAuth: true,
  },
] satisfies NavItem[];
