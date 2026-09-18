"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";


type Game = {
  id: string;
  season_id: string | null;

  status:
    | "scheduled"
    | "live"
    | "finished"
    | string
    | null;

  game_date:
    | string
    | null;

  game_time:
    | string
    | null;

  venue:
    | string
    | null;

  home_team_id:
    | string
    | null;

  away_team_id:
    | string
    | null;

  home_score:
    | number
    | null;

  away_score:
    | number
    | null;

  current_period: number;
  clock_seconds: number;
  clock_running: boolean;

  clock_synced_at:
    | string
    | null;

  q1_length_seconds: number;
  q2_length_seconds: number;
  q3_length_seconds: number;
  q4_length_seconds: number;
  overtime_length_seconds: number;

  home_team: any;
  away_team: any;
};


type RosterPlayer = {
  team_id: string;
  player_id: string;

  jersey_number:
    | number
    | null;

  name: string;
};


type PlayerStat = {
  team_id: string;
  player_id: string;

  points:
    | number
    | null;

  rebounds:
    | number
    | null;

  assists:
    | number
    | null;

  steals:
    | number
    | null;

  blocks:
    | number
    | null;

  turnovers:
    | number
    | null;

  fouls:
    | number
    | null;

  two_made:
    | number
    | null;

  two_attempted:
    | number
    | null;

  three_made:
    | number
    | null;

  three_attempted:
    | number
    | null;

  ft_made:
    | number
    | null;

  ft_attempted:
    | number
    | null;
};


type ActionKey =
  | "free_throw_made"
  | "free_throw_missed"
  | "two_point_made"
  | "two_point_missed"
  | "three_point_made"
  | "three_point_missed"
  | "rebound"
  | "assist"
  | "steal"
  | "block"
  | "turnover"
  | "foul";


const FOUL_LIMIT = 6;


