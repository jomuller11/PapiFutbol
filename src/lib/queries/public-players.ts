import 'server-only';

type SupabaseLike = {
  from: (table: string) => any;
};

export type PublicPlayer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  position: string | null;
  foot: string | null;
  score: number | null;
  avatar_url: string | null;
};

export async function getPublicPlayersByIds(
  supabase: SupabaseLike,
  ids: Array<string | null | undefined>
): Promise<Record<string, PublicPlayer>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))) as string[];

  if (uniqueIds.length === 0) return {};

  const { data } = await supabase
    .from('v_players_public')
    .select('id, first_name, last_name, nickname, position, foot, score, avatar_url')
    .in('id', uniqueIds);

  return Object.fromEntries(((data as PublicPlayer[]) ?? []).map((player) => [player.id, player]));
}

export async function getPublicPlayerById(
  supabase: SupabaseLike,
  id: string
): Promise<PublicPlayer | null> {
  const { data } = await supabase
    .from('v_players_public')
    .select('id, first_name, last_name, nickname, position, foot, score, avatar_url')
    .eq('id', id)
    .maybeSingle();

  return (data as PublicPlayer | null) ?? null;
}
