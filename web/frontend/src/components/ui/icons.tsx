import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      width={18}
      height={18}
      {...props}
    >
      {children}
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6l6 6-6 6" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12H5M11 18l-6-6 6-6" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 12h12" />
    </Icon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4" />
    </Icon>
  );
}

export function SpeakerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
      <path d="M16 9.5a4 4 0 0 1 0 5M18.8 7a7.5 7.5 0 0 1 0 10" />
    </Icon>
  );
}

export function WaveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12h2M7.5 7v10M12 4v16M16.5 8.5v7M21 11h-2" />
    </Icon>
  );
}

export function LanguagesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 5.5h9M7 3.5v2M9.5 5.5c0 3.6-3 6.8-7 8" />
      <path d="M4.5 9.5c1.4 2.3 3.4 3.7 5.5 4.5M12.5 20.5l4.5-11 4.5 11M14.4 16.5h5.2" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
      <path d="M16.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.9c2.1.7 3.5 2.4 3.5 4.6" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.5l7.5 3v6c0 4.6-3.1 8.6-7.5 10-4.4-1.4-7.5-5.4-7.5-10v-6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v11M7.5 10l4.5 4.5 4.5-4.5M4 20h16" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.3 2" />
    </Icon>
  );
}

export function CardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6 15h3" />
    </Icon>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 17a9 9 0 1 1 17 0" />
      <path d="M12 17l4-5" />
      <circle cx="12" cy="17" r="1.4" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6.5h13M8 12h13M8 17.5h13M3.5 6.5h.01M3.5 12h.01M3.5 17.5h.01" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5l.9 13a1.5 1.5 0 0 0 1.5 1.4h7.2a1.5 1.5 0 0 0 1.5-1.4l.9-13" />
    </Icon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h4.5" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 5.5A2 2 0 0 0 13.5 3.5h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4l9 15.5H3z" />
      <path d="M12 10v4M12 17h.01" />
    </Icon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </Icon>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9.5h17M3.5 14.5h17" />
      <path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3z" />
    </Icon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 8.5V6a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 15 18v-2.5" />
      <path d="M10 12h11M17.5 8.5l3.5 3.5-3.5 3.5" />
    </Icon>
  );
}
