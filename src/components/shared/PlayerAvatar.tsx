type Props = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
  alt?: string;
};

export function PlayerAvatar({
  firstName,
  lastName,
  avatarUrl,
  className = 'w-8 h-8 rounded-full',
  textClassName = 'bg-blue-100 text-blue-900 text-xs font-semibold',
  alt,
}: Props) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}` || 'JG';
  const fallbackAlt = `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Jugador';
  const resolvedAlt = alt ?? fallbackAlt;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={resolvedAlt}
        className={`${className} object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${className} ${textClassName} flex items-center justify-center flex-shrink-0 uppercase`}
      aria-label={resolvedAlt}
    >
      {initials}
    </div>
  );
}
