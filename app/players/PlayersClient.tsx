"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Numeric =
  | number
  | string
  | null;

type PlayerRow = {
  player_id: string;
  player_name: string;

  season_id: string;
  season_name: string;
  season_year: number | null;

  team_id: string;
  team_name: string;

  division:
    | string
    | null;

  jersey_number:
    | number
    | null;

  games_played: number;

  total_points: number;
  ppg: Numeric;

  total_rebounds: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  rpg: Numeric;

  total_assists: number;
  apg: Numeric;

  total_steals: number;
  spg: Numeric;

  total_blocks: number;
  bpg: Numeric;

  total_turnovers: number;
  tpg: Numeric;

  total_fouls: number;
  fpg: Numeric;

  two_made: number;
  two_attempted: number;
  two_pct: Numeric;

  three_made: number;
  three_attempted: number;
  three_pct: Numeric;

  ft_made: number;
  ft_attempted: number;
  ft_pct: Numeric;

  fg_made: number;
  fg_attempted: number;
  fg_pct: Numeric;

  efficiency: Numeric;

  photo_path:
    | string
    | null;

  team_logo_path:
    | string
    | null;
};

function mediaPublicUrl(
  path:
    | string
    | null
    | undefined
) {
  if (!path) {
    return null;
  }

  const base =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  if (!base) {
    return null;
  }

  return `${base}/storage/v1/object/public/basketball-media/${path
    .split("/")
    .map(
      encodeURIComponent
    )
    .join("/")}`;
}


type League = {
  id: string;
  name: string;
  source?: string | null;
  source_league_id?: number | null;
};

type Season = {
  id: string;
  name: string;
  season_year:
    | number
    | null;
  league_id:
    | string
    | null;
};

type Membership = {
  season_id: string;
  league_id:
    | string
    | null;
  team_id: string;
  division: string;

  team: any;
};

type Coast =
  | "all"
  | "西岸"
  | "東岸";

type StatMode =
  | "per_game"
  | "totals";

type SortDirection =
  | "asc"
  | "desc";

