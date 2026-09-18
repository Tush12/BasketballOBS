import PlayersClient from "./PlayersClient";

import {
  getCachedPlayersPage,
} from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;



export default async function PlayersPage() {
  const payload =
    await getCachedPlayersPage();

  const players =
    payload?.players ??
    [];

  const leagues =
    payload?.leagues ??
    [];

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

          league_id:
            membership.league_id,

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
    <PlayersClient
      players={
        players
      }
      leagues={
        leagues
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
