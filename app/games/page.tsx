import GamesClient from "./GamesClient";

import {
  getCachedGamesPage,
} from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;



export default async function GamesPage() {
  const payload =
    await getCachedGamesPage();

  const games =
    (payload?.games ??
      []).map(
        (game: any) => ({
          id: game.id,
          season_id:
            game.season_id,

          game_date:
            game.game_date,
          game_time:
            game.game_time,

          venue:
            game.venue,

          status:
            game.status,
          division:
            game.division,

          current_period:
            game.current_period,
          clock_seconds:
            game.clock_seconds,
          clock_running:
            game.clock_running,

          home_team_id:
            game.home_team_id,
          away_team_id:
            game.away_team_id,

          home_score:
            game.home_score,
          away_score:
            game.away_score,

          home_team: {
            id:
              game.home_team_id,
            name:
              game.home_team_name,
          },

          away_team: {
            id:
              game.away_team_id,
            name:
              game.away_team_name,
          },

          season: {
            id:
              game.season_id,
            name:
              game.season_name,
            season_year:
              game.season_year,
          },
        })
      );

  const seasons =
    payload?.seasons ??
    [];

  const memberships =
    (payload?.memberships ??
      []).map(
        (
          membership: any
        ) => ({
          season_id:
            membership.season_id,

          team_id:
            membership.team_id,

          division:
            membership.division,

          team: {
            id:
              membership.team_id,

            name:
              membership.team_name,
          },
        })
      );


  return (
    <GamesClient
      games={
        games
      }
      seasons={
        seasons
      }
      memberships={
        memberships
      }
    />
  );
}