export default function PlayersClient({
  players = [],
  leagues = [],
  seasons = [],
  memberships = [],
}: {
  players?: PlayerRow[];
  leagues?: League[];
  seasons?: Season[];
  memberships?: Membership[];
}) {
  const defaultLeague =
    leagues[0]?.id ??
    "all";

  const defaultSeason =
    seasons.find(
      (season) =>
        defaultLeague ===
          "all" ||
        season.league_id ===
          defaultLeague
    )?.id ??
    "all";

  /*
   * =====================================================
   * FILTERS
   * =====================================================
   */

  const [
    selectedLeague,
    setSelectedLeague,
  ] = useState(
    defaultLeague
  );

  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState(
    defaultSeason
  );

  const [
    selectedCoast,
    setSelectedCoast,
  ] =
    useState<Coast>(
      "all"
    );

  const [
    selectedTeam,
    setSelectedTeam,
  ] =
    useState("all");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    minGames,
    setMinGames,
  ] =
    useState("0");

  const [
    minTwoAttempts,
    setMinTwoAttempts,
  ] =
    useState("0");

  const [
    minThreeAttempts,
    setMinThreeAttempts,
  ] =
    useState("0");

  const [
    minFTAttempts,
    setMinFTAttempts,
  ] =
    useState("0");

  const [
    statMode,
    setStatMode,
  ] =
    useState<StatMode>(
      "per_game"
    );

  const [
    sortBy,
    setSortBy,
  ] =
    useState("ppg");

  const [
    sortDirection,
    setSortDirection,
  ] =
    useState<SortDirection>(
      "desc"
    );

  const [
    showFilters,
    setShowFilters,
  ] =
    useState(false);


  const availableSeasons =
    useMemo(
      () =>
        seasons.filter(
          (season) =>
            selectedLeague ===
              "all" ||
            season.league_id ===
              selectedLeague
        ),
      [
        seasons,
        selectedLeague,
      ]
    );


  function handleLeagueChange(
    leagueId: string
  ) {
    setSelectedLeague(
      leagueId
    );

    const nextSeason =
      seasons.find(
        (season) =>
          leagueId ===
            "all" ||
          season.league_id ===
            leagueId
      )?.id ??
      "all";

    setSelectedSeason(
      nextSeason
    );

    setSelectedTeam(
      "all"
    );
  }


  /*
   * =====================================================
   * AVAILABLE TEAMS
   * =====================================================
   */

  const availableTeams =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            id: string;
            name: string;
          }
        >();

      memberships
        .filter(
          (row) => {
            if (
              selectedLeague !==
                "all" &&
              row.league_id !==
                selectedLeague
            ) {
              return false;
            }

            if (
              selectedSeason !==
                "all" &&
              row.season_id !==
                selectedSeason
            ) {
              return false;
            }

            if (
              selectedCoast !==
                "all" &&
              row.division !==
                selectedCoast
            ) {
              return false;
            }

            return true;
          }
        )
        .forEach(
          (row) => {
            const team =
              normaliseTeam(
                row.team
              );

            if (team) {
              map.set(
                team.id,
                team
              );
            }
          }
        );

      return Array.from(
        map.values()
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );
    }, [
      memberships,
      selectedLeague,
      selectedSeason,
      selectedCoast,
    ]);


  useEffect(() => {
    if (
      selectedTeam ===
      "all"
    ) {
      return;
    }

    const stillAvailable =
      availableTeams.some(
        (team) =>
          team.id ===
          selectedTeam
      );

    if (
      !stillAvailable
    ) {
      setSelectedTeam(
        "all"
      );
    }
  }, [
    availableTeams,
    selectedTeam,
  ]);


  /*
   * =====================================================
   * FILTER + SORT PLAYERS
   * =====================================================
   */

  const filteredPlayers =
    useMemo(() => {
      const minimumGames =
        safeNumber(
          minGames
        );

      const minimum2PA =
        safeNumber(
          minTwoAttempts
        );

      const minimum3PA =
        safeNumber(
          minThreeAttempts
        );

      const minimumFTA =
        safeNumber(
          minFTAttempts
        );

      const searchText =
        search
          .trim()
          .toLowerCase();

      const selectedLeagueSeasonIds =
        new Set(
          seasons
            .filter(
              (season) =>
                selectedLeague ===
                  "all" ||
                season.league_id ===
                  selectedLeague
            )
            .map(
              (season) =>
                season.id
            )
        );

      const rows =
        players.filter(
          (row) => {

            if (
              selectedLeague !==
                "all" &&
              !selectedLeagueSeasonIds.has(
                row.season_id
              )
            ) {
              return false;
            }

            if (
              selectedSeason !==
                "all" &&
              row.season_id !==
                selectedSeason
            ) {
              return false;
            }

            if (
              selectedCoast !==
                "all" &&
              row.division !==
                selectedCoast
            ) {
              return false;
            }

            if (
              selectedTeam !==
                "all" &&
              row.team_id !==
                selectedTeam
            ) {
              return false;
            }

            if (
              searchText &&
              !row.player_name
                .toLowerCase()
                .includes(
                  searchText
                )
            ) {
              return false;
            }

            if (
              safeNumber(
                row.games_played
              ) <
              minimumGames
            ) {
              return false;
            }

            if (
              safeNumber(
                row.two_attempted
              ) <
              minimum2PA
            ) {
              return false;
            }

            if (
              safeNumber(
                row.three_attempted
              ) <
              minimum3PA
            ) {
              return false;
            }

            if (
              safeNumber(
                row.ft_attempted
              ) <
              minimumFTA
            ) {
              return false;
            }

            return true;
          }
        );

      rows.sort(
        (a, b) => {
          if (
            sortBy ===
            "player_name"
          ) {
            const comparison =
              a.player_name.localeCompare(
                b.player_name
              );

            return sortDirection ===
              "asc"
              ? comparison
              : -comparison;
          }

          if (
            sortBy ===
            "team_name"
          ) {
            const comparison =
              a.team_name.localeCompare(
                b.team_name
              );

            return sortDirection ===
              "asc"
              ? comparison
              : -comparison;
          }

          const aValue =
            safeNumber(
              (a as any)[
                sortBy
              ]
            );

          const bValue =
            safeNumber(
              (b as any)[
                sortBy
              ]
            );

          if (
            sortDirection ===
            "asc"
          ) {
            return (
              aValue -
              bValue
            );
          }

          return (
            bValue -
            aValue
          );
        }
      );

      return rows;
    }, [
      players,
      seasons,
      selectedLeague,
      selectedSeason,
      selectedCoast,
      selectedTeam,
      search,
      minGames,
      minTwoAttempts,
      minThreeAttempts,
      minFTAttempts,
      sortBy,
      sortDirection,
    ]);


  /*
   * =====================================================
   * RESET
   * =====================================================
   */

  function resetFilters() {
    setSelectedLeague(
      defaultLeague
    );

    setSelectedSeason(
      defaultSeason
    );

    setSelectedCoast(
      "all"
    );

    setSelectedTeam(
      "all"
    );

    setSearch("");

    setMinGames("0");

    setMinTwoAttempts(
      "0"
    );

    setMinThreeAttempts(
      "0"
    );

    setMinFTAttempts(
      "0"
    );

    setSortBy(
      "ppg"
    );

    setSortDirection(
      "desc"
    );
  }


  const hasActiveFilters =
    search.trim() !== "" ||
    selectedLeague !==
      defaultLeague ||
    selectedSeason !==
      defaultSeason ||
    selectedCoast !==
      "all" ||
    selectedTeam !==
      "all" ||
    minGames !==
      "0" ||
    minTwoAttempts !==
      "0" ||
    minThreeAttempts !==
      "0" ||
    minFTAttempts !==
      "0" ||
    sortBy !==
      "ppg" ||
    sortDirection !==
      "desc";


  /*
   * =====================================================
   * DISPLAY STAT KEYS
   * =====================================================
   */

  const pointKey =
    statMode ===
    "per_game"
      ? "ppg"
      : "total_points";

  const reboundKey =
    statMode ===
    "per_game"
      ? "rpg"
      : "total_rebounds";

  const assistKey =
    statMode ===
    "per_game"
      ? "apg"
      : "total_assists";

  const stealKey =
    statMode ===
    "per_game"
      ? "spg"
      : "total_steals";

  const blockKey =
    statMode ===
    "per_game"
      ? "bpg"
      : "total_blocks";

  const turnoverKey =
    statMode ===
    "per_game"
      ? "tpg"
      : "total_turnovers";

  const foulKey =
    statMode ===
    "per_game"
      ? "fpg"
      : "total_fouls";


  const profileQuery =
    [
      selectedLeague !==
        "all"
        ? `league=${encodeURIComponent(
            selectedLeague
          )}`
        : "",
      selectedSeason !==
        "all"
        ? `season=${encodeURIComponent(
            selectedSeason
          )}`
        : "",
    ]
      .filter(Boolean)
      .join("&");


  return (
    <main className="mx-auto max-w-[1600px] px-6 py-10">

      {/* HEADER */}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

        <div>

          <p className="text-sm uppercase tracking-widest text-zinc-500">
            League
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Players
          </h1>

          <p className="mt-2 text-zinc-400">
            Complete player statistics by season, team and coast.
          </p>

        </div>


        {/* STAT MODE */}

        <div className="flex overflow-hidden rounded-xl border border-zinc-700">

          <button
            type="button"
            onClick={() =>
              setStatMode(
                "per_game"
              )
            }
            className={`px-5 py-3 text-sm font-bold ${
              statMode ===
              "per_game"
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            Per Game
          </button>

          <button
            type="button"
            onClick={() =>
              setStatMode(
                "totals"
              )
            }
            className={`border-l border-zinc-700 px-5 py-3 text-sm font-bold ${
              statMode ===
              "totals"
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            Totals
          </button>

        </div>

      </div>


      {/* COMPETITION SELECTOR */}

      <section
        className="mt-8 grid gap-4 rounded-2xl border p-4 sm:grid-cols-2"
        style={{
          borderColor:
            "var(--border)",
          background:
            "var(--card)",
        }}
      >
        <div>
          <label
            className="mb-2 block text-xs font-black uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            League
          </label>

          <select
            value={
              selectedLeague
            }
            onChange={(e) =>
              handleLeagueChange(
                e.target.value
              )
            }
            className="w-full rounded-xl border px-4 py-3 font-bold outline-none"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--surface)",
              color:
                "var(--foreground)",
            }}
          >
            <option value="all">
              All Leagues
            </option>

            {leagues.map(
              (league) => (
                <option
                  key={
                    league.id
                  }
                  value={
                    league.id
                  }
                >
                  {league.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            className="mb-2 block text-xs font-black uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            Season
          </label>

          <select
            value={
              selectedSeason
            }
            onChange={(e) => {
              setSelectedSeason(
                e.target.value
              );
              setSelectedTeam(
                "all"
              );
            }}
            className="w-full rounded-xl border px-4 py-3 font-bold outline-none"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--surface)",
              color:
                "var(--foreground)",
            }}
          >
            <option value="all">
              All Seasons
            </option>

            {availableSeasons.map(
              (season) => (
                <option
                  key={
                    season.id
                  }
                  value={
                    season.id
                  }
                >
                  {season.name}
                  {season.season_year
                    ? ` (${season.season_year})`
                    : ""}
                </option>
              )
            )}
          </select>
        </div>
      </section>


      {/* =================================================
          FILTER TOGGLE
          ================================================= */}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">

        <button
          type="button"
          onClick={() =>
            setShowFilters(
              (current) =>
                !current
            )
          }
          className="rounded-xl border px-5 py-3 text-sm font-bold transition hover:opacity-80"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
            color:
              "var(--foreground)",
          }}
        >
          {showFilters
            ? "Hide Filters"
            : "Filters"}
        </button>


        {hasActiveFilters && (

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="rounded-xl border px-5 py-3 text-sm font-semibold transition hover:opacity-80"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--card)",
              color:
                "var(--muted-foreground)",
            }}
          >
            Clear Filters
          </button>

        )}

      </div>


      {/* =================================================
          HIDDEN FILTER PANEL
          ================================================= */}

      {showFilters && (

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

          {/* SEARCH */}

          <div>

            <label className="mb-2 block text-sm text-zinc-400">
              Player Search
            </label>

            <input
              type="text"
              value={
                search
              }
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search player..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />

          </div>


          {/* MAIN FILTERS */}

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            <div>

              <label className="mb-2 block text-sm text-zinc-400">
                Coast
              </label>

              <select
                value={
                  selectedCoast
                }
                onChange={(e) => {
                  setSelectedCoast(
                    e.target.value as Coast
                  );

                  setSelectedTeam(
                    "all"
                  );
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
              >

                <option value="all">
                  All Coasts
                </option>

                <option value="西岸">
                  West Coast
                </option>

                <option value="東岸">
                  East Coast
                </option>

              </select>

            </div>


            <div>

              <label className="mb-2 block text-sm text-zinc-400">
                Team
              </label>

              <select
                value={
                  selectedTeam
                }
                onChange={(e) =>
                  setSelectedTeam(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
              >

                <option value="all">
                  All Teams
                </option>

                {availableTeams.map(
                  (team) => (

                    <option
                      key={
                        team.id
                      }
                      value={
                        team.id
                      }
                    >
                      {team.name}
                    </option>

                  )
                )}

              </select>

            </div>


            <NumberFilter
              label="Minimum Games"
              value={
                minGames
              }
              onChange={
                setMinGames
              }
            />

          </div>


          {/* ADVANCED */}

          <div className="mt-6 border-t border-zinc-800 pt-6">

            <p className="mb-4 text-sm font-bold uppercase tracking-wide text-zinc-500">
              Shooting & Sorting
            </p>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-6">

              <NumberFilter
                label="Minimum 2PA"
                value={
                  minTwoAttempts
                }
                onChange={
                  setMinTwoAttempts
                }
              />

              <NumberFilter
                label="Minimum 3PA"
                value={
                  minThreeAttempts
                }
                onChange={
                  setMinThreeAttempts
                }
              />

              <NumberFilter
                label="Minimum FTA"
                value={
                  minFTAttempts
                }
                onChange={
                  setMinFTAttempts
                }
              />


              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Sort By
                </label>

                <select
                  value={
                    sortBy
                  }
                  onChange={(e) =>
                    setSortBy(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                >

                  <option value="ppg">
                    Points / Game
                  </option>

                  <option value="total_points">
                    Total Points
                  </option>

                  <option value="rpg">
                    Rebounds / Game
                  </option>

                  <option value="apg">
                    Assists / Game
                  </option>

                  <option value="spg">
                    Steals / Game
                  </option>

                  <option value="bpg">
                    Blocks / Game
                  </option>

                  <option value="tpg">
                    Turnovers / Game
                  </option>

                  <option value="two_pct">
                    2PT %
                  </option>

                  <option value="three_pct">
                    3PT %
                  </option>

                  <option value="ft_pct">
                    FT %
                  </option>

                  <option value="fg_pct">
                    FG %
                  </option>

                  <option value="efficiency">
                    Efficiency
                  </option>

                  <option value="games_played">
                    Games Played
                  </option>

                  <option value="player_name">
                    Player Name
                  </option>

                  <option value="team_name">
                    Team Name
                  </option>

                </select>

              </div>


              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Order
                </label>

                <select
                  value={
                    sortDirection
                  }
                  onChange={(e) =>
                    setSortDirection(
                      e.target.value as
                        SortDirection
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                >

                  <option value="desc">
                    Highest First
                  </option>

                  <option value="asc">
                    Lowest First
                  </option>

                </select>

              </div>


              <div className="flex items-end">

                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  className="w-full rounded-xl border border-zinc-700 px-4 py-3 font-bold hover:bg-zinc-800"
                >
                  Reset
                </button>

              </div>

            </div>

          </div>

        </section>

      )}


      {/* RESULTS */}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">

        <div>

          <h2 className="text-2xl font-black">
            Player Statistics
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {filteredPlayers.length} player
            {filteredPlayers.length ===
            1
              ? ""
              : "s"}{" "}
            shown
          </p>

        </div>

        <p className="text-xs text-zinc-500">
          Shooting format = Made / Attempts · Percentage
        </p>

      </div>


      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 md:hidden">
        {filteredPlayers.map(
          (row) => (
            <MobilePlayerCard
              key={`${row.season_id}-${row.team_id}-${row.player_id}`}
              row={row}
              statMode={statMode}
              profileQuery={profileQuery}
            />
          )
        )}

        {filteredPlayers.length ===
          0 && (
          <div className="rounded-xl border border-zinc-800 px-6 py-12 text-center text-zinc-500">
            No players match the current filters.
          </div>
        )}
      </div>


      {/* =================================================
          TABLE
          ================================================= */}

      <div className="mt-5 hidden overflow-x-auto rounded-xl border border-zinc-800 md:block">

        <table className="min-w-[1750px] w-full text-sm">

          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">

            <tr>

              <th
                className="sticky left-0 z-30 min-w-[240px] border-r border-zinc-800 bg-zinc-900 px-4 py-4 text-left"
                style={{
                  background:
                    "var(--card)",
                }}
              >
                # Player
              </th>

              <th className="px-4 py-4 text-left">
                Team
              </th>

              <th className="px-4 py-4">
                Season
              </th>

              <th className="px-4 py-4">
                Coast
              </th>

              <th className="px-4 py-4">
                GP
              </th>

              <th className="px-4 py-4">
                {statMode ===
                "per_game"
                  ? "PPG"
                  : "PTS"}
              </th>

              <th className="px-4 py-4">
                {statMode ===
                "per_game"
                  ? "RPG"
                  : "REB"}
              </th>

              <th className="px-4 py-4">
                OREB
              </th>

              <th className="px-4 py-4">
                DREB
              </th>

              <th className="px-4 py-4">
                {statMode ===
                "per_game"
                  ? "APG"
                  : "AST"}
              </th>

              <th className="px-4 py-4">
                {statMode ===
                "per_game"
                  ? "SPG"
                  : "STL"}
              </th>

              <th className="px-4 py-4">
                {statMode ===
                "per_game"
                  ? "BPG"
                  : "BLK"}
              </th>

              <th className="px-4 py-4">
                {statMode ===
                "per_game"
                  ? "TPG"
                  : "TO"}
              </th>

              <th className="px-4 py-4">
                {statMode ===
                "per_game"
                  ? "FPG"
                  : "PF"}
              </th>

              <th className="px-4 py-4">
                2PT
              </th>

              <th className="px-4 py-4">
                3PT
              </th>

              <th className="px-4 py-4">
                FT
              </th>

              <th className="px-4 py-4">
                FG%
              </th>

              <th className="px-4 py-4">
                EFF
              </th>

            </tr>

          </thead>


          <tbody>

            {filteredPlayers.map(
              (row) => (

                <tr
                  key={`${row.season_id}-${row.team_id}-${row.player_id}`}
                  className="border-t border-zinc-800 hover:bg-zinc-900/60"
                >

                  <td
                    className="sticky left-0 z-20 min-w-[240px] border-r border-zinc-800 bg-zinc-950 px-4 py-4"
                    style={{
                      background:
                        "var(--surface)",
                    }}
                  >

                    <div className="flex items-center gap-3">

                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-xs font-black"
                        style={{
                          borderColor:
                            "var(--border)",
                          background:
                            "var(--card)",
                          color:
                            "var(--primary)",
                        }}
                      >
                        {row.photo_path ? (
                          <img
                            src={
                              mediaPublicUrl(
                                row.photo_path
                              ) ??
                              ""
                            }
                            alt={row.player_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          row.player_name
                            .trim()
                            .slice(
                              0,
                              2
                            )
                            .toUpperCase()
                        )}
                      </div>

                      <div
                        className="flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-black"
                        style={{
                          borderColor:
                            "var(--border)",
                          background:
                            "var(--card)",
                          color:
                            "var(--foreground)",
                        }}
                      >
                        {row.jersey_number ??
                          "—"}
                      </div>


                      <Link
                        href={`/players/${row.player_id}${profileQuery ? `?${profileQuery}` : ""}`}
                        className="min-w-0 truncate font-bold hover:underline"
                        title={
                          row.player_name
                        }
                      >
                        {row.player_name}
                      </Link>

                    </div>

                  </td>


                  <td className="px-4 py-4">

                    <div className="flex items-center gap-2">
                      {row.team_logo_path && (
                        <img
                          src={
                            mediaPublicUrl(
                              row.team_logo_path
                            ) ??
                            ""
                          }
                          alt={`${row.team_name} logo`}
                          className="h-7 w-7 rounded-md object-contain"
                        />
                      )}

                      <Link
                        href={`/teams/${row.team_id}${profileQuery ? `?${profileQuery}` : ""}`}
                        className="whitespace-nowrap text-zinc-300 hover:underline"
                      >
                        {row.team_name}
                      </Link>
                    </div>

                  </td>


                  <Cell
                    value={
                      row.season_name
                    }
                  />

                  <Cell
                    value={
                      coastLabel(
                        row.division
                      )
                    }
                  />

                  <Cell
                    value={
                      row.games_played
                    }
                  />

                  <Cell
                    value={
                      displayNumber(
                        (row as any)[
                          pointKey
                        ]
                      )
                    }
                    bold
                  />

                  <Cell
                    value={
                      displayNumber(
                        (row as any)[
                          reboundKey
                        ]
                      )
                    }
                  />

                  <Cell
                    value={
                      row.offensive_rebounds
                    }
                  />

                  <Cell
                    value={
                      row.defensive_rebounds
                    }
                  />

                  <Cell
                    value={
                      displayNumber(
                        (row as any)[
                          assistKey
                        ]
                      )
                    }
                  />

                  <Cell
                    value={
                      displayNumber(
                        (row as any)[
                          stealKey
                        ]
                      )
                    }
                  />

                  <Cell
                    value={
                      displayNumber(
                        (row as any)[
                          blockKey
                        ]
                      )
                    }
                  />

                  <Cell
                    value={
                      displayNumber(
                        (row as any)[
                          turnoverKey
                        ]
                      )
                    }
                  />

                  <Cell
                    value={
                      displayNumber(
                        (row as any)[
                          foulKey
                        ]
                      )
                    }
                  />


                  <ShootingCell
                    made={
                      row.two_made
                    }
                    attempted={
                      row.two_attempted
                    }
                    percentage={
                      row.two_pct
                    }
                  />

                  <ShootingCell
                    made={
                      row.three_made
                    }
                    attempted={
                      row.three_attempted
                    }
                    percentage={
                      row.three_pct
                    }
                  />

                  <ShootingCell
                    made={
                      row.ft_made
                    }
                    attempted={
                      row.ft_attempted
                    }
                    percentage={
                      row.ft_pct
                    }
                  />


                  <Cell
                    value={`${formatPercentage(
                      row.fg_pct
                    )}%`}
                  />

                  <Cell
                    value={
                      displayNumber(
                        row.efficiency
                      )
                    }
                    bold
                  />

                </tr>

              )
            )}


            {filteredPlayers.length ===
              0 && (

              <tr>

                <td
                  colSpan={19}
                  className="px-6 py-16 text-center text-zinc-500"
                >
                  No players match the current filters.
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>


      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-600">

        <span>
          GP = Games Played
        </span>

        <span>
          OREB = Offensive Rebounds
        </span>

        <span>
          DREB = Defensive Rebounds
        </span>

        <span>
          TO = Turnovers
        </span>

        <span>
          PF = Personal Fouls
        </span>

        <span>
          EFF = Efficiency
        </span>

      </div>

    </main>
  );
}


/*
 * =====================================================
 * COMPONENTS
 * =====================================================
 */

function NumberFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm text-zinc-400">
        {label}
      </label>

      <input
        type="number"
        min="0"
        value={
          value
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
      />

    </div>
  );
}


function Cell({
  value,
  bold = false,
}: {
  value:
    | string
    | number;
  bold?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-4 text-center ${
        bold
          ? "font-bold"
          : ""
      }`}
    >
      {value}
    </td>
  );
}


function MobilePlayerCard({
  row,
  statMode,
  profileQuery,
}: {
  row: PlayerRow;
  statMode: StatMode;
  profileQuery: string;
}) {
  const pointValue =
    statMode === "per_game"
      ? row.ppg
      : row.total_points;

  const reboundValue =
    statMode === "per_game"
      ? row.rpg
      : row.total_rebounds;

  const assistValue =
    statMode === "per_game"
      ? row.apg
      : row.total_assists;

  return (
    <article className="min-w-0 max-w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-xs font-black"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
            color:
              "var(--primary)",
          }}
        >
          {row.photo_path ? (
            <img
              src={
                mediaPublicUrl(
                  row.photo_path
                ) ??
                ""
              }
              alt={row.player_name}
              className="h-full w-full object-cover"
            />
          ) : (
            row.player_name
              .trim()
              .slice(
                0,
                2
              )
              .toUpperCase()
          )}
        </div>

        <div
          className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border px-2 text-sm font-black"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
          }}
        >
          {row.jersey_number ??
            "—"}
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${row.player_id}${profileQuery ? `?${profileQuery}` : ""}`}
            className="block truncate text-base font-black hover:underline"
            title={
              row.player_name
            }
          >
            {row.player_name}
          </Link>

          <Link
            href={`/teams/${row.team_id}${profileQuery ? `?${profileQuery}` : ""}`}
            className="mt-1 block truncate text-sm text-zinc-400 hover:underline"
          >
            {row.team_name}
          </Link>
        </div>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-4 gap-1.5 text-center">
        <MobileStat label="GP" value={row.games_played} />
        <MobileStat
          label={statMode === "per_game" ? "PPG" : "PTS"}
          value={displayNumber(pointValue)}
          highlight
        />
        <MobileStat
          label={statMode === "per_game" ? "RPG" : "REB"}
          value={displayNumber(reboundValue)}
        />
        <MobileStat
          label={statMode === "per_game" ? "APG" : "AST"}
          value={displayNumber(assistValue)}
        />
      </div>

      <div className="mt-2.5 grid min-w-0 grid-cols-3 gap-1.5">
        <MobileShootingStat
          label="2PT"
          made={row.two_made}
          attempted={row.two_attempted}
          percentage={row.two_pct}
        />
        <MobileShootingStat
          label="3PT"
          made={row.three_made}
          attempted={row.three_attempted}
          percentage={row.three_pct}
        />
        <MobileShootingStat
          label="FT"
          made={row.ft_made}
          attempted={row.ft_attempted}
          percentage={row.ft_pct}
        />
      </div>

      <div className="mt-2.5 grid min-w-0 grid-cols-3 gap-1.5 text-center">
        <MobileStat label="FG%" value={`${formatPercentage(row.fg_pct)}%`} />
        <MobileStat label="EFF" value={displayNumber(row.efficiency)} />
        <MobileStat label="Coast" value={coastLabel(row.division)} />
      </div>
    </article>
  );
}


function MobileStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value:
    | string
    | number;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1.5">
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 truncate text-sm font-black ${highlight ? "text-blue-300" : ""}`}>
        {value}
      </p>
    </div>
  );
}


function MobileShootingStat({
  label,
  made,
  attempted,
  percentage,
}: {
  label: string;
  made: number;
  attempted: number;
  percentage: Numeric;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1.5 text-center">
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">
        {made}-{attempted}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {formatPercentage(
          percentage
        )}
        %
      </p>
    </div>
  );
}


function ShootingCell({
  made,
  attempted,
  percentage,
}: {
  made: number;
  attempted: number;
  percentage: Numeric;
}) {
  return (
    <td className="whitespace-nowrap px-4 py-4 text-center">

      <p className="font-semibold">
        {made}-{attempted}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {formatPercentage(
          percentage
        )}
        %
      </p>

    </td>
  );
}


/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function safeNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}


function displayNumber(
  value: unknown
) {
  const number =
    safeNumber(
      value
    );

  if (
    Number.isInteger(
      number
    )
  ) {
    return String(number);
  }

  return number.toFixed(2);
}


function formatPercentage(
  value: unknown
) {
  const number =
    safeNumber(
      value
    );

  return number.toFixed(1);
}


function coastLabel(
  division:
    | string
    | null
) {
  if (
    division ===
    "西岸"
  ) {
    return "West";
  }

  if (
    division ===
    "東岸"
  ) {
    return "East";
  }

  return "—";
}


function normaliseTeam(
  value: any
):
  | {
      id: string;
      name: string;
    }
  | null {
  if (!value) {
    return null;
  }

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

  return value;
}
