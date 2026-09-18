import { supabase } from "@/lib/supabase";

export const MEDIA_BUCKET =
  "basketball-media";

export function mediaPublicUrl(
  path:
    | string
    | null
    | undefined
) {
  if (!path) {
    return null;
  }

  return supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(path)
    .data.publicUrl;
}


export function numberValue(
  value: unknown
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}


export function relationOne<T = any>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  if (
    Array.isArray(value)
  ) {
    return value[0] ?? null;
  }

  return value;
}


function sortGamesNewestFirst(
  a: any,
  b: any
) {
  const aGame =
    relationOne(
      a.game ?? a
    );

  const bGame =
    relationOne(
      b.game ?? b
    );

  const aKey =
    `${aGame?.game_date ?? ""} ${aGame?.game_time ?? ""}`;

  const bKey =
    `${bGame?.game_date ?? ""} ${bGame?.game_time ?? ""}`;

  return bKey.localeCompare(
    aKey
  );
}


export const getPlayerProfile =
  async (
      playerId: string,
      preferredSeasonId?:
        | string
        | null
    ) => {
      const [
        playerResult,
        seasonStatsResult,
        gameLogResult,
      ] =
        await Promise.all([
          supabase
            .from("players")
            .select(
              "id,name,source,source_player_id,photo_path"
            )
            .eq(
              "id",
              playerId
            )
            .maybeSingle(),

          supabase
            .from(
              "v_player_season_stats"
            )
            .select("*")
            .eq(
              "player_id",
              playerId
            )
            .order(
              "season_year",
              {
                ascending: false,
                nullsFirst: false,
              }
            ),

          supabase
            .from(
              "player_game_stats"
            )
            .select(`
              game_id,
              team_id,
              jersey_number,
              points,
              rebounds,
              offensive_rebounds,
              defensive_rebounds,
              assists,
              steals,
              blocks,
              turnovers,
              fouls,
              two_made,
              two_attempted,
              two_pct,
              three_made,
              three_attempted,
              three_pct,
              ft_made,
              ft_attempted,
              ft_pct,
              plus_minus,
              efficiency,
              game:games!player_game_stats_game_id_fkey(
                id,
                season_id,
                game_date,
                game_time,
                venue,
                status,
                home_team_id,
                away_team_id,
                home_score,
                away_score,
                home_team:teams!games_home_team_id_fkey(
                  id,
                  name
                ),
                away_team:teams!games_away_team_id_fkey(
                  id,
                  name
                ),
                season:seasons!games_season_id_fkey(
                  id,
                  name,
                  season_year
                )
              )
            `)
            .eq(
              "player_id",
              playerId
            ),
        ]);

      if (
        playerResult.error
      ) {
        throw new Error(
          `Player failed: ${playerResult.error.message}`
        );
      }

      if (
        seasonStatsResult.error
      ) {
        throw new Error(
          `Player season stats failed: ${seasonStatsResult.error.message}`
        );
      }

      if (
        gameLogResult.error
      ) {
        throw new Error(
          `Player game log failed: ${gameLogResult.error.message}`
        );
      }

      if (
        !playerResult.data
      ) {
        return null;
      }

      const seasonStats =
        seasonStatsResult.data ??
        [];

      const latestSeason =
        (
          preferredSeasonId
            ? seasonStats.find(
                (row: any) =>
                  row.season_id ===
                  preferredSeasonId
              )
            : null
        ) ??
        seasonStats[0] ??
        null;

      let leaderboardRows:
        any[] =
        [];

      if (
        latestSeason?.season_id
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "v_player_season_stats"
            )
            .select(`
              player_id,
              games_played,
              ppg,
              rpg,
              apg,
              spg,
              bpg,
              three_pct,
              three_attempted,
              efficiency
            `)
            .eq(
              "season_id",
              latestSeason.season_id
            );

        if (error) {
          throw new Error(
            `Player ranking data failed: ${error.message}`
          );
        }

        leaderboardRows =
          data ?? [];
      }

      const gameLog =
        (
          gameLogResult.data ??
          []
        )
          .map(
            (row: any) => ({
              ...row,
              game:
                relationOne(
                  row.game
                ),
            })
          )
          .filter(
            (row: any) =>
              row.game
          )
          .sort(
            sortGamesNewestFirst
          );

      return {
        player:
          playerResult.data,
        seasonStats,
        latestSeason,
        leaderboardRows,
        gameLog,
      };
    };


