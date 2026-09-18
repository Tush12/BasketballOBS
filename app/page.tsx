import Link from "next/link";

import {
  getCachedHomeDashboard,
} from "@/lib/public-data";
import HomeLiveRefresh from "@/components/home-live-refresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;



export default async function HomePage() {
  const dashboard =
    await getCachedHomeDashboard();

  const season =
    dashboard?.season ??
    null;


  if (!season) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <section
          className="rounded-[2rem] border p-8 sm:p-10"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
          }}
        >
          <p
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{
              color:
                "var(--primary)",
            }}
          >
            OBS Basketball League
          </p>

          <h1 className="mt-4 text-4xl font-black sm:text-6xl">
            Basketball lives here.
          </h1>

          <p
            className="mt-5 max-w-2xl text-lg"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            The league homepage is ready, but there is no active season to display yet.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink
              href="/games"
              label="View Games"
            />

            <SecondaryLink
              href="/teams"
              label="Browse Teams"
            />
          </div>
        </section>
      </main>
    );
  }


  function normaliseGame(
    game: any
  ) {
    return {
      ...game,

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
    };
  }


  const liveGames =
    (
      dashboard?.live_games ??
      []
    ).map(
      normaliseGame
    );

  const scheduledGames =
    (
      dashboard?.scheduled_games ??
      []
    ).map(
      normaliseGame
    );

  const finishedGames =
    (
      dashboard?.finished_games ??
      []
    ).map(
      normaliseGame
    );


  const featuredGame =
    liveGames[0] ??
    scheduledGames[0] ??
    finishedGames[0] ??
    null;


  const featuredMode =
    liveGames[0]
      ? "live"
      : scheduledGames[0]
      ? "scheduled"
      : finishedGames[0]
      ? "finished"
      : "none";


  const teamCount =
    Number(
      dashboard?.counts?.teams ??
        0
    );

  const playerCount =
    Number(
      dashboard?.counts?.players ??
        0
    );

  const liveCount =
    Number(
      dashboard?.counts?.live_games ??
        0
    );

  const scheduledCount =
    Number(
      dashboard?.counts?.scheduled_games ??
        0
    );


  const westStandings =
    dashboard?.west_standings ??
    [];

  const eastStandings =
    dashboard?.east_standings ??
    [];


  const leaders = [
    {
      label:
        "Points Leader",
      shortLabel:
        "PPG",
      value:
        dashboard?.leaders?.ppg?.value,
      player:
        dashboard?.leaders?.ppg,
    },
    {
      label:
        "Rebounds Leader",
      shortLabel:
        "RPG",
      value:
        dashboard?.leaders?.rpg?.value,
      player:
        dashboard?.leaders?.rpg,
    },
    {
      label:
        "Assists Leader",
      shortLabel:
        "APG",
      value:
        dashboard?.leaders?.apg?.value,
      player:
        dashboard?.leaders?.apg,
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-8 sm:pt-12">
      <HomeLiveRefresh enabled={liveGames.length > 0} />

      {/* =================================================
          HERO
          ================================================= */}

      <section
        className="relative overflow-hidden rounded-[2rem] border"
        style={{
          borderColor:
            "var(--border)",
          background:
            "linear-gradient(135deg, var(--card) 0%, var(--primary-soft) 100%)",
        }}
      >

        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "var(--primary)",
          }}
        />

        <div
          className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full opacity-15 blur-3xl"
          style={{
            background:
              "var(--primary)",
          }}
        />


        <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10 p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">

          {/* HERO COPY */}

          <div className="min-w-0 flex flex-col justify-center">

            <div className="flex flex-wrap items-center gap-3">

              <span
                className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em]"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 35%, var(--border))",
                  background:
                    "var(--primary-soft)",
                  color:
                    "var(--primary)",
                }}
              >
                {season.name}
              </span>

              <span
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{
                  color:
                    "var(--muted-foreground)",
                }}
              >
                OBS Basketball League
              </span>

            </div>


            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Basketball
              <br />
              lives here.
            </h1>


            <p
              className="mt-6 max-w-xl text-base leading-7 sm:text-lg"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              Live scores, league fixtures, standings, player statistics and game intelligence — all in one place.
            </p>


            <div className="mt-8 flex flex-wrap gap-3">

              <PrimaryLink
                href="/games"
                label="View Games"
              />

              <SecondaryLink
                href="/standings"
                label="Standings"
              />

            </div>

          </div>


          {/* FEATURED SCOREBOARD */}

          <FeaturedGameCard
            game={
              featuredGame
            }
            mode={
              featuredMode
            }
          />

        </div>

      </section>


      {/* =================================================
          SNAPSHOT
          ================================================= */}

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <SnapshotCard
          label="Live Games"
          value={
            liveCount
          }
          href="/games"
          accent={
            liveGames.length > 0
          }
        />

        <SnapshotCard
          label="Scheduled"
          value={
            scheduledCount
          }
          href="/games"
        />

        <SnapshotCard
          label="Teams"
          value={
            teamCount
          }
          href="/teams"
        />

        <SnapshotCard
          label="Players"
          value={
            playerCount
          }
          href="/players"
        />

      </section>


      {/* =================================================
          UPCOMING + LEADERS
          ================================================= */}

      <section className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">

        {/* UPCOMING */}

        <div>

          <SectionHeading
            eyebrow="Schedule"
            title="Coming Up"
            href="/games"
            linkLabel="All Games"
          />

          <div className="mt-5 space-y-3">

            {scheduledGames.length > 0 ? (
              scheduledGames
                .slice(
                  0,
                  4
                )
                .map(
                  (game: any) => (
                    <UpcomingGame
                      key={
                        game.id
                      }
                      game={
                        game
                      }
                    />
                  )
                )
            ) : (
              <EmptyCard
                text="No scheduled games right now."
              />
            )}

          </div>

        </div>


        {/* LEADERS */}

        <div>

          <SectionHeading
            eyebrow="Players"
            title="League Leaders"
            href="/players"
            linkLabel="All Players"
          />

          <div className="mt-5 grid gap-3">

            {leaders.map(
              (leader) => (
                <LeaderCard
                  key={
                    leader.label
                  }
                  label={
                    leader.label
                  }
                  shortLabel={
                    leader.shortLabel
                  }
                  value={
                    leader.value
                  }
                  player={
                    leader.player
                  }
                />
              )
            )}

          </div>

        </div>

      </section>


      {/* =================================================
          STANDINGS
          ================================================= */}

      <section className="mt-14">

        <SectionHeading
          eyebrow="Table"
          title="Standings Snapshot"
          href="/standings"
          linkLabel="Full Standings"
        />

        <div className="mt-5 grid gap-5 lg:grid-cols-2">

          <StandingsPreview
            title="West Coast"
            rows={
              westStandings
            }
          />

          <StandingsPreview
            title="East Coast"
            rows={
              eastStandings
            }
          />

        </div>

      </section>


      {/* =================================================
          RESULTS + AI
          ================================================= */}

      <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_0.85fr]">

        {/* RESULTS */}

        <div>

          <SectionHeading
            eyebrow="Latest"
            title="Recent Results"
            href="/games"
            linkLabel="All Results"
          />

          <div className="mt-5 space-y-3">

            {finishedGames.length > 0 ? (
              finishedGames.map(
                (game: any) => (
                  <ResultCard
                    key={
                      game.id
                    }
                    game={
                      game
                    }
                  />
                )
              )
            ) : (
              <EmptyCard
                text="No finished games yet."
              />
            )}

          </div>

        </div>


        {/* AI */}

        <div
          className="relative overflow-hidden rounded-[2rem] border p-8 sm:p-10"
          style={{
            borderColor:
              "color-mix(in srgb, var(--primary) 35%, var(--border))",
            background:
              "linear-gradient(145deg, var(--primary-soft), var(--card))",
          }}
        >

          <div
            className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
            style={{
              background:
                "var(--primary)",
            }}
          />

          <div className="relative">

            <span
              className="text-xs font-black uppercase tracking-[0.2em]"
              style={{
                color:
                  "var(--primary)",
              }}
            >
              OBS AI
            </span>

            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Ask the league.
            </h2>

            <p
              className="mt-4 max-w-lg leading-7"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              Explore league stats, player performance, recent form and matchup predictions through the OBS AI assistant.
            </p>


            <div className="mt-6 space-y-2">

              <QuestionChip
                text="Who leads the league in scoring?"
              />

              <QuestionChip
                text="Compare two teams this season"
              />

              <QuestionChip
                text="Predict the next matchup"
              />

            </div>


            <div className="mt-8">

              <PrimaryLink
                href="/ai"
                label="Open OBS AI"
              />

            </div>

          </div>

        </div>

      </section>


      {/* =================================================
          QUICK NAVIGATION
          ================================================= */}

      <section className="mt-14">

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <NavTile
            href="/games"
            eyebrow="01"
            title="Games"
            description="Live scores, schedule and results."
          />

          <NavTile
            href="/standings"
            eyebrow="02"
            title="Standings"
            description="West and East league tables."
          />

          <NavTile
            href="/teams"
            eyebrow="03"
            title="Teams"
            description="Rosters, records and team pages."
          />

          <NavTile
            href="/players"
            eyebrow="04"
            title="Players"
            description="Full player statistics and leaders."
          />

        </div>

      </section>

    </main>
  );
}


