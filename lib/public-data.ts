import { supabase } from "@/lib/supabase";


/*
 * =====================================================
 * PUBLIC LIVE READS
 * =====================================================
 *
 * These functions read public league data directly from Supabase on every request.
 *
 * Do not use these for:
 * - logged-in user data
 * - admin/scorer permissions
 * - manager assignments
 * - live scorer actions
 *
 * Those routes should stay dynamic.
 */


export const getCachedHomeDashboard =
  async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_home_dashboard"
        );

      if (error) {
        throw new Error(
          `Home dashboard failed: ${error.message}`
        );
      }

      return data as any;
    };


export const getCachedGamesPage =
  async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_public_games_page"
        );

      if (error) {
        throw new Error(
          `Games page failed: ${error.message}`
        );
      }

      return data as any;
    };


export const getCachedPlayersPage =
  async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_public_players_page"
        );

      if (error) {
        throw new Error(
          `Players page failed: ${error.message}`
        );
      }

      const [
        playerMediaResult,
        teamMediaResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "players"
            )
            .select(
              "id,photo_path"
            ),

          supabase
            .from(
              "teams"
            )
            .select(
              "id,logo_path"
            ),
        ]);

      if (
        playerMediaResult.error
      ) {
        throw new Error(
          `Player photos failed: ${playerMediaResult.error.message}`
        );
      }

      if (
        teamMediaResult.error
      ) {
        throw new Error(
          `Team logos failed: ${teamMediaResult.error.message}`
        );
      }

      const photos =
        new Map(
          (
            playerMediaResult.data ??
            []
          ).map(
            (row: any) => [
              row.id,
              row.photo_path ??
                null,
            ]
          )
        );

      const logos =
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

      return {
        ...(data as any),
        players:
          (
            (data as any)?.players ??
            []
          ).map(
            (row: any) => ({
              ...row,
              photo_path:
                photos.get(
                  row.player_id
                ) ??
                null,
              team_logo_path:
                logos.get(
                  row.team_id
                ) ??
                null,
            })
          ),
      } as any;
    };