export const getTeamProfile =
  async (
      teamId: string,
      preferredSeasonId?:
        | string
        | null
    ) => {
      const [
        teamResult,
        standingsResult,
        gamesResult,
        allTeamStatsResult,
        highlightLinksResult,
      ] =
        await Promise.all([
          supabase
            .from("teams")
            .select(`
              id,
              name,
              division,
              home_colour,
              away_colour,
              manager,
              logo_path,
              source,
              source_team_id
            `)
            .eq(
              "id",
              teamId
            )
            .maybeSingle(),

          supabase
            .from(
              "v_team_standings"
            )
            .select("*")
            .eq(
              "team_id",
              teamId
            )
            .order(
              "season_year",
              {
                ascending: false,
                nullsFirst: false,
              }
            ),

          supabase
            .from("games")
            .select(`
              id,
              season_id,
              game_date,
              game_time,
              venue,
              status,
              division,
              home_team_id,
              away_team_id,
              home_score,
              away_score,
              q1_home,
              q1_away,
              q2_home,
              q2_away,
              q3_home,
              q3_away,
              q4_home,
              q4_away,
              q5_home,
              q5_away,
              home_team:teams!games_home_team_id_fkey(
                id,
                name
              ),
              away_team:teams!games_away_team_id_fkey(
                id,
                name
              ),
              season:seasons!games_season_id_fkey(
                id,
                name,
                season_year
              )
            `)
            .or(
              `home_team_id.eq.${teamId},away_team_id.eq.${teamId}`
            ),

          supabase
            .from(
              "team_game_stats"
            )
            .select(`
              game_id,
              team_id,
              points,
              rebounds,
              assists,
              steals,
              blocks,
              turnovers,
              fg_made,
              fg_attempted,
              two_made,
              two_attempted,
              three_made,
              three_attempted,
              ft_made,
              ft_attempted
            `)
            .eq(
              "team_id",
              teamId
            ),

          supabase
            .from("highlight_teams")
            .select(`
              highlight_id,
              highlight:highlights(
                id,
                youtube_video_id,
                youtube_url,
                title,
                season_id,
                game_id,
                playlist_id,
                created_at
              )
            `)
            .eq("team_id", teamId),
        ]);

      if (
        teamResult.error
      ) {
        throw new Error(
          `Team failed: ${teamResult.error.message}`
        );
      }

      if (
        standingsResult.error
      ) {
        throw new Error(
          `Team standings failed: ${standingsResult.error.message}`
        );
      }

      if (
        gamesResult.error
      ) {
        throw new Error(
          `Team games failed: ${gamesResult.error.message}`
        );
      }

      if (
        allTeamStatsResult.error
      ) {
        throw new Error(
          `Team game stats failed: ${allTeamStatsResult.error.message}`
        );
      }

      if (
        highlightLinksResult.error
      ) {
        throw new Error(
          `Team highlights failed: ${highlightLinksResult.error.message}`
        );
      }

      if (
        !teamResult.data
      ) {
        return null;
      }

      const standings =
        standingsResult.data ??
        [];

      const latestSeason =
        (
          preferredSeasonId
            ? standings.find(
                (row: any) =>
                  row.season_id ===
                  preferredSeasonId
              )
            : null
        ) ??
        standings[0] ??
        null;

      let roster:
        any[] =
        [];

      let divisionStandings:
        any[] =
        [];

      if (
        latestSeason?.season_id
      ) {
        const [
          rosterResult,
          divisionResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "v_player_season_stats"
              )
              .select("*")
              .eq(
                "season_id",
                latestSeason.season_id
              )
              .eq(
                "team_id",
                teamId
              )
              .order(
                "total_points",
                {
                  ascending: false,
                }
              ),

            supabase
              .from(
                "v_team_standings"
              )
              .select("*")
              .eq(
                "season_id",
                latestSeason.season_id
              )
              .eq(
                "division",
                latestSeason.division
              ),
          ]);

        if (
          rosterResult.error
        ) {
          throw new Error(
            `Team roster failed: ${rosterResult.error.message}`
          );
        }

        if (
          divisionResult.error
        ) {
          throw new Error(
            `Division standings failed: ${divisionResult.error.message}`
          );
        }

        roster =
          rosterResult.data ??
          [];

        if (
          roster.length >
          0
        ) {
          const playerIds =
            roster
              .map(
                (row: any) =>
                  row.player_id
              )
              .filter(
                Boolean
              );

          const {
            data: playerMedia,
            error: playerMediaError,
          } =
            await supabase
              .from(
                "players"
              )
              .select(
                "id,photo_path"
              )
              .in(
                "id",
                playerIds
              );

          if (
            playerMediaError
          ) {
            throw new Error(
              `Player photos failed: ${playerMediaError.message}`
            );
          }

          const photos =
            new Map(
              (
                playerMedia ??
                []
              ).map(
                (row: any) => [
                  row.id,
                  row.photo_path ??
                    null,
                ]
              )
            );

          roster =
            roster.map(
              (row: any) => ({
                ...row,
                photo_path:
                  photos.get(
                    row.player_id
                  ) ??
                  null,
              })
            );
        }

        divisionStandings =
          divisionResult.data ??
          [];
      }

      const games =
        (
          gamesResult.data ??
          []
        )
          .map(
            (game: any) => ({
              ...game,
              home_team:
                relationOne(
                  game.home_team
                ),
              away_team:
                relationOne(
                  game.away_team
                ),
              season:
                relationOne(
                  game.season
                ),
            })
          )
          .sort(
            sortGamesNewestFirst
          );

      const latestSeasonGames =
        latestSeason
          ? games.filter(
              (game: any) =>
                game.season_id ===
                latestSeason.season_id
            )
          : [];

      const latestGameIds =
        new Set(
          latestSeasonGames.map(
            (game: any) =>
              game.id
          )
        );

      const latestTeamGameStats =
        (
          allTeamStatsResult.data ??
          []
        ).filter(
          (row: any) =>
            latestGameIds.has(
              row.game_id
            )
        );

      const teamHighlights =
        (
          highlightLinksResult.data ??
          []
        )
          .map((row: any) =>
            relationOne(row.highlight)
          )
          .filter(Boolean)
          .sort((a: any, b: any) =>
            String(b.created_at ?? "").localeCompare(
              String(a.created_at ?? "")
            )
          );

      return {
        team:
          teamResult.data,
        standings,
        latestSeason,
        divisionStandings,
        roster,
        games,
        latestSeasonGames,
        latestTeamGameStats,
        teamHighlights,
      };
    };