/*
 * =====================================================
 * FEATURED GAME
 * =====================================================
 */

function FeaturedGameCard({
  game,
  mode,
}: {
  game: any;
  mode:
    | "live"
    | "scheduled"
    | "finished"
    | "none";
}) {
  if (!game) {
    return (
      <div
        className="rounded-[1.75rem] border p-8"
        style={{
          borderColor:
            "var(--border)",
          background:
            "var(--card)",
          boxShadow:
            "var(--shadow-card)",
        }}
      >
        <p
          className="text-xs font-black uppercase tracking-[0.2em]"
          style={{
            color:
              "var(--primary)",
          }}
        >
          League
        </p>

        <h2 className="mt-3 text-2xl font-black">
          Ready for tip-off.
        </h2>

        <p
          className="mt-3"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          New fixtures will appear here as soon as they are scheduled.
        </p>
      </div>
    );
  }


  const home =
    relationOne(
      game.home_team
    )?.name ??
    "Home";

  const away =
    relationOne(
      game.away_team
    )?.name ??
    "Away";

  const isLive =
    mode ===
    "live";

  const showScore =
    mode ===
      "live" ||
    mode ===
      "finished";


  return (
    <div
      className="min-w-0 rounded-[1.75rem] border p-6 sm:p-8"
      style={{
        borderColor:
          isLive
            ? "color-mix(in srgb, #ef4444 45%, var(--border))"
            : "var(--border)",
        background:
          "var(--card)",
        boxShadow:
          "var(--shadow-card)",
      }}
    >

      <div className="flex items-center justify-between gap-4">

        <div>

          <p
            className="text-xs font-black uppercase tracking-[0.2em]"
            style={{
              color:
                isLive
                  ? "#ef4444"
                  : "var(--primary)",
            }}
          >
            {mode ===
            "live"
              ? "Live Now"
              : mode ===
                "scheduled"
              ? "Next Game"
              : "Latest Result"}
          </p>

          <p
            className="mt-1 text-sm"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            {formatGameDate(
              game.game_date
            )}
            {game.game_time
              ? ` · ${formatGameTime(
                  game.game_time
                )}`
              : ""}
          </p>

        </div>


        {isLive && (

          <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-500">

            <span className="h-2 w-2 rounded-full bg-red-500" />

            LIVE

          </span>

        )}

      </div>


      <div className="mt-8 space-y-5">

        <ScoreTeamRow
          name={
            home
          }
          score={
            showScore
              ? game.home_score ??
                0
              : null
          }
        />

        <div
          className="h-px"
          style={{
            background:
              "var(--border)",
          }}
        />

        <ScoreTeamRow
          name={
            away
          }
          score={
            showScore
              ? game.away_score ??
                0
              : null
          }
        />

      </div>


      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">

        <div
          className="min-w-0 break-words text-sm"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {isLive ? (
            <>
              Q{game.current_period ??
                1}
              {" · "}
              {formatClock(
                game.clock_seconds
              )}
            </>
          ) : (
            game.venue ??
            "Venue TBA"
          )}
        </div>


        <Link
          href={`/games/${game.id}`}
          className="shrink-0 text-sm font-black"
          style={{
            color:
              "var(--primary)",
          }}
        >
          View Game →
        </Link>

      </div>

    </div>
  );
}


