import { supabase } from "@/lib/supabase";
import StandingsClient from "./StandingsClient";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [
    standingsResult,
    seasonsResult,
  ] = await Promise.all([
    supabase
      .from("v_team_standings")
      .select(`
        team_id,
        team_name,
        games_played,
        wins,
        losses,
        points_for,
        points_against,
        point_diff,
        division,
        season_id,
        season_name,
        season_year
      `),

    supabase
      .from("seasons")
      .select(`
        id,
        name,
        season_year
      `)
      .order("season_year", {
        ascending: false,
      }),
  ]);

  if (standingsResult.error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-red-400">
          {standingsResult.error.message}
        </p>
      </main>
    );
  }

  if (seasonsResult.error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-red-400">
          {seasonsResult.error.message}
        </p>
      </main>
    );
  }

  return (
    <StandingsClient
      standings={
        standingsResult.data ?? []
      }
      seasons={
        seasonsResult.data ?? []
      }
    />
  );
}