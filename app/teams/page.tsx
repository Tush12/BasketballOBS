"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";


type League = {
  id: string;
  name: string;
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

type TeamMedia = {
  id: string;
  logo_path: string | null;
};

type Standing = {
  team_id: string;
  team_name: string;
  games_played: number;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  point_diff: number;
  division:
    | string
    | null;
  season_id: string;
  season_name: string;
  season_year:
    | number
    | null;
};


export default function TeamsPage() {
  const [
    leagues,
    setLeagues,
  ] =
    useState<League[]>([]);

  const [
    seasons,
    setSeasons,
  ] =
    useState<Season[]>([]);

  const [
    standings,
    setStandings,
  ] =
    useState<Standing[]>([]);

  const [
    teamMedia,
    setTeamMedia,
  ] = useState<TeamMedia[]>([]);

  const [
    selectedLeague,
    setSelectedLeague,
  ] =
    useState("");

  const [
    selectedSeason,
    setSelectedSeason,
  ] =
    useState("");

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


  useEffect(() => {
    loadData();
  }, []);


  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        leaguesResult,
        seasonsResult,
        standingsResult,
        teamsResult,
      ] =
        await Promise.all([
          supabase
            .from("leagues")
            .select("id,name")
            .order("name", {
              ascending: true,
            }),

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
            .from("teams")
            .select("id,logo_path"),
        ]);

      if (
        leaguesResult.error
      ) {
        throw leaguesResult.error;
      }

      if (
        seasonsResult.error
      ) {
        throw seasonsResult.error;
      }

      if (
        standingsResult.error
      ) {
        throw standingsResult.error;
      }

      if (teamsResult.error) {
        throw teamsResult.error;
      }

      const leagueRows =
        (leaguesResult.data ??
          []) as League[];

      const seasonRows =
        (seasonsResult.data ??
          []) as Season[];

      const standingRows =
        (standingsResult.data ??
          []) as Standing[];

      const teamMediaRows =
        (teamsResult.data ?? []) as TeamMedia[];

      setLeagues(
        leagueRows
      );

      setSeasons(
        seasonRows
      );

      setStandings(
        standingRows
      );

      setTeamMedia(teamMediaRows);

      /*
       * Preserve league/season context when returning
       * from a team profile if query parameters exist.
       */
      const params =
        new URLSearchParams(
          window.location.search
        );

      const requestedLeague =
        params.get(
          "league"
        );

      const requestedSeason =
        params.get(
          "season"
        );

      const firstLeague =
        requestedLeague &&
        leagueRows.some(
          (league) =>
            league.id ===
            requestedLeague
        )
          ? requestedLeague
          : leagueRows[0]
              ?.id ?? "";

      const leagueSeasons =
        seasonRows.filter(
          (season) =>
            season.league_id ===
            firstLeague
        );

      const firstSeason =
        requestedSeason &&
        leagueSeasons.some(
          (season) =>
            season.id ===
            requestedSeason
        )
          ? requestedSeason
          : leagueSeasons[0]
              ?.id ?? "";

      setSelectedLeague(
        firstLeague
      );

      setSelectedSeason(
        firstSeason
      );
    } catch (
      loadError: any
    ) {
      setError(
        loadError?.message ??
          "Could not load teams."
      );
    } finally {
      setLoading(false);
    }
  }


  const availableSeasons =
    useMemo(
      () =>
        seasons.filter(
          (season) =>
            season.league_id ===
            selectedLeague
        ),
      [
        seasons,
        selectedLeague,
      ]
    );


  function changeLeague(
    leagueId: string
  ) {
    setSelectedLeague(
      leagueId
    );

    const nextSeason =
      seasons.find(
        (season) =>
          season.league_id ===
          leagueId
      )?.id ?? "";

    setSelectedSeason(
      nextSeason
    );
  }


  const currentRows =
    useMemo(
      () =>
        standings.filter(
          (row) =>
            !selectedSeason ||
            row.season_id ===
              selectedSeason
        ),
      [
        standings,
        selectedSeason,
      ]
    );


  const west =
    rankTeams(
      currentRows.filter(
        (team) =>
          team.division ===
          "西岸"
      )
    );

  const east =
    rankTeams(
      currentRows.filter(
        (team) =>
          team.division ===
          "東岸"
      )
    );


  const selectedLeagueName =
    leagues.find(
      (league) =>
        league.id ===
        selectedLeague
    )?.name ??
    "League";

  const selectedSeasonRow =
    seasons.find(
      (season) =>
        season.id ===
        selectedSeason
    );


  const profileQuery =
    [
      selectedLeague
        ? `league=${encodeURIComponent(
            selectedLeague
          )}`
        : "",

      selectedSeason
        ? `season=${encodeURIComponent(
            selectedSeason
          )}`
        : "",
    ]
      .filter(Boolean)
      .join("&");


  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="text-xs font-black uppercase tracking-[0.2em]"
            style={{
              color:
                "var(--primary)",
            }}
          >
            League
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Teams
          </h1>

          <p
            className="mt-2 max-w-2xl"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            Team records, form, rosters, leaders and season statistics.
          </p>
        </div>
      </section>


      {/* LEAGUE + SEASON SELECTORS */}

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
              changeLeague(
                e.target.value
              )
            }
            disabled={
              loading ||
              leagues.length === 0
            }
            className="w-full rounded-xl border px-4 py-3 font-bold outline-none disabled:opacity-50"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--surface)",
              color:
                "var(--foreground)",
            }}
          >
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
            onChange={(e) =>
              setSelectedSeason(
                e.target.value
              )
            }
            disabled={
              loading ||
              availableSeasons.length ===
                0
            }
            className="w-full rounded-xl border px-4 py-3 font-bold outline-none disabled:opacity-50"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--surface)",
              color:
                "var(--foreground)",
            }}
          >
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


      {error && (
        <div
          className="mt-5 rounded-xl border p-4 text-sm font-bold"
          style={{
            borderColor:
              "var(--danger)",
            color:
              "var(--danger)",
            background:
              "var(--card)",
          }}
        >
          {error}
        </div>
      )}


      {loading ? (
        <div
          className="mt-8 rounded-2xl border p-10 text-center"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
            color:
              "var(--muted-foreground)",
          }}
        >
          Loading teams…
        </div>
      ) : (
        <>
          <div
            className="mt-5 flex flex-wrap items-center gap-2 text-sm"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            <strong
              style={{
                color:
                  "var(--foreground)",
              }}
            >
              {selectedLeagueName}
            </strong>

            {selectedSeasonRow && (
              <>
                <span>·</span>

                <span>
                  {selectedSeasonRow.name}
                  {selectedSeasonRow.season_year
                    ? ` ${selectedSeasonRow.season_year}`
                    : ""}
                </span>
              </>
            )}
          </div>


          <DivisionSection
            title="West"
            subtitle="西岸"
            teams={west}
            profileQuery={
              profileQuery
            }
            teamMedia={teamMedia}
          />

          <DivisionSection
            title="East"
            subtitle="東岸"
            teams={east}
            profileQuery={
              profileQuery
            }
            teamMedia={teamMedia}
          />


          {!leagues.length && (
            <div
              className="mt-8 rounded-2xl border border-dashed p-10 text-center"
              style={{
                borderColor:
                  "var(--border)",
                color:
                  "var(--muted-foreground)",
              }}
            >
              No leagues have been created yet.
            </div>
          )}
        </>
      )}

    </main>
  );
}