function ScoreTeamRow({
  name,
  score,
}: {
  name: string;
  score:
    | number
    | null;
}) {
  return (
    <div className="flex items-start justify-between gap-5 sm:items-center">

      <p className="min-w-0 break-words text-lg font-black leading-tight sm:truncate sm:text-2xl">
        {name}
      </p>

      {score !==
        null && (
        <p className="shrink-0 text-4xl font-black tabular-nums">
          {score}
        </p>
      )}

    </div>
  );
}


/*
 * =====================================================
 * SNAPSHOT
 * =====================================================
 */

function SnapshotCard({
  label,
  value,
  href,
  accent = false,
}: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className="group rounded-2xl border p-5 transition hover:-translate-y-0.5"
      style={{
        borderColor:
          accent
            ? "color-mix(in srgb, #ef4444 40%, var(--border))"
            : "var(--border)",
        background:
          "var(--card)",
        boxShadow:
          "var(--shadow-card)",
      }}
    >

      <p
        className="text-xs font-bold uppercase tracking-[0.14em]"
        style={{
          color:
            accent
              ? "#ef4444"
              : "var(--muted-foreground)",
        }}
      >
        {label}
      </p>

      <div className="mt-2 flex items-end justify-between gap-3">

        <p className="text-3xl font-black tabular-nums sm:text-4xl">
          {value}
        </p>

        <span
          className="text-lg transition group-hover:translate-x-1"
          style={{
            color:
              "var(--primary)",
          }}
        >
          →
        </span>

      </div>

    </Link>
  );
}


