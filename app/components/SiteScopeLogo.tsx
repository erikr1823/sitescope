"use client";

type SiteScopeLogoProps = {
  compact?: boolean;
  className?: string;
  subtitle?: string;
};

export default function SiteScopeLogo({
  compact = false,
  className = "",
  subtitle,
}: SiteScopeLogoProps) {
  if (compact) {
    return (
      <span className={`sitescope-logo sitescope-logo--compact ${className}`.trim()}>
        <LogoIcon />
      </span>
    );
  }

  return (
    <span className={`sitescope-logo ${className}`.trim()}>
      <LogoIcon />
      <span className="sitescope-logo__text">
        <span className="sitescope-logo__wordmark">SiteScope</span>
        {subtitle ? (
          <span className="sitescope-logo__subtext">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}

function LogoIcon() {
  return (
    <svg
      className="sitescope-logo__icon"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sitescope-logo-gradient" x1="4" y1="3" x2="18" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67E8F9" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <circle cx="11" cy="11" r="8.2" stroke="url(#sitescope-logo-gradient)" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="4.25" stroke="url(#sitescope-logo-gradient)" strokeWidth="1.2" opacity="0.75" />
      <circle cx="11" cy="11" r="1.75" fill="url(#sitescope-logo-gradient)" />
      <circle cx="11" cy="2.9" r="1.2" fill="#67E8F9" />
      <circle cx="17.85" cy="14.35" r="1.2" fill="#3B82F6" />
      <circle cx="4.15" cy="14.35" r="1.2" fill="#60A5FA" />
    </svg>
  );
}
