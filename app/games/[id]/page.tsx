import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { relationOne } from "@/lib/profile-data";
import LiveGameView from "./LiveGameView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GamePage({ params }: PageProps) {
  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name),
      away_team:teams!games_away_team_id_fkey(id, name)
    `)
    .eq("id", id)
    .maybeSingle();

  // A query failure is a server error, not evidence that the game is missing.
  if (gameError) throw new Error("Unable to load game", { cause: gameError });
  if (!game) notFound();

  const teamIds = [game.home_team_id, game.away_team_id].filter(
    (teamId): teamId is string => typeof teamId === "string"
  );

  const [statsResult, eventsResult, rosterResult] = await Promise.all([
    supabase
      .from("player_game_stats")
      .select("*, player:players(id, name)")
      .eq("game_id", id)
      .order("points", { ascending: false }),
    supabase
      .from("game_events")
      .select("id, sequence_no, event_type, team_id, player_id, period, clock_seconds, points, reversed_at")
      .eq("game_id", id)
      .order("sequence_no", { ascending: false })
      .limit(20),
    game.season_id && teamIds.length
      ? supabase
          .from("rosters")
          .select("team_id, player_id, jersey_number, player:players(id, name)")
          .eq("season_id", game.season_id)
          .in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [statsResult, eventsResult, rosterResult]) {
    if (result.error) {
      throw new Error("Unable to load game details", { cause: result.error });
    }
  }

  return (
    <LiveGameView
      key={game.id}
      initialGame={{
        ...game,
        home_team: relationOne(game.home_team),
        away_team: relationOne(game.away_team),
      }}
      initialPlayerStats={(statsResult.data ?? []).map((row) => ({
        ...row,
        player: relationOne(row.player),
      }))}
      initialEvents={eventsResult.data ?? []}
      roster={(rosterResult.data ?? []).map((row) => ({
        ...row,
        player: relationOne(row.player),
      }))}
    />
  );
}