/*
 * =====================================================
 * SECTION HEADER
 * =====================================================
 */

function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">

      <div>

        <p
          className="text-xs font-black uppercase tracking-[0.2em]"
          style={{
            color:
              "var(--primary)",
          }}
        >
          {eyebrow}
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          {title}
        </h2>

      </div>


      <Link
        href={
          href
        }
        className="text-sm font-bold"
        style={{
          color:
            "var(--primary)",
        }}
      >
        {linkLabel} →
      </Link>

    </div>
  );
}


/*
 * =====================================================
 * UPCOMING
 * =====================================================
 */

function UpcomingGame({
  game,
}: {
  game: any;
}) {
  const home =
    relationOne(
      game.home_team
    )?.name ??
    "Home";

  const away =
    relationOne(
      game.away_team
    )?.name ??
    "Away";


  return (
    <Link
      href={`/games/${game.id}`}
      className="group grid gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5 sm:grid-cols-[110px_1fr_auto] sm:items-center"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >

      <div>

        <p className="font-black">
          {shortDate(
            game.game_date
          )}
        </p>

        <p
          className="mt-1 text-sm"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {formatGameTime(
            game.game_time
          )}
        </p>

      </div>


      <div className="min-w-0">

        <p className="truncate font-black">
          {home}
        </p>

        <p
          className="my-0.5 text-xs font-bold uppercase tracking-wider"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          vs
        </p>

        <p className="truncate font-black">
          {away}
        </p>

      </div>


      <div className="flex items-center gap-3">

        <p
          className="max-w-[150px] truncate text-sm"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {game.venue ??
            "Venue TBA"}
        </p>

        <span
          className="transition group-hover:translate-x-1"
          style={{
            color:
              "var(--primary)",
          }}
        >
          →
        </span>

      </div>

    </Link>
  );
}