export default function LiveScorerPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const rawId =
    params?.id;

  const gameId =
    Array.isArray(
      rawId
    )
      ? rawId[0]
      : String(
          rawId ?? ""
        );


  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    game,
    setGame,
  ] =
    useState<Game | null>(
      null
    );

  const [
    roster,
    setRoster,
  ] =
    useState<
      RosterPlayer[]
    >([]);

  const [
    stats,
    setStats,
  ] =
    useState<
      PlayerStat[]
    >([]);

  const [
    selectedTeamId,
    setSelectedTeamId,
  ] =
    useState("");

  const [
    selectedPlayerId,
    setSelectedPlayerId,
  ] =
    useState("");

  const [
    displayClock,
    setDisplayClock,
  ] =
    useState(0);

  const [
    isFullscreen,
    setIsFullscreen,
  ] =
    useState(false);

  const zeroStopRef =
    useRef(false);


  /*
   * =====================================================
   * HARD VIEWPORT LOCK
   * =====================================================
   *
   * The scorer is an app-like surface. While this route
   * is mounted, the document itself is not allowed to
   * scroll on desktop, iPad or phone.
   */

  useEffect(() => {
    const html =
      document.documentElement;

    const body =
      document.body;

    const previousHtmlOverflow =
      html.style.overflow;

    const previousBodyOverflow =
      body.style.overflow;

    const previousBodyPosition =
      body.style.position;

    const previousBodyWidth =
      body.style.width;

    const previousBodyHeight =
      body.style.height;

    const previousBodyOverscroll =
      body.style.overscrollBehavior;


    html.style.overflow =
      "hidden";

    body.style.overflow =
      "hidden";

    body.style.position =
      "fixed";

    body.style.width =
      "100%";

    body.style.height =
      "100%";

    body.style.overscrollBehavior =
      "none";


    return () => {
      html.style.overflow =
        previousHtmlOverflow;

      body.style.overflow =
        previousBodyOverflow;

      body.style.position =
        previousBodyPosition;

      body.style.width =
        previousBodyWidth;

      body.style.height =
        previousBodyHeight;

      body.style.overscrollBehavior =
        previousBodyOverscroll;
    };
  }, []);


  /*
   * =====================================================
   * FULLSCREEN
   * =====================================================
   */

  useEffect(() => {
    function syncFullscreen() {
      const doc =
        document as Document & {
          webkitFullscreenElement?:
            Element | null;
        };

      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
            doc.webkitFullscreenElement
        )
      );
    }

    document.addEventListener(
      "fullscreenchange",
      syncFullscreen
    );

    document.addEventListener(
      "webkitfullscreenchange",
      syncFullscreen as EventListener
    );

    syncFullscreen();

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        syncFullscreen
      );

      document.removeEventListener(
        "webkitfullscreenchange",
        syncFullscreen as EventListener
      );
    };
  }, []);


  async function toggleFullscreen() {
    const doc =
      document as Document & {
        webkitFullscreenElement?:
          Element | null;

        webkitExitFullscreen?:
          () =>
            Promise<void> |
            void;
      };

    const root =
      document.documentElement as HTMLElement & {
        webkitRequestFullscreen?:
          () =>
            Promise<void> |
            void;
      };

    const active =
      Boolean(
        document.fullscreenElement ||
          doc.webkitFullscreenElement
      );

    try {
      if (active) {
        if (
          document.exitFullscreen
        ) {
          await document.exitFullscreen();
        } else if (
          doc.webkitExitFullscreen
        ) {
          await doc.webkitExitFullscreen();
        }
      } else {
        if (
          root.requestFullscreen
        ) {
          await root.requestFullscreen();
        } else if (
          root.webkitRequestFullscreen
        ) {
          await root.webkitRequestFullscreen();
        }
      }
    } catch (
      fullscreenError
    ) {
      console.error(
        "Fullscreen failed:",
        fullscreenError
      );

      setError(
        "Full screen is not available in this browser."
      );
    }
  }


  /*
   * =====================================================
   * AUTH + INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    if (!gameId) {
      return;
    }

    async function initialise() {
      setLoading(
        true
      );

      setError("");

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        router.replace(
          "/login"
        );

        return;
      }


      const {
        data: roleData,
        error: roleError,
      } =
        await supabase
          .from(
            "user_roles"
          )
          .select(
            "role"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .maybeSingle();


      if (
        roleError
      ) {
        setError(
          roleError.message
        );

        setLoading(
          false
        );

        return;
      }


      if (
        !roleData ||
        ![
          "admin",
          "scorer",
        ].includes(
          roleData.role
        )
      ) {
        setError(
          "You do not have scorer access."
        );

        setLoading(
          false
        );

        return;
      }


      await loadInitial();

      setLoading(
        false
      );
    }


    initialise();
  }, [
    gameId,
    router,
  ]);


  /*
   * =====================================================
   * LOADERS
   * =====================================================
   */

  async function loadInitial() {
    const {
      data:
        gameData,
      error:
        gameError,
    } =
      await supabase
        .from(
          "games"
        )
        .select(`
          id,
          season_id,
          status,
          game_date,
          game_time,
          venue,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          current_period,
          clock_seconds,
          clock_running,
          clock_synced_at,
          q1_length_seconds,
          q2_length_seconds,
          q3_length_seconds,
          q4_length_seconds,
          overtime_length_seconds,

          home_team:teams!games_home_team_id_fkey(
            id,
            name
          ),

          away_team:teams!games_away_team_id_fkey(
            id,
            name
          )
        `)
        .eq(
          "id",
          gameId
        )
        .single();


    if (
      gameError ||
      !gameData
    ) {
      setError(
        gameError?.message ??
          "Game not found."
      );

      return;
    }


    const typedGame =
      gameData as any as Game;

    setGame(
      typedGame
    );


    const teamIds =
      [
        typedGame.home_team_id,
        typedGame.away_team_id,
      ].filter(
        Boolean
      ) as string[];


    const [
      rosterResult,
      statsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "rosters"
          )
          .select(`
            team_id,
            player_id,
            jersey_number,

            player:players(
              id,
              name
            )
          `)
          .eq(
            "season_id",
            typedGame.season_id
          )
          .in(
            "team_id",
            teamIds
          ),

        supabase
          .from(
            "player_game_stats"
          )
          .select(`
            team_id,
            player_id,
            points,
            rebounds,
            assists,
            steals,
            blocks,
            turnovers,
            fouls,
            two_made,
            two_attempted,
            three_made,
            three_attempted,
            ft_made,
            ft_attempted
          `)
          .eq(
            "game_id",
            gameId
          ),
      ]);


    if (
      rosterResult.error
    ) {
      setError(
        rosterResult
          .error.message
      );

      return;
    }


    if (
      statsResult.error
    ) {
      setError(
        statsResult
          .error.message
      );

      return;
    }


    const loadedRoster =
      (
        rosterResult.data ??
        []
      ).map(
        (
          row: any
        ) => ({
          team_id:
            row.team_id,

          player_id:
            row.player_id,

          jersey_number:
            row.jersey_number,

          name:
            relationOne(
              row.player
            )?.name ??
            "Unknown Player",
        })
      )
      .sort(
        (
          a,
          b
        ) => {
          const aNo =
            a.jersey_number ??
            9999;

          const bNo =
            b.jersey_number ??
            9999;

          if (
            aNo !== bNo
          ) {
            return (
              aNo -
              bNo
            );
          }

          return a.name.localeCompare(
            b.name
          );
        }
      );


    setRoster(
      loadedRoster
    );

    setStats(
      (
        statsResult.data ??
        []
      ) as PlayerStat[]
    );


    setSelectedTeamId(
      (
        current
      ) => {
        if (
          current &&
          teamIds.includes(
            current
          )
        ) {
          return current;
        }

        return (
          typedGame.home_team_id ??
          typedGame.away_team_id ??
          ""
        );
      }
    );
  }


  async function refreshState() {
    const [
      gameResult,
      statsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "games"
          )
          .select(`
            id,
            season_id,
            status,
            game_date,
            game_time,
            venue,
            home_team_id,
            away_team_id,
            home_score,
            away_score,
            current_period,
            clock_seconds,
            clock_running,
            clock_synced_at,
            q1_length_seconds,
            q2_length_seconds,
            q3_length_seconds,
            q4_length_seconds,
            overtime_length_seconds,

            home_team:teams!games_home_team_id_fkey(
              id,
              name
            ),

            away_team:teams!games_away_team_id_fkey(
              id,
              name
            )
          `)
          .eq(
            "id",
            gameId
          )
          .single(),

        supabase
          .from(
            "player_game_stats"
          )
          .select(`
            team_id,
            player_id,
            points,
            rebounds,
            assists,
            steals,
            blocks,
            turnovers,
            fouls,
            two_made,
            two_attempted,
            three_made,
            three_attempted,
            ft_made,
            ft_attempted
          `)
          .eq(
            "game_id",
            gameId
          ),
      ]);


    if (
      gameResult.error
    ) {
      setError(
        gameResult
          .error.message
      );

      return;
    }


    if (
      statsResult.error
    ) {
      setError(
        statsResult
          .error.message
      );

      return;
    }


    setGame(
      gameResult.data as any as Game
    );

    setStats(
      (
        statsResult.data ??
        []
      ) as PlayerStat[]
    );
  }


  /*
   * =====================================================
   * REALTIME
   * =====================================================
   */

  useEffect(() => {
    if (!gameId) {
      return;
    }


    const channel =
      supabase
        .channel(
          `scorer-${gameId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",
            schema:
              "public",
            table:
              "games",
            filter:
              `id=eq.${gameId}`,
          },
          () => {
            refreshState();
          }
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",
            schema:
              "public",
            table:
              "game_events",
            filter:
              `game_id=eq.${gameId}`,
          },
          () => {
            refreshState();
          }
        )
        .subscribe();


    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    gameId,
  ]);


  /*
   * =====================================================
   * PLAYER SELECTION
   * =====================================================
   */

  const selectedTeamPlayers =
    useMemo(
      () =>
        roster.filter(
          (
            player
          ) =>
            player.team_id ===
            selectedTeamId
        ),
      [
        roster,
        selectedTeamId,
      ]
    );


  const homePlayers =
    useMemo(
      () =>
        roster.filter(
          (
            player
          ) =>
            player.team_id ===
            game?.home_team_id
        ),
      [
        roster,
        game?.home_team_id,
      ]
    );


  const awayPlayers =
    useMemo(
      () =>
        roster.filter(
          (
            player
          ) =>
            player.team_id ===
            game?.away_team_id
        ),
      [
        roster,
        game?.away_team_id,
      ]
    );


  const statMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          PlayerStat
        >();

      stats.forEach(
        (
          row
        ) => {
          map.set(
            row.player_id,
            row
          );
        }
      );

      return map;
    }, [
      stats,
    ]);


  useEffect(() => {
    const current =
      selectedTeamPlayers.find(
        (
          player
        ) =>
          player.player_id ===
          selectedPlayerId
      );


    const currentFouls =
      current
        ? Number(
            statMap.get(
              current.player_id
            )?.fouls ??
              0
          )
        : FOUL_LIMIT;


    if (
      current &&
      currentFouls <
        FOUL_LIMIT
    ) {
      return;
    }


    /*
     * Do not silently move scoring to another player.
     * The scorer must explicitly choose the player,
     * which prevents accidental stats being recorded.
     */
    setSelectedPlayerId("");
  }, [
    selectedTeamId,
    selectedTeamPlayers,
    selectedPlayerId,
    statMap,
  ]);


  const selectedPlayer =
    selectedTeamPlayers.find(
      (
        player
      ) =>
        player.player_id ===
        selectedPlayerId
    ) ??
    null;


  const selectedStat =
    selectedPlayer
      ? statMap.get(
          selectedPlayer.player_id
        ) ??
        null
      : null;


  const selectedFouls =
    Number(
      selectedStat?.fouls ??
        0
    );


  const selectedFouledOut =
    selectedFouls >=
    FOUL_LIMIT;


  /*
   * =====================================================
   * CLOCK
   * =====================================================
   */

  useEffect(() => {
    if (!game) {
      return;
    }


    function syncClock() {
      const seconds =
        effectiveClock(
          game
        );

      setDisplayClock(
        seconds
      );


      if (
        seconds <= 0 &&
        game.clock_running &&
        !zeroStopRef.current
      ) {
        zeroStopRef.current =
          true;

        supabase
          .rpc(
            "set_game_clock",
            {
              p_game_id:
                game.id,

              p_clock_seconds:
                0,

              p_running:
                false,
            }
          )
          .then(
            () =>
              refreshState()
          );
      }


      if (
        seconds > 0
      ) {
        zeroStopRef.current =
          false;
      }
    }


    syncClock();


    if (
      !game.clock_running
    ) {
      return;
    }


    const timer =
      window.setInterval(
        syncClock,
        250
      );


    return () =>
      window.clearInterval(
        timer
      );
  }, [
    game,
  ]);


  async function toggleClock() {
    if (
      !game ||
      game.status !==
        "live" ||
      busy
    ) {
      return;
    }


    setBusy(
      true
    );

    setError("");


    const {
      error:
        clockError,
    } =
      await supabase.rpc(
        "set_game_clock",
        {
          p_game_id:
            game.id,

          p_clock_seconds:
            displayClock,

          p_running:
            !game.clock_running &&
            displayClock >
              0,
        }
      );


    if (
      clockError
    ) {
      setError(
        clockError.message
      );
    }


    await refreshState();

    setBusy(
      false
    );
  }


  /*
   * =====================================================
   * GAME ACTIONS
   * =====================================================
   */

  async function startGame() {
    if (
      !game ||
      busy
    ) {
      return;
    }


    setBusy(
      true
    );

    setError("");


    const {
      error:
        startError,
    } =
      await supabase.rpc(
        "start_game",
        {
          p_game_id:
            game.id,
        }
      );


    if (
      startError
    ) {
      setError(
        startError.message
      );
    }


    await refreshState();

    setBusy(
      false
    );
  }


  async function recordAction(
    eventType:
      ActionKey,
    points = 0
  ) {
    if (
      !game ||
      game.status !==
        "live" ||
      busy
    ) {
      return;
    }


    if (
      !selectedTeamId ||
      !selectedPlayerId
    ) {
      setError(
        "Select a player first."
      );

      return;
    }


    if (
      selectedFouledOut
    ) {
      setError(
        "This player has fouled out."
      );

      return;
    }


    setBusy(
      true
    );

    setError("");


    const {
      error:
        actionError,
    } =
      await supabase.rpc(
        "record_game_event",
        {
          p_game_id:
            game.id,

          p_team_id:
            selectedTeamId,

          p_player_id:
            selectedPlayerId,

          p_event_type:
            eventType,

          p_points:
            points,

          p_metadata:
            {},
        }
      );


    if (
      actionError
    ) {
      setError(
        actionError.message
      );
    }


    await refreshState();

    setBusy(
      false
    );
  }


  async function undoLast() {
    if (
      !game ||
      busy
    ) {
      return;
    }


    setBusy(
      true
    );

    setError("");


    const {
      error:
        undoError,
    } =
      await supabase.rpc(
        "undo_last_game_event",
        {
          p_game_id:
            game.id,
        }
      );


    if (
      undoError
    ) {
      setError(
        undoError.message
      );
    }


    await refreshState();

    setBusy(
      false
    );
  }


  async function nextPeriod() {
    if (
      !game ||
      busy ||
      game.status !==
        "live" ||
      game.clock_running ||
      game.current_period >=
        5
    ) {
      return;
    }


    setBusy(
      true
    );

    setError("");


    const {
      error:
        periodError,
    } =
      await supabase.rpc(
        "next_game_period",
        {
          p_game_id:
            game.id,
        }
      );


    if (
      periodError
    ) {
      setError(
        periodError.message
      );
    }


    await refreshState();

    setBusy(
      false
    );
  }


  async function endGame() {
    if (
      !game ||
      busy
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "End this game? This will mark the match as finished."
      );


    if (
      !confirmed
    ) {
      return;
    }


    setBusy(
      true
    );

    setError("");


    if (
      game.status ===
        "live" &&
      game.clock_running
    ) {
      await supabase.rpc(
        "set_game_clock",
        {
          p_game_id:
            game.id,

          p_clock_seconds:
            displayClock,

          p_running:
            false,
        }
      );
    }


    const {
      error:
        endError,
    } =
      await supabase.rpc(
        "end_game",
        {
          p_game_id:
            game.id,
        }
      );


    if (
      endError
    ) {
      setError(
        endError.message
      );

      setBusy(
        false
      );

      return;
    }


    router.push(
      "/scorer"
    );

    router.refresh();
  }


  /*
   * =====================================================
   * LOADING / ERROR
   * =====================================================
   */

  if (
    loading
  ) {
    return (
      <main
        className="fixed inset-0 z-[9999] flex h-[100dvh] w-[100vw] items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4"
        style={{
          background:
            "var(--background)",
          color:
            "var(--foreground)",
        }}
      >
        <p
          className="font-bold"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          Loading scorer...
        </p>
      </main>
    );
  }


  if (
    !game
  ) {
    return (
      <main
        className="fixed inset-0 z-[9999] flex h-[100dvh] w-[100vw] items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4"
        style={{
          background:
            "var(--background)",
          color:
            "var(--foreground)",
        }}
      >
        <div className="max-w-md text-center">

          <h1 className="text-2xl font-black">
            Scorer unavailable
          </h1>

          <p
            className="mt-3"
            style={{
              color:
                "var(--danger)",
            }}
          >
            {error ||
              "Game not found."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/scorer"
              )
            }
            className="mt-6 rounded-xl border px-5 py-3 font-black"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--card)",
            }}
          >
            Back to Dashboard
          </button>

        </div>
      </main>
    );
  }


  const home =
    relationOne(
      game.home_team
    );

  const away =
    relationOne(
      game.away_team
    );


  const homeName =
    home?.name ??
    "Home";

  const awayName =
    away?.name ??
    "Away";


  /*
   * =====================================================
   * SCHEDULED
   * =====================================================
   */

  if (
    game.status ===
    "scheduled"
  ) {
    return (
      <main
        className="fixed inset-0 z-[9999] flex h-[100dvh] w-[100vw] items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4"
        style={{
          background:
            "var(--background)",
          color:
            "var(--foreground)",
        }}
      >

        <section
          className="w-full max-w-2xl rounded-3xl border p-6 text-center sm:p-10"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
          }}
        >

          <p
            className="text-xs font-black uppercase tracking-[0.2em]"
            style={{
              color:
                "var(--primary)",
            }}
          >
            Ready to score
          </p>

          <h1 className="mt-5 text-3xl font-black sm:text-5xl">
            {homeName}
          </h1>

          <p
            className="my-3 text-lg font-black"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            vs
          </p>

          <h1 className="text-3xl font-black sm:text-5xl">
            {awayName}
          </h1>


          {error && (
            <p
              className="mt-5 rounded-xl px-4 py-3 text-sm font-bold"
              style={{
                background:
                  "color-mix(in srgb, var(--danger) 10%, transparent)",
                color:
                  "var(--danger)",
              }}
            >
              {error}
            </p>
          )}


          <div className="mt-8 grid grid-cols-2 gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/scorer"
                )
              }
              className="rounded-xl border px-5 py-4 font-black"
              style={{
                borderColor:
                  "var(--border)",
                background:
                  "var(--card)",
              }}
            >
              Back
            </button>

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                startGame
              }
              className="rounded-xl px-5 py-4 font-black text-white disabled:opacity-40"
              style={{
                background:
                  "var(--primary)",
              }}
            >
              {busy
                ? "Starting..."
                : "Start Game"}
            </button>

          </div>

        </section>

      </main>
    );
  }


  /*
   * =====================================================
   * FINISHED
   * =====================================================
   */

  if (
    game.status ===
    "finished"
  ) {
    return (
      <main
        className="fixed inset-0 z-[9999] flex h-[100dvh] w-[100vw] items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4"
        style={{
          background:
            "var(--background)",
          color:
            "var(--foreground)",
        }}
      >
        <section
          className="w-full max-w-2xl rounded-3xl border p-7 text-center"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
          }}
        >
          <p
            className="text-xs font-black uppercase tracking-[0.2em]"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            Final
          </p>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

            <div className="min-w-0">
              <p className="truncate font-black">
                {homeName}
              </p>

              <p className="mt-2 text-5xl font-black">
                {game.home_score ??
                  0}
              </p>
            </div>

            <p
              className="font-black"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              –
            </p>

            <div className="min-w-0">
              <p className="truncate font-black">
                {awayName}
              </p>

              <p className="mt-2 text-5xl font-black">
                {game.away_score ??
                  0}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/scorer"
              )
            }
            className="mt-8 rounded-xl px-6 py-3 font-black text-white"
            style={{
              background:
                "var(--primary)",
            }}
          >
            Back to Dashboard
          </button>

        </section>
      </main>
    );
  }


  /*
   * =====================================================
   * LIVE SCORER — COURTSIDE CONSOLE
   * =====================================================
   *
   * DESKTOP / IPAD LANDSCAPE
   * Home roster | scoring console | Away roster
   *
   * PHONE / NARROW SCREEN
   * Scoreboard
   * Home roster
   * Away roster
   * Scoring console
   *
   * No page scrolling in any layout.
   */

  return (
    <main
      className="fixed inset-0 z-[9999] h-[100dvh] w-[100vw] overflow-hidden overscroll-none"
      style={{
        background:
          "var(--background)",
        color:
          "var(--foreground)",
      }}
    >

      <div className="scorer-shell grid h-full min-h-0 w-full grid-rows-[var(--scoreboard-h)_minmax(0,1fr)_var(--bottom-h)] gap-[var(--gap)] p-[var(--pad)] [padding-top:max(var(--pad),env(safe-area-inset-top))] [padding-bottom:max(var(--pad),env(safe-area-inset-bottom))]">

        {/* =================================================
            SCOREBOARD
            ================================================= */}

        <section
          className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center overflow-hidden rounded-xl border px-[clamp(8px,1.3vw,18px)] sm:rounded-2xl"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
          }}
        >

          {/* HOME SCORE */}

          <div className="min-w-0">

            <p
              className="truncate text-[clamp(9px,1.5dvh,14px)] font-black uppercase tracking-wide"
              style={{
                color:
                  selectedTeamId ===
                  game.home_team_id
                    ? "var(--primary)"
                    : "var(--muted-foreground)",
              }}
            >
              {homeName}
            </p>

            <p className="mt-[2px] text-[clamp(34px,7dvh,68px)] font-black leading-none tabular-nums">
              {game.home_score ??
                0}
            </p>

          </div>


          {/* CLOCK */}

          <div className="mx-[clamp(3px,0.8vw,10px)] flex items-center gap-[clamp(4px,0.7vw,9px)]">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/scorer"
                )
              }
              className="flex h-[clamp(34px,5dvh,44px)] w-[clamp(34px,5dvh,44px)] shrink-0 items-center justify-center rounded-xl border text-lg font-black"
              style={{
                borderColor:
                  "var(--border)",
                background:
                  "var(--surface)",
              }}
              aria-label="Back to scorer dashboard"
              title="Back"
            >
              ←
            </button>


            <button
              type="button"
              onClick={
                toggleClock
              }
              disabled={
                busy ||
                displayClock <=
                  0
              }
              className="clock-touch flex min-w-[clamp(110px,18vw,210px)] flex-col items-center justify-center rounded-xl border px-[clamp(6px,1vw,12px)] py-[2px] disabled:opacity-50"
              style={{
                borderColor:
                  game.clock_running
                    ? "color-mix(in srgb, var(--danger) 60%, var(--border))"
                    : "color-mix(in srgb, var(--primary) 60%, var(--border))",

                background:
                  game.clock_running
                    ? "color-mix(in srgb, var(--danger) 10%, var(--card))"
                    : "var(--primary-soft)",
              }}
            >

              <div className="flex items-center justify-center gap-[clamp(5px,0.8vw,9px)]">

                <span
                  className="rounded-full px-2 py-0.5 text-[clamp(9px,1.3dvh,12px)] font-black"
                  style={{
                    background:
                      "var(--primary)",
                    color:
                      "white",
                  }}
                >
                  Q{game.current_period}
                </span>

                <span className="font-mono text-[clamp(26px,5.5dvh,50px)] font-black leading-none tabular-nums">
                  {formatClock(
                    displayClock
                  )}
                </span>

              </div>


              <span
                className="mt-[1px] text-[clamp(7px,1dvh,9px)] font-black uppercase tracking-wider"
                style={{
                  color:
                    game.clock_running
                      ? "var(--danger)"
                      : "var(--primary)",
                }}
              >
                {game.clock_running
                  ? "Tap to pause"
                  : "Tap to start"}
              </span>

            </button>


            <button
              type="button"
              onClick={
                toggleFullscreen
              }
              className="flex h-[clamp(34px,5dvh,44px)] w-[clamp(34px,5dvh,44px)] shrink-0 items-center justify-center rounded-xl border"
              style={{
                borderColor:
                  isFullscreen
                    ? "var(--primary)"
                    : "var(--border)",

                background:
                  isFullscreen
                    ? "var(--primary-soft)"
                    : "var(--surface)",

                color:
                  isFullscreen
                    ? "var(--primary)"
                    : "var(--foreground)",
              }}
              aria-label={
                isFullscreen
                  ? "Exit full screen"
                  : "Enter full screen"
              }
              title={
                isFullscreen
                  ? "Exit full screen"
                  : "Full screen"
              }
            >
              {isFullscreen ? (
                <ExitFullscreenIcon />
              ) : (
                <FullscreenIcon />
              )}
            </button>

          </div>


          {/* AWAY SCORE */}

          <div className="min-w-0 text-right">

            <p
              className="truncate text-[clamp(9px,1.5dvh,14px)] font-black uppercase tracking-wide"
              style={{
                color:
                  selectedTeamId ===
                  game.away_team_id
                    ? "var(--primary)"
                    : "var(--muted-foreground)",
              }}
            >
              {awayName}
            </p>

            <p className="mt-[2px] text-[clamp(34px,7dvh,68px)] font-black leading-none tabular-nums">
              {game.away_score ??
                0}
            </p>

          </div>

        </section>


        {/* =================================================
            MAIN COURTSIDE AREA
            ================================================= */}

        <section className="scorer-main grid min-h-0 gap-[var(--gap)] overflow-hidden">

          {/* HOME ROSTER */}

          <div className="home-roster min-h-0 overflow-hidden">

            <RosterPanel
              label="HOME"
              teamName={
                homeName
              }
              players={
                homePlayers
              }
              statMap={
                statMap
              }
              selectedPlayerId={
                selectedPlayerId
              }
              onSelect={(
                player
              ) => {
                const fouls =
                  Number(
                    statMap.get(
                      player.player_id
                    )?.fouls ??
                      0
                  );

                if (
                  fouls >=
                  FOUL_LIMIT
                ) {
                  return;
                }

                setSelectedTeamId(
                  player.team_id
                );

                setSelectedPlayerId(
                  player.player_id
                );

                setError("");
              }}
            />

          </div>


          {/* =================================================
              CENTER SCORING CONSOLE
              ================================================= */}

          <section
            className="action-console grid min-h-0 grid-rows-[var(--selected-h)_minmax(0,1fr)] gap-[var(--gap)] overflow-hidden rounded-xl border p-[var(--console-pad)] sm:rounded-2xl"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--card)",
            }}
          >

            {/* SELECTED PLAYER */}

            <div
              className="selected-player flex min-h-0 items-center justify-center overflow-hidden rounded-lg border px-2 text-center sm:rounded-xl"
              style={{
                borderColor:
                  selectedPlayer
                    ? "var(--primary)"
                    : "var(--border)",

                background:
                  selectedPlayer
                    ? "var(--primary-soft)"
                    : "var(--surface)",
              }}
            >

              {selectedPlayer ? (

                <div className="flex min-w-0 items-center justify-center gap-[clamp(5px,0.8vw,12px)]">

                  <span
                    className="shrink-0 text-[clamp(15px,2.2dvh,22px)] font-black"
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  >
                    #
                    {selectedPlayer.jersey_number ??
                      "—"}
                  </span>

                  <span className="min-w-0 truncate text-[clamp(12px,1.8dvh,17px)] font-black">
                    {selectedPlayer.name}
                  </span>

                  <span
                    className="shrink-0 text-[clamp(9px,1.3dvh,12px)] font-black"
                    style={{
                      color:
                        selectedFouls >=
                        5
                          ? "var(--danger)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    {selectedStat?.points ??
                      0} PTS
                    {" · "}
                    F {selectedFouls}/
                    {FOUL_LIMIT}
                  </span>

                </div>

              ) : (

                <p
                  className="text-[clamp(10px,1.4dvh,13px)] font-black uppercase tracking-wide"
                  style={{
                    color:
                      "var(--primary)",
                  }}
                >
                  Tap any player → then tap a stat
                </p>

              )}

            </div>


            {/* SCORING BUTTONS */}

            <div className="scorer-actions grid min-h-0 grid-cols-3 grid-rows-4 gap-[var(--action-gap)] overflow-hidden">

              {/* ROW 1 — MADE SHOTS */}

              <ActionButton
                label="FT +1"
                sublabel="Made"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                emphasis
                onClick={() =>
                  recordAction(
                    "free_throw_made",
                    1
                  )
                }
              />

              <ActionButton
                label="2PT +2"
                sublabel="Made"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                emphasis
                onClick={() =>
                  recordAction(
                    "two_point_made",
                    2
                  )
                }
              />

              <ActionButton
                label="3PT +3"
                sublabel="Made"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                emphasis
                onClick={() =>
                  recordAction(
                    "three_point_made",
                    3
                  )
                }
              />


              {/* ROW 2 — MISSES */}

              <ActionButton
                label="FT MISS"
                sublabel="Attempt"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "free_throw_missed"
                  )
                }
              />

              <ActionButton
                label="2PT MISS"
                sublabel="Attempt"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "two_point_missed"
                  )
                }
              />

              <ActionButton
                label="3PT MISS"
                sublabel="Attempt"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "three_point_missed"
                  )
                }
              />


              {/* ROW 3 */}

              <ActionButton
                label="REB"
                sublabel="Rebound"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "rebound"
                  )
                }
              />

              <ActionButton
                label="AST"
                sublabel="Assist"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "assist"
                  )
                }
              />

              <ActionButton
                label="STL"
                sublabel="Steal"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "steal"
                  )
                }
              />


              {/* ROW 4 */}

              <ActionButton
                label="BLK"
                sublabel="Block"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "block"
                  )
                }
              />

              <ActionButton
                label="TO"
                sublabel="Turnover"
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "turnover"
                  )
                }
              />

              <ActionButton
                label={`FOUL ${selectedFouls}/${FOUL_LIMIT}`}
                sublabel={
                  selectedFouls ===
                  FOUL_LIMIT -
                    1
                    ? "Foul out"
                    : "Personal"
                }
                danger={
                  selectedFouls >=
                  FOUL_LIMIT -
                    1
                }
                disabled={
                  !selectedPlayer ||
                  selectedFouledOut ||
                  busy
                }
                onClick={() =>
                  recordAction(
                    "foul"
                  )
                }
              />

            </div>

          </section>


          {/* AWAY ROSTER */}

          <div className="away-roster min-h-0 overflow-hidden">

            <RosterPanel
              label="AWAY"
              teamName={
                awayName
              }
              players={
                awayPlayers
              }
              statMap={
                statMap
              }
              selectedPlayerId={
                selectedPlayerId
              }
              onSelect={(
                player
              ) => {
                const fouls =
                  Number(
                    statMap.get(
                      player.player_id
                    )?.fouls ??
                      0
                  );

                if (
                  fouls >=
                  FOUL_LIMIT
                ) {
                  return;
                }

                setSelectedTeamId(
                  player.team_id
                );

                setSelectedPlayerId(
                  player.player_id
                );

                setError("");
              }}
            />

          </div>


          {error && (

            <div
              className="pointer-events-none fixed left-1/2 top-[calc(var(--scoreboard-h)+var(--pad)+var(--gap))] z-[10000] max-w-[92vw] -translate-x-1/2 truncate rounded-lg px-3 py-1.5 text-xs font-black shadow-lg"
              style={{
                background:
                  "var(--danger)",
                color:
                  "white",
              }}
              title={
                error
              }
            >
              {error}
            </div>

          )}

        </section>


        {/* =================================================
            BOTTOM ACTIONS
            ================================================= */}

        <section className="grid min-h-0 grid-cols-3 gap-[var(--gap)] overflow-hidden">

          <button
            type="button"
            disabled={
              busy
            }
            onClick={
              undoLast
            }
            className="h-full min-h-0 rounded-lg border px-1 text-[clamp(10px,1.55dvh,14px)] font-black disabled:opacity-40 sm:rounded-xl"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--card)",
            }}
          >
            ↶ UNDO
          </button>


          <button
            type="button"
            disabled={
              busy ||
              game.clock_running ||
              game.current_period >=
                5
            }
            onClick={
              nextPeriod
            }
            className="h-full min-h-0 rounded-lg border px-1 text-[clamp(10px,1.55dvh,14px)] font-black disabled:opacity-35 sm:rounded-xl"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--card)",
            }}
          >
            {game.current_period >=
            5
              ? "Q5 FINAL"
              : `NEXT Q${
                  game.current_period +
                  1
                }`}
          </button>


          <button
            type="button"
            disabled={
              busy
            }
            onClick={
              endGame
            }
            className="h-full min-h-0 rounded-lg px-1 text-[clamp(10px,1.55dvh,14px)] font-black text-white disabled:opacity-40 sm:rounded-xl"
            style={{
              background:
                "var(--danger)",
            }}
          >
            END GAME
          </button>

        </section>

      </div>


      <style jsx global>{`

        html,
        body {
          width: 100% !important;
          height: 100% !important;
          max-height: 100% !important;
          overflow: hidden !important;
          overscroll-behavior: none !important;
        }


        .scorer-shell {
          --pad: clamp(4px, 0.65dvh, 9px);
          --gap: clamp(4px, 0.55dvh, 7px);
          --action-gap: clamp(4px, 0.6dvh, 8px);
          --console-pad: clamp(4px, 0.6dvh, 8px);

          --scoreboard-h:
            clamp(
              76px,
              12dvh,
              108px
            );

          --bottom-h:
            clamp(
              42px,
              6.5dvh,
              58px
            );

          --selected-h:
            clamp(
              36px,
              5.5dvh,
              50px
            );
        }


        /*
         * PHONE / NARROW PORTRAIT
         *
         * Both rosters remain fully visible above the
         * scoring console.
         */

        .scorer-main {
          grid-template-areas:
            "home"
            "away"
            "actions";

          grid-template-columns:
            minmax(0, 1fr);

          grid-template-rows:
            minmax(0, 0.26fr)
            minmax(0, 0.26fr)
            minmax(0, 0.48fr);
        }

        .home-roster {
          grid-area: home;
        }

        .away-roster {
          grid-area: away;
        }

        .action-console {
          grid-area: actions;
        }


        /*
         * WEB / IPAD / LANDSCAPE
         *
         * Rosters become full-height side panels.
         * This is much easier for rapid one-tap scoring.
         */

        @media (min-width: 700px) {

          .scorer-main {
            grid-template-areas:
              "home actions away";

            grid-template-columns:
              minmax(210px, 0.9fr)
              minmax(390px, 1.55fr)
              minmax(210px, 0.9fr);

            grid-template-rows:
              minmax(0, 1fr);
          }

        }


        /*
         * Short landscape displays
         */

        @media (
          min-width: 700px
        ) and (
          max-height: 600px
        ) {

          .scorer-shell {
            --scoreboard-h: 66px;
            --bottom-h: 40px;
            --selected-h: 34px;
            --pad: 3px;
            --gap: 3px;
            --action-gap: 3px;
            --console-pad: 3px;
          }

        }


        /*
         * CRITICAL:
         * globals.css gives every button a 44px minimum height.
         * Player grids need to control their own row height,
         * otherwise rows overflow and names get clipped.
         */

        .player-pick {
          min-height: 0 !important;
          height: 100% !important;
        }

        .action-stat-button {
          min-height: 0 !important;
          height: 100% !important;
        }

        .roster-player-grid {
          min-height: 0;
          grid-auto-rows:
            minmax(
              0,
              1fr
            );
        }


        /*
         * Narrow screens:
         * fit several players across each roster.
         */

        @media (max-width: 699px) {

          .roster-player-grid {
            grid-template-columns:
              repeat(
                auto-fit,
                minmax(
                  64px,
                  1fr
                )
              );
          }

        }


        /*
         * Side roster panels:
         * two wide columns = large, easy targets.
         */

        @media (min-width: 700px) {

          .roster-player-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }

        }

      `}</style>

    </main>
  );
}


/*
 * =====================================================
 * ALWAYS-VISIBLE ROSTER
 * =====================================================
 */

function RosterPanel({
  label,
  teamName,
  players,
  statMap,
  selectedPlayerId,
  onSelect,
}: {
  label: string;
  teamName: string;
  players: RosterPlayer[];
  statMap: Map<
    string,
    PlayerStat
  >;
  selectedPlayerId: string;
  onSelect: (
    player:
      RosterPlayer
  ) => void;
}) {
  return (
    <div
      className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border p-[clamp(4px,0.6dvh,8px)] sm:rounded-2xl"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >

      <div className="flex min-h-0 items-center justify-between gap-2 px-1 pb-[clamp(3px,0.45dvh,6px)]">

        <p
          className="min-w-0 truncate text-[clamp(10px,1.5dvh,14px)] font-black uppercase tracking-wide"
          style={{
            color:
              "var(--primary)",
          }}
        >
          {label} · {teamName}
        </p>

        <span
          className="shrink-0 text-[clamp(8px,1.05dvh,10px)] font-black"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {players.length}
        </span>

      </div>


      {players.length ===
      0 ? (

        <div
          className="flex min-h-0 items-center justify-center rounded-lg border border-dashed text-xs font-bold"
          style={{
            borderColor:
              "var(--border)",
            color:
              "var(--muted-foreground)",
          }}
        >
          No roster
        </div>

      ) : (

        <div className="roster-player-grid grid h-full min-h-0 gap-[clamp(3px,0.45dvh,6px)] overflow-hidden">

          {players.map(
            (
              player
            ) => {
              const stat =
                statMap.get(
                  player.player_id
                );

              const fouls =
                Number(
                  stat?.fouls ??
                    0
                );

              return (
                <PlayerPickButton
                  key={
                    player.player_id
                  }
                  player={
                    player
                  }
                  points={
                    Number(
                      stat?.points ??
                        0
                    )
                  }
                  rebounds={
                    Number(
                      stat?.rebounds ??
                        0
                    )
                  }
                  assists={
                    Number(
                      stat?.assists ??
                        0
                    )
                  }
                  steals={
                    Number(
                      stat?.steals ??
                        0
                    )
                  }
                  blocks={
                    Number(
                      stat?.blocks ??
                        0
                    )
                  }
                  turnovers={
                    Number(
                      stat?.turnovers ??
                        0
                    )
                  }
                  ftMade={
                    Number(
                      stat?.ft_made ??
                        0
                    )
                  }
                  ftAttempted={
                    Number(
                      stat?.ft_attempted ??
                        0
                    )
                  }
                  twoMade={
                    Number(
                      stat?.two_made ??
                        0
                    )
                  }
                  twoAttempted={
                    Number(
                      stat?.two_attempted ??
                        0
                    )
                  }
                  threeMade={
                    Number(
                      stat?.three_made ??
                        0
                    )
                  }
                  threeAttempted={
                    Number(
                      stat?.three_attempted ??
                        0
                    )
                  }
                  fouls={
                    fouls
                  }
                  selected={
                    selectedPlayerId ===
                    player.player_id
                  }
                  onClick={() =>
                    onSelect(
                      player
                    )
                  }
                />
              );
            }
          )}

        </div>

      )}

    </div>
  );
}


function PlayerPickButton({
  player,
  points,
  rebounds,
  assists,
  steals,
  blocks,
  turnovers,
  ftMade,
  ftAttempted,
  twoMade,
  twoAttempted,
  threeMade,
  threeAttempted,
  fouls,
  selected,
  onClick,
}: {
  player: RosterPlayer;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  ftMade: number;
  ftAttempted: number;
  twoMade: number;
  twoAttempted: number;
  threeMade: number;
  threeAttempted: number;
  fouls: number;
  selected: boolean;
  onClick: () => void;
}) {
  const fouledOut =
    fouls >=
    FOUL_LIMIT;

  const warning =
    fouls ===
    FOUL_LIMIT -
      1;

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        fouledOut
      }
      title={
        `#${player.jersey_number ?? "—"} ${player.name} · ${points} PTS · ${rebounds} REB · ${assists} AST · ${steals} STL · ${blocks} BLK · ${turnovers} TO · F ${fouls}/${FOUL_LIMIT}`
      }
      className="player-pick relative min-w-0 touch-manipulation select-none overflow-hidden rounded-lg border p-[clamp(3px,0.55dvh,7px)] text-left transition active:scale-[0.96] disabled:cursor-not-allowed sm:rounded-xl"
      style={{
        borderColor:
          selected
            ? "white"
            : warning ||
              fouledOut
            ? "color-mix(in srgb, var(--danger) 70%, var(--border))"
            : "var(--border-strong)",

        borderWidth:
          selected
            ? "2px"
            : "1px",

        background:
          selected
            ? "var(--primary)"
            : fouledOut
            ? "color-mix(in srgb, var(--danger) 18%, var(--card))"
            : warning
            ? "color-mix(in srgb, var(--danger) 10%, var(--card))"
            : "var(--surface)",

        color:
          selected
            ? "white"
            : fouledOut ||
              warning
            ? "var(--danger)"
            : "var(--foreground)",

        opacity:
          fouledOut
            ? 0.6
            : 1,

        boxShadow:
          selected
            ? "0 0 0 2px var(--primary)"
            : "none",
      }}
    >

      <div className="flex h-full min-h-0 flex-col justify-center">

        <div className="flex min-w-0 items-center gap-[clamp(3px,0.45vw,7px)]">

          <span className="shrink-0 text-[clamp(15px,2.2dvh,22px)] font-black leading-none">
            #
            {player.jersey_number ??
              "—"}
          </span>

          <span className="min-w-0 flex-1 truncate text-[clamp(10px,1.55dvh,15px)] font-black leading-tight">
            {player.name}
          </span>

          {selected && (
            <span className="shrink-0 text-[clamp(10px,1.5dvh,14px)] font-black">
              ✓
            </span>
          )}

        </div>


        <div
          className="mt-[clamp(3px,0.4dvh,6px)] space-y-[clamp(3px,0.4dvh,5px)] text-center text-[clamp(7px,1.02dvh,10px)] font-black uppercase leading-none"
          style={{
            color:
              selected
                ? "rgba(255,255,255,0.92)"
                : fouledOut ||
                  warning
                ? "var(--danger)"
                : "var(--muted-foreground)",
          }}
        >

          {/* ALL CORE STATS */}

          <div className="grid grid-cols-7 items-center gap-[2px]">

            <span>
              {points} PTS
            </span>

            <span>
              {rebounds} REB
            </span>

            <span>
              {assists} AST
            </span>

            <span>
              {steals} STL
            </span>

            <span>
              {blocks} BLK
            </span>

            <span>
              {turnovers} TO
            </span>

            <span>
              {fouledOut
                ? "OUT"
                : `F ${fouls}/${FOUL_LIMIT}`}
            </span>

          </div>



        </div>

      </div>

    </button>
  );
}


function FullscreenIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}


function ExitFullscreenIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 8H3V3" />
      <path d="M16 8h5V3" />
      <path d="M8 16H3v5" />
      <path d="M16 16h5v5" />
    </svg>
  );
}


/*
 * =====================================================
 * ACTION BUTTON
 * =====================================================
 */

function ActionButton({
  label,
  sublabel,
  onClick,
  disabled,
  emphasis = false,
  danger = false,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
  disabled: boolean;
  emphasis?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      className="action-stat-button h-full min-h-0 w-full touch-manipulation select-none overflow-hidden rounded-lg border px-1 py-0 text-center transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30 sm:rounded-xl"
      style={{
        borderColor:
          danger
            ? "color-mix(in srgb, var(--danger) 55%, var(--border))"
            : emphasis
            ? "color-mix(in srgb, var(--primary) 55%, var(--border))"
            : "var(--border)",

        background:
          danger
            ? "color-mix(in srgb, var(--danger) 14%, var(--card))"
            : emphasis
            ? "var(--primary)"
            : "var(--card)",

        color:
          emphasis
            ? "white"
            : danger
            ? "var(--danger)"
            : "var(--foreground)",
      }}
    >
      <span className="block font-black leading-none text-[clamp(14px,2.6vh,22px)]">
        {label}
      </span>

      <span
        className="mt-[2px] block font-bold uppercase tracking-wide text-[clamp(8px,1.35vh,12px)] leading-none"
        style={{
          color:
            emphasis
              ? "rgba(255,255,255,0.78)"
              : "var(--muted-foreground)",
        }}
      >
        {sublabel}
      </span>
    </button>
  );
}


/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function relationOne(
  value: any
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}


function effectiveClock(
  game: Game
) {
  let seconds =
    Math.max(
      0,
      Number(
        game.clock_seconds ??
          0
      )
    );


  if (
    game.clock_running &&
    game.clock_synced_at
  ) {
    const synced =
      new Date(
        game.clock_synced_at
      ).getTime();


    if (
      Number.isFinite(
        synced
      )
    ) {
      const elapsed =
        Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              synced
            ) / 1000
          )
        );


      seconds =
        Math.max(
          0,
          seconds -
          elapsed
        );
    }
  }


  return seconds;
}


function formatClock(
  seconds: number
) {
  const safe =
    Math.max(
      0,
      Math.floor(
        Number(
          seconds ??
            0
        )
      )
    );

  const minutes =
    Math.floor(
      safe / 60
    );

  const remainder =
    safe % 60;


  return `${minutes}:${String(
    remainder
  ).padStart(
    2,
    "0"
  )}`;
}
