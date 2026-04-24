import Link from 'next/link';

type SiteBrandProps = {
  href?: string;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  brandName?: string | null;
  logoUrl?: string | null;
  className?: string;
};

const sizes = {
  sm: {
    mark: 40,
    eyebrow: 'text-[9px] tracking-[0.22em]',
    title: 'text-[28px]',
    subtitle: 'text-[11px]',
    gap: 'gap-3',
  },
  md: {
    mark: 52,
    eyebrow: 'text-[10px] tracking-[0.24em]',
    title: 'text-[36px]',
    subtitle: 'text-[13px]',
    gap: 'gap-4',
  },
  lg: {
    mark: 68,
    eyebrow: 'text-[11px] tracking-[0.28em]',
    title: 'text-[52px]',
    subtitle: 'text-[15px]',
    gap: 'gap-5',
  },
} as const;

function BrandMark({ size = 52, logoUrl }: { size?: number; logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 object-contain"
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="50" cy="50" r="48" fill="#234571" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#F0A032" strokeWidth="3.5" />
      <circle cx="50" cy="50" r="29" fill="#FFFFFF" />
      <circle cx="50" cy="35" r="17" fill="#234571" />
      <path d="M31 72h38" stroke="#F0A032" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M39 83h22" stroke="#F0A032" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M39 47c3-22 18-22 21 0M50 20c-2 13-2 25 2 40M31 33c11 7 22 9 38 9M33 23c2 15 7 28 14 39"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M44 30c-2 0-5 2-5 7 0 6 3 13 4 18h6l1-9 2 9h6c0-12-4-25-12-25-1 0-2 1-2 1s-1-1-2-1Z"
        fill="#FFFFFF"
      />
      <text x="50" y="77" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#234571" fontFamily="Inter, sans-serif">
        MORÓN
      </text>
    </svg>
  );
}

function BrandText({
  theme,
  size,
  showSubtitle,
  brandName,
}: {
  theme: 'light' | 'dark';
  size: keyof typeof sizes;
  showSubtitle: boolean;
  brandName?: string | null;
}) {
  const palette =
    theme === 'dark'
      ? {
          eyebrow: 'text-[#F0A032]',
          title: 'text-white',
          subtitle: 'text-blue-200/80',
        }
      : {
          eyebrow: 'text-[#D78820]',
          title: 'text-[#234571]',
          subtitle: 'text-slate-500',
        };

  return (
    <div className="min-w-0">
      <div className={`font-mono font-bold uppercase leading-none ${sizes[size].eyebrow} ${palette.eyebrow}`}>
        Colegio Marista San José · Morón
      </div>
      <div className={`font-sans font-black leading-none ${sizes[size].title} ${palette.title}`}>
        {brandName?.trim() || 'Papi Fútbol'}
      </div>
      {showSubtitle ? (
        <div className={`font-mono font-semibold uppercase tracking-[0.18em] ${sizes[size].subtitle} ${palette.subtitle}`}>
          Temporada 2026
        </div>
      ) : null}
    </div>
  );
}

export function SiteBrand({
  href,
  theme = 'light',
  size = 'md',
  showSubtitle = true,
  brandName,
  logoUrl,
  className = '',
}: SiteBrandProps) {
  const content = (
    <div className={`flex items-center ${sizes[size].gap} ${className}`}>
      <BrandMark size={sizes[size].mark} logoUrl={logoUrl} />
      <BrandText theme={theme} size={size} showSubtitle={showSubtitle} brandName={brandName} />
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}

export function SiteBrandMark({ size, logoUrl }: { size?: number; logoUrl?: string | null }) {
  return <BrandMark size={size} logoUrl={logoUrl} />;
}