/*
 * =====================================================
 * LEADERS
 * =====================================================
 */

function LeaderCard({
  label,
  shortLabel,
  value,
  player,
}: {
  label: string;
  shortLabel: string;
  value: any;
  player: any;
}) {
  if (!player) {
    return (
      <EmptyCard
        text={`${label} unavailable`}
      />
    );
  }


  return (
    <Link
      href={`/players/${player.player_id}`}
      className="group rounded-2xl border p-5 transition hover:-translate-y-0.5"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">

          <p
            className="text-xs font-bold uppercase tracking-[0.15em]"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            {label}
          </p>

          <div className="mt-2 flex min-w-0 items-center gap-3">

            <div
              className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border px-2 text-sm font-black"
              style={{
                borderColor:
                  "var(--border)",
                background:
                  "var(--surface)",
              }}
            >
              {player.jersey_number ??
                "—"}
            </div>

            <div className="min-w-0">

              <p className="truncate font-black">
                {player.player_name}
              </p>

              <p
                className="truncate text-sm"
                style={{
                  color:
                    "var(--muted-foreground)",
                }}
              >
                {player.team_name}
              </p>

            </div>

          </div>

        </div>


        <div className="text-right">

          <p
            className="text-xs font-black uppercase tracking-wider"
            style={{
              color:
                "var(--primary)",
            }}
          >
            {shortLabel}
          </p>

          <p className="mt-1 text-3xl font-black tabular-nums">
            {formatStat(
              value
            )}
          </p>

        </div>

      </div>

    </Link>
  );
}


/*
 * =====================================================
 * STANDINGS
 * =====================================================
 */

function StandingsPreview({
  title,
  rows,
}: {
  title: string;
  rows: any[];
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >

      <div
        className="flex items-center justify-between border-b px-5 py-4"
        style={{
          borderColor:
            "var(--border)",
          background:
            "var(--surface)",
        }}
      >

        <h3 className="font-black">
          {title}
        </h3>

        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          W-L · DIFF
        </span>

      </div>


      <div>

        {rows.length > 0 ? (
          rows.map(
            (
              row,
              index
            ) => (
              <Link
                key={
                  row.team_id
                }
                href={`/teams/${row.team_id}`}
                className="grid grid-cols-[34px_1fr_auto_auto] items-center gap-3 border-b px-5 py-4 last:border-b-0"
                style={{
                  borderColor:
                    "var(--border)",
                }}
              >

                <span
                  className="text-sm font-black"
                  style={{
                    color:
                      index ===
                      0
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                  }}
                >
                  {index +
                    1}
                </span>

                <span className="min-w-0 truncate font-bold">
                  {row.team_name}
                </span>

                <span className="font-black tabular-nums">
                  {row.wins}-
                  {row.losses}
                </span>

                <span
                  className="min-w-[45px] text-right text-sm font-bold tabular-nums"
                  style={{
                    color:
                      Number(
                        row.point_diff
                      ) >
                      0
                        ? "var(--success)"
                        : Number(
                            row.point_diff
                          ) <
                          0
                        ? "var(--danger)"
                        : "var(--muted-foreground)",
                  }}
                >
                  {Number(
                    row.point_diff
                  ) >
                  0
                    ? "+"
                    : ""}
                  {row.point_diff}
                </span>

              </Link>
            )
          )
        ) : (
          <div
            className="px-5 py-8 text-sm"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            No standings yet.
          </div>
        )}

      </div>

    </div>
  );
}


/*
 * =====================================================
 * RESULTS
 * =====================================================
 */