export const getTeamsDirectory =
  async () => {
      const [
        leaguesResult,
        seasonsResult,
        standingsResult,
        teamMediaResult,
      ] =
        await Promise.all([
          supabase
            .from("leagues")
            .select(
              "id,name,source,source_league_id"
            )
            .order(
              "name",
              {
                ascending: true,
              }
            ),

          supabase
            .from("seasons")
            .select(
              "id,name,season_year,league_id"
            )
            .order(
              "season_year",
              {
                ascending: false,
                nullsFirst: false,
              }
            ),

          supabase
            .from(
              "v_team_standings"
            )
            .select("*"),

          supabase
            .from(
              "teams"
            )
            .select(
              "id,logo_path"
            ),
        ]);

      if (
        leaguesResult.error
      ) {
        throw new Error(
          `Leagues failed: ${leaguesResult.error.message}`
        );
      }

      if (
        seasonsResult.error
      ) {
        throw new Error(
          `Seasons failed: ${seasonsResult.error.message}`
        );
      }

      if (
        standingsResult.error
      ) {
        throw new Error(
          `Teams directory failed: ${standingsResult.error.message}`
        );
      }

      if (
        teamMediaResult.error
      ) {
        throw new Error(
          `Team logos failed: ${teamMediaResult.error.message}`
        );
      }

      const teamLogos =
        new Map(
          (
            teamMediaResult.data ??
            []
          ).map(
            (row: any) => [
              row.id,
              row.logo_path ??
                null,
            ]
          )
        );

      const standingsWithLogos =
        (
          standingsResult.data ??
          []
        ).map(
          (row: any) => ({
            ...row,
            logo_path:
              teamLogos.get(
                row.team_id
              ) ??
              null,
          })
        );

      return {
        leagues:
          leaguesResult.data ??
          [],
        seasons:
          seasonsResult.data ??
          [],
        standings:
          standingsWithLogos,
      };
    };