function DivisionSection({
  title,
  subtitle,
  teams,
  profileQuery,
  teamMedia,
}: {
  title: string;
  subtitle: string;
  teams: Standing[];
  profileQuery: string;
  teamMedia: TeamMedia[];
}) {
  return (
    <section className="mt-10">

      <div className="flex items-end justify-between gap-4">
        <div>
          <p
            className="text-xs font-black uppercase tracking-[0.16em]"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            {subtitle}
          </p>

          <h2 className="mt-1 text-2xl font-black">
            {title} Division
          </h2>
        </div>

        <span
          className="text-sm font-bold"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {teams.length} teams
        </span>
      </div>


      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

        {teams.map(
          (
            team,
            index
          ) => {
            const logoPath =
              teamMedia.find(
                (row) => row.id === team.team_id
              )?.logo_path ?? null;

            const logoUrl = logoPath
              ? supabase.storage
                  .from("basketball-media")
                  .getPublicUrl(logoPath).data.publicUrl
              : null;

            return (
            <Link
              key={
                team.team_id
              }
              href={`/teams/${team.team_id}${
                profileQuery
                  ? `?${profileQuery}`
                  : ""
              }`}
              className="group rounded-[1.5rem] border p-5 transition hover:-translate-y-0.5"
              style={{
                borderColor:
                  "var(--border)",
                background:
                  "var(--card)",
                boxShadow:
                  "var(--shadow-card)",
              }}
            >

              <div className="flex items-start justify-between gap-4">

                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={`${team.team_name} logo`}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-lg font-black">
                        {team.team_name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                <div className="min-w-0">
                  <p
                    className="text-xs font-black uppercase tracking-[0.16em]"
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  >
                    #{index + 1}{" "}
                    {title}
                  </p>

                  <h3 className="mt-2 break-words text-xl font-black group-hover:underline">
                    {team.team_name}
                  </h3>
                </div>
                </div>


                <div
                  className="shrink-0 rounded-xl px-3 py-2 text-center"
                  style={{
                    background:
                      "var(--primary-soft)",
                  }}
                >
                  <p className="text-lg font-black">
                    {team.wins}-
                    {team.losses}
                  </p>

                  <p
                    className="text-[9px] font-black uppercase tracking-wide"
                    style={{
                      color:
                        "var(--muted-foreground)",
                    }}
                  >
                    Record
                  </p>
                </div>

              </div>


              <div className="mt-5 grid grid-cols-4 gap-2">

                <TeamMini
                  label="GP"
                  value={
                    team.games_played
                  }
                />

                <TeamMini
                  label="PF"
                  value={
                    team.points_for
                  }
                />

                <TeamMini
                  label="PA"
                  value={
                    team.points_against
                  }
                />

                <TeamMini
                  label="+/-"
                  value={signed(
                    team.point_diff
                  )}
                />

              </div>


              <div className="mt-4 flex items-center justify-between text-xs font-bold">

                <span
                  style={{
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  Win rate{" "}
                  {winPct(
                    team
                  )}
                </span>

                <span
                  style={{
                    color:
                      "var(--primary)",
                  }}
                >
                  View Team →
                </span>

              </div>

            </Link>
            );
          }
        )}

      </div>


      {!teams.length && (
        <div
          className="mt-4 rounded-2xl border border-dashed p-8 text-center"
          style={{
            borderColor:
              "var(--border)",
            color:
              "var(--muted-foreground)",
          }}
        >
          No teams in this division for the selected season.
        </div>
      )}

    </section>
  );
}


function TeamMini({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div
      className="rounded-xl p-2.5 text-center"
      style={{
        background:
          "var(--surface)",
      }}
    >
      <p className="font-black">
        {value}
      </p>

      <p
        className="mt-0.5 text-[9px] font-black uppercase tracking-wide"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {label}
      </p>
    </div>
  );
}


function rankTeams(
  rows: Standing[]
) {
  return rows
    .slice()
    .sort(
      (a, b) =>
        Number(
          b.wins
        ) -
          Number(
            a.wins
          ) ||
        Number(
          b.point_diff
        ) -
          Number(
            a.point_diff
          )
    );
}


function winPct(
  team: Standing
) {
  const games =
    Number(
      team.games_played ??
        0
    );

  if (!games) {
    return "0.0%";
  }

  return `${(
    (Number(
      team.wins ??
        0
    ) /
      games) *
    100
  ).toFixed(1)}%`;
}


function signed(
  value: unknown
) {
  const number =
    Number(
      value ?? 0
    );

  return number > 0
    ? `+${number}`
    : String(number);
}
