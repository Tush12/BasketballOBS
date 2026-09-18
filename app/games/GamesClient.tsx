"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type TeamRef = {
  id: string;
  name: string;
};

type SeasonRef = {
  id: string;
  name: string;
  season_year: number | null;
};

type Game = {
  id: string;

  season_id: string;

  game_date: string;
  game_time: string | null;

  venue: string | null;

  status: string;
  division: string | null;

  current_period: number | null;
  clock_seconds: number | null;
  clock_running: boolean | null;

  home_team_id: string;
  away_team_id: string;

  home_score: number | null;
  away_score: number | null;

  home_team:
    | TeamRef
    | TeamRef[]
    | null;

  away_team:
    | TeamRef
    | TeamRef[]
    | null;

  season:
    | SeasonRef
    | SeasonRef[]
    | null;
};

type Season = {
  id: string;
  name: string;
  season_year: number | null;
};

type Membership = {
  season_id: string;
  team_id: string;
  division: string;

  team:
    | TeamRef
    | TeamRef[]
    | null;
};

type Tab =
  | "scheduled"
  | "live"
  | "finished";

type Coast =
  | "all"
  | "西岸"
  | "東岸";

export default function GamesClient({
  games = [],
  seasons = [],
  memberships = [],
}: {
  games?: Game[];
  seasons?: Season[];
  memberships?: Membership[];
}) {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<Tab>(
      "scheduled"
    );

  const [
    selectedSeason,
    setSelectedSeason,
  ] =
    useState(
      seasons[0]?.id ??
        "all"
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
    dateFrom,
    setDateFrom,
  ] =
    useState("");

  const [
    dateTo,
    setDateTo,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    showFilters,
    setShowFilters,
  ] =
    useState(false);


  /*
   * =====================================================
   * COUNTS
   * =====================================================
   */

  const counts =
    useMemo(() => {
      return {
        scheduled:
          games.filter(
            (game) =>
              game.status ===
              "scheduled"
          ).length,

        live:
          games.filter(
            (game) =>
              game.status ===
              "live"
          ).length,

        finished:
          games.filter(
            (game) =>
              game.status ===
              "finished"
          ).length,
      };
    }, [games]);


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
          TeamRef
        >();

      memberships
        .filter(
          (row) => {
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
              normaliseRelation(
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

    const stillExists =
      availableTeams.some(
        (team) =>
          team.id ===
          selectedTeam
      );

    if (!stillExists) {
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
   * MEMBERSHIP LOOKUP
   * =====================================================
   */

  const membershipMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      memberships.forEach(
        (row) => {
          map.set(
            `${row.season_id}:${row.team_id}`,
            row.division
          );
        }
      );

      return map;
    }, [memberships]);


  /*
   * =====================================================
   * FILTER GAMES
   * =====================================================
   */

  const filteredGames =
    useMemo(() => {
      const rows =
        games.filter(
          (game) => {

            /*
             * TAB / STATUS
             */

            if (
              game.status !==
              activeTab
            ) {
              return false;
            }


            /*
             * SEARCH
             *
             * Searches team names,
             * venue, season and date.
             */

            const searchText =
              search
                .trim()
                .toLowerCase();

            if (
              searchText
            ) {
              const home =
                normaliseRelation(
                  game.home_team
                );

              const away =
                normaliseRelation(
                  game.away_team
                );

              const season =
                normaliseRelation(
                  game.season
                );

              const searchable =
                [
                  home?.name ?? "",
                  away?.name ?? "",
                  game.venue ?? "",
                  season?.name ?? "",
                  String(
                    season?.season_year ??
                    ""
                  ),
                  game.game_date ?? "",
                  game.game_time ?? "",
                ]
                  .join(" ")
                  .toLowerCase();

              if (
                !searchable.includes(
                  searchText
                )
              ) {
                return false;
              }
            }


            /*
             * SEASON
             */

            if (
              selectedSeason !==
                "all" &&
              game.season_id !==
                selectedSeason
            ) {
              return false;
            }


            /*
             * TEAM
             */

            if (
              selectedTeam !==
                "all" &&
              game.home_team_id !==
                selectedTeam &&
              game.away_team_id !==
                selectedTeam
            ) {
              return false;
            }


            /*
             * COAST
             *
             * Use the season-specific
             * team membership instead
             * of the old global team
             * division field.
             */

            if (
              selectedCoast !==
              "all"
            ) {
              const homeCoast =
                membershipMap.get(
                  `${game.season_id}:${game.home_team_id}`
                );

              const awayCoast =
                membershipMap.get(
                  `${game.season_id}:${game.away_team_id}`
                );

              if (
                homeCoast !==
                  selectedCoast &&
                awayCoast !==
                  selectedCoast
              ) {
                return false;
              }
            }


            /*
             * DATE RANGE
             */

            if (
              dateFrom &&
              game.game_date <
                dateFrom
            ) {
              return false;
            }

            if (
              dateTo &&
              game.game_date >
                dateTo
            ) {
              return false;
            }

            return true;
          }
        );


      /*
       * Upcoming and live:
       * earliest first.
       *
       * Results:
       * newest first.
       */

      rows.sort(
        (a, b) => {
          const aKey =
            `${a.game_date}T${a.game_time ?? "00:00"}`;

          const bKey =
            `${b.game_date}T${b.game_time ?? "00:00"}`;

          if (
            activeTab ===
            "finished"
          ) {
            return bKey.localeCompare(
              aKey
            );
          }

          return aKey.localeCompare(
            bKey
          );
        }
      );

      return rows;
    }, [
      games,
      activeTab,
      selectedSeason,
      selectedCoast,
      selectedTeam,
      dateFrom,
      dateTo,
      search,
      membershipMap,
    ]);


  /*
   * =====================================================
   * GROUP BY DATE
   * =====================================================
   */

  const groupedGames =
    useMemo(() => {
      const map =
        new Map<
          string,
          Game[]
        >();

      filteredGames.forEach(
        (game) => {
          const existing =
            map.get(
              game.game_date
            ) ?? [];

          existing.push(
            game
          );

          map.set(
            game.game_date,
            existing
          );
        }
      );

      return Array.from(
        map.entries()
      );
    }, [filteredGames]);


  function resetFilters() {
    setSelectedSeason(
      seasons[0]?.id ??
        "all"
    );

    setSelectedCoast(
      "all"
    );

    setSelectedTeam(
      "all"
    );

    setDateFrom("");
    setDateTo("");
    setSearch("");
  }


  return (
    <main className="mx-auto max-w-7xl px-6 py-10">

      {/* HEADER */}

      <div>

        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Competition
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Games
        </h1>

        <p className="mt-2 max-w-2xl text-zinc-400">
          Browse scheduled fixtures, live games and finished results. Search by team, venue, season or date.
        </p>

      </div>


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


        {(search ||
          selectedSeason !==
            (seasons[0]?.id ?? "all") ||
          selectedCoast !==
            "all" ||
          selectedTeam !==
            "all" ||
          dateFrom ||
          dateTo) && (

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
          STATUS TABS
          ================================================= */}

      <div className="mt-10 grid grid-cols-3 overflow-hidden rounded-xl border border-zinc-800">

        <StatusTab
          label="Scheduled"
          count={
            counts.scheduled
          }
          active={
            activeTab ===
            "scheduled"
          }
          onClick={() =>
            setActiveTab(
              "scheduled"
            )
          }
        />

        <StatusTab
          label="Live"
          count={
            counts.live
          }
          active={
            activeTab ===
            "live"
          }
          onClick={() =>
            setActiveTab(
              "live"
            )
          }
        />

        <StatusTab
          label="Finished"
          count={
            counts.finished
          }
          active={
            activeTab ===
            "finished"
          }
          onClick={() =>
            setActiveTab(
              "finished"
            )
          }
        />

      </div>


      {/* =================================================
          FILTERS
          ================================================= */}

      {showFilters && (

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

          <div>

            <label className="mb-2 block text-sm text-zinc-400">
              Search
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">

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
                placeholder="Search team, venue, season, date or time..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
              />

              {search && (

                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold hover:bg-zinc-800"
                >
                  Clear
                </button>

              )}

            </div>

          </div>


          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">

          {/* SEASON */}

          <div>

            <label className="mb-2 block text-sm text-zinc-400">
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
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            >

              <option value="all">
                All Seasons
              </option>

              {seasons.map(
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
                  </option>

                )
              )}

            </select>

          </div>


          {/* COAST */}

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
                  e.target.value as
                    Coast
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


          {/* TEAM */}

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


          {/* FROM */}

          <div>

            <label className="mb-2 block text-sm text-zinc-400">
              From
            </label>

            <input
              type="date"
              value={
                dateFrom
              }
              onChange={(e) =>
                setDateFrom(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />

          </div>


          {/* TO */}

          <div>

            <label className="mb-2 block text-sm text-zinc-400">
              To
            </label>

            <input
              type="date"
              value={
                dateTo
              }
              onChange={(e) =>
                setDateTo(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />

          </div>

        </div>


        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-5">

          <p className="text-sm text-zinc-500">
            {filteredGames.length} game
            {filteredGames.length ===
            1
              ? ""
              : "s"}{" "}
            shown
          </p>

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
          >
            Reset Filters
          </button>

        </div>

        </section>

      )}


      {/* =================================================
          GAME CATEGORY
          ================================================= */}

      <div className="mt-10 flex items-end justify-between gap-4">

        <div>

          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Category
          </p>

          <h2 className="mt-1 text-2xl font-black">
            {activeTab === "scheduled"
              ? "Scheduled Games"
              : activeTab === "live"
              ? "Live Games"
              : "Finished Games"}
          </h2>

        </div>

        <p className="text-sm text-zinc-500">
          {filteredGames.length} game
          {filteredGames.length === 1 ? "" : "s"}
        </p>

      </div>


      {/* =================================================
          CALENDAR
          ================================================= */}

      <section className="mt-5">

        {groupedGames.length ===
          0 && (

          <div className="rounded-2xl border border-dashed border-zinc-700 p-14 text-center">

            <h2 className="text-xl font-bold">
              {activeTab ===
              "scheduled"
                ? "No scheduled games found"
                : activeTab ===
                  "live"
                ? "No live games found"
                : "No finished games found"}
            </h2>

            <p className="mt-2 text-zinc-500">
              {search
                ? "Try a different search term or clear some filters."
                : activeTab ===
                  "scheduled"
                ? "Scheduled games will appear here automatically once they are created."
                : "Try changing the filters above."}
            </p>

          </div>

        )}


        <div className="space-y-10">

          {groupedGames.map(
            ([
              date,
              dateGames,
            ]) => (

              <div
                key={
                  date
                }
              >

                {/* DATE HEADER */}

                <div className="mb-4 flex items-center gap-4">

                  <h2 className="whitespace-nowrap text-lg font-black">
                    {formatDateHeading(
                      date
                    )}
                  </h2>

                  <div className="h-px flex-1 bg-zinc-800" />

                  <span className="text-xs text-zinc-600">
                    {dateGames.length} game
                    {dateGames.length ===
                    1
                      ? ""
                      : "s"}
                  </span>

                </div>


                {/* GAMES */}

                <div className="grid gap-4">

                  {dateGames.map(
                    (game) => (

                      <GameCard
                        key={
                          game.id
                        }
                        game={
                          game
                        }
                        membershipMap={
                          membershipMap
                        }
                      />

                    )
                  )}

                </div>

              </div>

            )
          )}

        </div>

      </section>

    </main>
  );
}


/*
 * =====================================================
 * GAME CARD
 * =====================================================
 */

function GameCard({
  game,
  membershipMap,
}: {
  game: Game;
  membershipMap:
    Map<
      string,
      string
    >;
}) {
  const home =
    normaliseRelation(
      game.home_team
    );

  const away =
    normaliseRelation(
      game.away_team
    );

  const season =
    normaliseRelation(
      game.season
    );

  const homeCoast =
    membershipMap.get(
      `${game.season_id}:${game.home_team_id}`
    );

  const awayCoast =
    membershipMap.get(
      `${game.season_id}:${game.away_team_id}`
    );

  const isLive =
    game.status ===
    "live";

  const isFinished =
    game.status ===
    "finished";

  const isScheduled =
    game.status ===
    "scheduled";

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">

      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">

        {/* META */}

        <div className="lg:w-48">

          <StatusBadge
            status={
              game.status
            }
          />

          <p className="mt-3 font-bold">
            {game.game_time
              ? formatTime(
                  game.game_time
                )
              : "Time TBC"}
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            {game.venue?.trim()
              ? game.venue
              : "Venue TBC"}
          </p>

          <p className="mt-3 text-xs text-zinc-600">
            Season{" "}
            {season?.name ??
              "—"}
          </p>

        </div>


        {/* MATCHUP */}

        <div className="flex flex-1 items-center justify-center gap-4 sm:gap-8">

          {/* HOME */}

          <TeamBlock
            team={
              home
            }
            coast={
              homeCoast
            }
            side="Home"
          />


          {/* CENTRE */}

          <div className="min-w-24 text-center">

            {isScheduled && (

              <div>

                <p className="text-sm font-black text-zinc-600">
                  VS
                </p>

              </div>

            )}


            {(isLive ||
              isFinished) && (

              <div>

                <p className="text-4xl font-black tracking-tight">
                  {game.home_score ??
                    0}
                  <span className="mx-2 text-zinc-700">
                    -
                  </span>
                  {game.away_score ??
                    0}
                </p>


                {isLive && (

                  <div className="mt-2">

                    <p className="text-xs font-black uppercase tracking-wide text-red-400">
                      Q
                      {game.current_period ??
                        1}
                      {" · "}
                      {formatClock(
                        game.clock_seconds
                      )}
                    </p>

                  </div>

                )}


                {isFinished && (

                  <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                    Final
                  </p>

                )}

              </div>

            )}

          </div>


          {/* AWAY */}

          <TeamBlock
            team={
              away
            }
            coast={
              awayCoast
            }
            side="Away"
            align="right"
          />

        </div>


        {/* ACTION */}

        <div className="lg:w-36 lg:text-right">

          <Link
            href={`/games/${game.id}`}
            className="inline-flex rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold hover:bg-zinc-800"
          >
            {isScheduled
              ? "Fixture Details"
              : isLive
              ? "Watch Live"
              : "View Game"}
          </Link>

        </div>

      </div>

    </article>
  );
}


/*
 * =====================================================
 * TEAM BLOCK
 * =====================================================
 */

function TeamBlock({
  team,
  coast,
  side,
  align = "left",
}: {
  team:
    | TeamRef
    | null;

  coast:
    | string
    | undefined;

  side: string;

  align?:
    | "left"
    | "right";
}) {
  return (
    <div
      className={`min-w-0 flex-1 ${
        align ===
        "right"
          ? "text-right"
          : "text-left"
      }`}
    >

      <p className="text-xs uppercase tracking-widest text-zinc-600">
        {side}
      </p>

      {team ? (

        <Link
          href={`/teams/${team.id}`}
          className="mt-1 inline-block text-lg font-black hover:underline sm:text-xl"
        >
          {team.name}
        </Link>

      ) : (

        <p className="mt-1 text-lg font-black sm:text-xl">
          Team
        </p>

      )}

      <p className="mt-1 text-xs text-zinc-500">
        {coastLabel(
          coast
        )}
      </p>

    </div>
  );
}


/*
 * =====================================================
 * STATUS TAB
 * =====================================================
 */

function StatusTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`border-r border-zinc-800 px-4 py-4 font-bold last:border-r-0 ${
        active
          ? "bg-white text-black"
          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >

      <span>
        {label}
      </span>

      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
          active
            ? "bg-black/10"
            : "bg-zinc-800"
        }`}
      >
        {count}
      </span>

    </button>
  );
}


/*
 * =====================================================
 * STATUS BADGE
 * =====================================================
 */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (
    status ===
    "live"
  ) {
    return (
      <span className="inline-flex rounded-full border border-red-900 bg-red-950/40 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-400">
        Live
      </span>
    );
  }

  if (
    status ===
    "finished"
  ) {
    return (
      <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-wide text-zinc-400">
        Final
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-blue-900 bg-blue-950/30 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-400">
      Scheduled
    </span>
  );
}


/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function normaliseRelation<
  T,
>(
  value:
    | T
    | T[]
    | null
    | undefined
):
  | T
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


function coastLabel(
  value:
    | string
    | undefined
) {
  if (
    value ===
    "西岸"
  ) {
    return "West Coast";
  }

  if (
    value ===
    "東岸"
  ) {
    return "East Coast";
  }

  return "Coast TBC";
}


function formatDateHeading(
  value: string
) {
  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}


function formatTime(
  value: string
) {
  const parts =
    value.split(":");

  if (
    parts.length < 2
  ) {
    return value;
  }

  const hour =
    Number(
      parts[0]
    );

  const minute =
    Number(
      parts[1]
    );

  if (
    !Number.isFinite(
      hour
    ) ||
    !Number.isFinite(
      minute
    )
  ) {
    return value;
  }

  const date =
    new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date.toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}


function formatClock(
  seconds:
    | number
    | null
) {
  const safe =
    Math.max(
      0,
      Number(
        seconds ?? 0
      )
    );

  const minutes =
    Math.floor(
      safe / 60
    );

  const remaining =
    safe % 60;

  return `${minutes}:${String(
    remaining
  ).padStart(
    2,
    "0"
  )}`;
}