function ResultCard({
  game,
}: {
  game: any;
}) {
  const home =
    relationOne(
      game.home_team
    )?.name ??
    "Home";

  const away =
    relationOne(
      game.away_team
    )?.name ??
    "Away";

  const homeScore =
    Number(
      game.home_score ??
        0
    );

  const awayScore =
    Number(
      game.away_score ??
        0
    );


  return (
    <Link
      href={`/games/${game.id}`}
      className="grid grid-cols-[75px_1fr_auto] items-center gap-4 rounded-2xl border p-5"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >

      <div>

        <p className="text-sm font-bold">
          {shortDate(
            game.game_date
          )}
        </p>

        <p
          className="mt-1 text-xs font-bold uppercase tracking-wider"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          Final
        </p>

      </div>


      <div className="min-w-0 space-y-2">

        <div className="flex min-w-0 items-center justify-between gap-4">

          <p
            className={`truncate ${
              homeScore >
              awayScore
                ? "font-black"
                : "font-semibold"
            }`}
          >
            {home}
          </p>

          <p className="font-black tabular-nums">
            {homeScore}
          </p>

        </div>

        <div className="flex min-w-0 items-center justify-between gap-4">

          <p
            className={`truncate ${
              awayScore >
              homeScore
                ? "font-black"
                : "font-semibold"
            }`}
          >
            {away}
          </p>

          <p className="font-black tabular-nums">
            {awayScore}
          </p>

        </div>

      </div>


      <span
        style={{
          color:
            "var(--primary)",
        }}
      >
        →
      </span>

    </Link>
  );
}


/*
 * =====================================================
 * NAVIGATION TILES
 * =====================================================
 */

function NavTile({
  href,
  eyebrow,
  title,
  description,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={
        href
      }
      className="group rounded-2xl border p-6 transition hover:-translate-y-1"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >

      <div className="flex items-center justify-between">

        <span
          className="text-xs font-black tracking-[0.15em]"
          style={{
            color:
              "var(--primary)",
          }}
        >
          {eyebrow}
        </span>

        <span
          className="transition group-hover:translate-x-1"
          style={{
            color:
              "var(--primary)",
          }}
        >
          →
        </span>

      </div>

      <h3 className="mt-8 text-2xl font-black">
        {title}
      </h3>

      <p
        className="mt-2 text-sm leading-6"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {description}
      </p>

    </Link>
  );
}


/*
 * =====================================================
 * BUTTONS / SMALL UI
 * =====================================================
 */

function PrimaryLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={
        href
      }
      className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5"
      style={{
        background:
          "var(--primary)",
        color:
          "var(--primary-foreground)",
      }}
    >
      {label}
    </Link>
  );
}


function SecondaryLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={
        href
      }
      className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-black transition hover:-translate-y-0.5"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
        color:
          "var(--foreground)",
      }}
    >
      {label}
    </Link>
  );
}


function QuestionChip({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm font-semibold"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >
      “{text}”
    </div>
  );
}


function EmptyCard({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="rounded-2xl border p-6 text-sm"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
        color:
          "var(--muted-foreground)",
      }}
    >
      {text}
    </div>
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


function formatGameDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "Date TBA";
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}


function shortDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "TBA";
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      day: "numeric",
      month: "short",
    }
  ).format(date);
}


function formatGameTime(
  value:
    | string
    | null
) {
  if (!value) {
    return "Time TBA";
  }

  const [
    hourText,
    minuteText,
  ] =
    value.split(":");

  const hour =
    Number(
      hourText
    );

  const minute =
    Number(
      minuteText ??
        "0"
    );

  if (
    !Number.isFinite(
      hour
    )
  ) {
    return value;
  }

  const date =
    new Date();

  date.setHours(
    hour,
    Number.isFinite(
      minute
    )
      ? minute
      : 0,
    0,
    0
  );

  return new Intl.DateTimeFormat(
    "en",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}


function formatClock(
  value: any
) {
  const total =
    Math.max(
      0,
      Number(
        value ??
          0
      )
    );

  const minutes =
    Math.floor(
      total /
        60
    );

  const seconds =
    Math.floor(
      total %
        60
    );

  return `${minutes}:${String(
    seconds
  ).padStart(
    2,
    "0"
  )}`;
}


function formatStat(
  value: any
) {
  const number =
    Number(
      value ??
        0
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0.0";
  }

  return number.toFixed(
    1
  );
}
