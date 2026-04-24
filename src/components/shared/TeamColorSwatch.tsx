import { getTeamColorBackground } from '@/lib/constants';

type Props = {
  team?: { color?: string | null; secondary_color?: string | null } | null;
  className?: string;
  fallback?: string;
};

export function TeamColorSwatch({ team, className = '', fallback }: Props) {
  return (
    <div
      className={className}
      style={{ background: getTeamColorBackground(team, fallback) }}
    />
  );
}
