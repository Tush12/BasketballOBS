import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPlayerProfile,
  mediaPublicUrl,
  numberValue,
} from "@/lib/profile-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;



type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    league?: string;
    season?: string;
  }>;
};


export default async function PlayerProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const payload =
    await getPlayerProfile(
      id,
      query.season ?? null
    );

  const contextQuery =
    [
      query.league
        ? `league=${encodeURIComponent(
            query.league
          )}`
        : "",
      query.season
        ? `season=${encodeURIComponent(
            query.season
          )}`
        : "",
    ]
      .filter(Boolean)
      .join("&");

  if (!payload) {
    notFound();
  }

  const {
    player,
    seasonStats,
    latestSeason,
    leaderboardRows,
    gameLog,
  } = payload;

  const currentSeasonGames =
    latestSeason
      ? gameLog.filter(
          (row: any) =>
            row.game?.season_id ===
            latestSeason.season_id
        )
      : gameLog;

  const recentGames =
    currentSeasonGames.slice(
      0,
      5
    );

  const seasonHigh =
    currentSeasonGames.reduce(
      (best: any, row: any) =>
        !best ||
        numberValue(
          row.points
        ) >
          numberValue(
            best.points
          )
          ? row
          : best,
      null
    );

  const rankings =
    latestSeason
      ? {
          ppg:
            rankPlayer(
              leaderboardRows,
              id,
              "ppg"
            ),
          rpg:
            rankPlayer(
              leaderboardRows,
              id,
              "rpg"
            ),
          apg:
            rankPlayer(
              leaderboardRows,
              id,
              "apg"
            ),
          spg:
            rankPlayer(
              leaderboardRows,
              id,
              "spg"
            ),
          bpg:
            rankPlayer(
              leaderboardRows,
              id,
              "bpg"
            ),
        }
      : null;

  const recentAverages =
    averageRows(
      recentGames
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

      <div className="mb-5">
        <Link
          href={`/players${contextQuery ? `?${contextQuery}` : ""}`}
          className="text-sm font-bold hover:underline"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          ← All Players
        </Link>
      </div>


      {/* HERO */}

      <section
        className="overflow-hidden rounded-[2rem] border"
        style={{
          borderColor:
            "var(--border)",
          background:
            "var(--card)",
          boxShadow:
            "var(--shadow-card)",
        }}
      >
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">

          <div
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.7rem] border text-2xl font-black sm:h-28 sm:w-28"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--primary-soft)",
              color:
                "var(--primary)",
            }}
          >
            {player.photo_path ? (
              <img
                src={
                  mediaPublicUrl(
                    player.photo_path
                  ) ??
                  ""
                }
                alt={player.name}
                className="h-full w-full object-cover"
              />
            ) : (
              player.name
                .trim()
                .slice(
                  0,
                  2
                )
                .toUpperCase()
            )}

            <span
              className="absolute bottom-1.5 right-1.5 rounded-lg border px-2 py-1 text-xs font-black"
              style={{
                borderColor:
                  "var(--border)",
                background:
                  "var(--card)",
                color:
                  "var(--foreground)",
              }}
            >
              #{latestSeason?.jersey_number ?? "—"}
            </span>
          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
                style={{
                  background:
                    "var(--primary-soft)",
                  color:
                    "var(--primary)",
                }}
              >
                {coastLabel(
                  latestSeason?.division
                )}
              </span>

              {latestSeason?.season_name && (
                <span
                  className="rounded-full border px-3 py-1 text-xs font-black"
                  style={{
                    borderColor:
                      "var(--border)",
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  {latestSeason.season_name}
                </span>
              )}
            </div>

            <h1 className="mt-3 break-words text-3xl font-black tracking-tight sm:text-5xl">
              {player.name}
            </h1>

            {latestSeason ? (
              <p
                className="mt-3 text-sm sm:text-base"
                style={{
                  color:
                    "var(--muted-foreground)",
                }}
              >
                <Link
                  href={`/teams/${latestSeason.team_id}${contextQuery ? `?${contextQuery}` : ""}`}
                  className="font-black hover:underline"
                  style={{
                    color:
                      "var(--foreground)",
                  }}
                >
                  {latestSeason.team_name}
                </Link>
                {" · "}
                {latestSeason.games_played} games played
              </p>
            ) : (
              <p
                className="mt-3"
                style={{
                  color:
                    "var(--muted-foreground)",
                }}
              >
                No current season roster record.
              </p>
            )}

          </div>

          {seasonHigh && (
            <div
              className="rounded-2xl border p-4 lg:min-w-[180px]"
              style={{
                borderColor:
                  "var(--border)",
                background:
                  "var(--surface)",
              }}
            >
              <p
                className="text-xs font-black uppercase tracking-[0.16em]"
                style={{
                  color:
                    "var(--muted-foreground)",
                }}
              >
                Season High
              </p>

              <p className="mt-1 text-4xl font-black">
                {seasonHigh.points}
              </p>

              <p
                className="mt-1 text-xs"
                style={{
                  color:
                    "var(--muted-foreground)",
                }}
              >
                points · {formatDate(
                  seasonHigh.game?.game_date
                )}
              </p>
            </div>
          )}

        </div>
      </section>


      {/* PRIMARY STATS */}

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Games"
          value={latestSeason?.games_played ?? 0}
        />
        <StatCard
          label="PPG"
          value={formatNumber(latestSeason?.ppg)}
          rank={rankings?.ppg}
          highlight
        />
        <StatCard
          label="RPG"
          value={formatNumber(latestSeason?.rpg)}
          rank={rankings?.rpg}
        />
        <StatCard
          label="APG"
          value={formatNumber(latestSeason?.apg)}
          rank={rankings?.apg}
        />
        <StatCard
          label="SPG"
          value={formatNumber(latestSeason?.spg)}
          rank={rankings?.spg}
        />
        <StatCard
          label="BPG"
          value={formatNumber(latestSeason?.bpg)}
          rank={rankings?.bpg}
        />
      </section>


      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">

        <Panel
          eyebrow="Current Season"
          title="Shooting Splits"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ShootingCard
              label="FG"
              made={latestSeason?.fg_made}
              attempted={latestSeason?.fg_attempted}
              percentage={latestSeason?.fg_pct}
            />
            <ShootingCard
              label="2PT"
              made={latestSeason?.two_made}
              attempted={latestSeason?.two_attempted}
              percentage={latestSeason?.two_pct}
            />
            <ShootingCard
              label="3PT"
              made={latestSeason?.three_made}
              attempted={latestSeason?.three_attempted}
              percentage={latestSeason?.three_pct}
            />
            <ShootingCard
              label="FT"
              made={latestSeason?.ft_made}
              attempted={latestSeason?.ft_attempted}
              percentage={latestSeason?.ft_pct}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              label="Total Points"
              value={latestSeason?.total_points ?? 0}
            />
            <MiniStat
              label="Total Rebounds"
              value={latestSeason?.total_rebounds ?? 0}
            />
            <MiniStat
              label="Total Assists"
              value={latestSeason?.total_assists ?? 0}
            />
            <MiniStat
              label="Efficiency"
              value={formatNumber(latestSeason?.efficiency)}
            />
          </div>
        </Panel>


        <Panel
          eyebrow="Form"
          title="Last 5 Games"
        >
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              label="PTS"
              value={formatNumber(recentAverages.points)}
            />
            <MiniStat
              label="REB"
              value={formatNumber(recentAverages.rebounds)}
            />
            <MiniStat
              label="AST"
              value={formatNumber(recentAverages.assists)}
            />
          </div>

          <div className="mt-4 space-y-2">
            {recentGames.length ? (
              recentGames.map(
                (row: any) => (
                  <PlayerGameRow
                    key={row.game_id}
                    row={row}
                    playerTeamId={row.team_id}
                  />
                )
              )
            ) : (
              <EmptyText text="No game log available yet." />
            )}
          </div>
        </Panel>

      </div>


      {/* GAME LOG */}

      <section className="mt-5">
        <Panel
          eyebrow="Game Log"
          title="Season Games"
        >
          <div
            className="overflow-x-auto rounded-xl border"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <table className="w-full min-w-[920px] text-sm">
              <thead
                style={{
                  background:
                    "var(--surface)",
                  color:
                    "var(--muted-foreground)",
                }}
              >
                <tr>
                  {[
                    "Date",
                    "Opponent",
                    "Result",
                    "PTS",
                    "REB",
                    "AST",
                    "STL",
                    "BLK",
                    "TO",
                    "2PT",
                    "3PT",
                    "FT",
                  ].map(
                    (label) => (
                      <th
                        key={label}
                        className="whitespace-nowrap px-3 py-3 text-left text-xs font-black uppercase tracking-wide"
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {currentSeasonGames.map(
                  (row: any) => {
                    const info =
                      gamePerspective(
                        row.game,
                        row.team_id
                      );

                    return (
                      <tr
                        key={row.game_id}
                        className="border-t"
                        style={{
                          borderColor:
                            "var(--border)",
                        }}
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-bold">
                          {formatDate(
                            row.game?.game_date
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {info.opponentName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <ResultBadge
                            result={info.result}
                            score={info.score}
                          />
                        </td>
                        <StatCell value={row.points} bold />
                        <StatCell value={row.rebounds} />
                        <StatCell value={row.assists} />
                        <StatCell value={row.steals} />
                        <StatCell value={row.blocks} />
                        <StatCell value={row.turnovers} />
                        <ShootingStatCell
                          made={row.two_made}
                          attempted={row.two_attempted}
                          percentage={row.two_pct}
                        />
                        <ShootingStatCell
                          made={row.three_made}
                          attempted={row.three_attempted}
                          percentage={row.three_pct}
                        />
                        <ShootingStatCell
                          made={row.ft_made}
                          attempted={row.ft_attempted}
                          percentage={row.ft_pct}
                        />
                      </tr>
                    );
                  }
                )}

                {!currentSeasonGames.length && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-12 text-center"
                      style={{
                        color:
                          "var(--muted-foreground)",
                      }}
                    >
                      No games available for this season.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>


      {/* SEASON HISTORY */}

      <section className="mt-5">
        <Panel
          eyebrow="History"
          title="Season by Season"
        >
          <div className="grid gap-3">
            {seasonStats.map(
              (row: any) => (
                <div
                  key={`${row.season_id}-${row.team_id}`}
                  className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[minmax(0,1fr)_repeat(5,90px)] md:items-center"
                  style={{
                    borderColor:
                      "var(--border)",
                    background:
                      "var(--surface)",
                  }}
                >
                  <div>
                    <p className="font-black">
                      {row.season_name}
                    </p>
                    <Link
                      href={`/teams/${row.team_id}${contextQuery ? `?${contextQuery}` : ""}`}
                      className="mt-1 block text-sm font-bold hover:underline"
                      style={{
                        color:
                          "var(--primary)",
                      }}
                    >
                      {row.team_name}
                    </Link>
                  </div>

                  <HistoryStat label="GP" value={row.games_played} />
                  <HistoryStat label="PPG" value={formatNumber(row.ppg)} />
                  <HistoryStat label="RPG" value={formatNumber(row.rpg)} />
                  <HistoryStat label="APG" value={formatNumber(row.apg)} />
                  <HistoryStat label="EFF" value={formatNumber(row.efficiency)} />
                </div>
              )
            )}
          </div>
        </Panel>
      </section>

    </main>
  );
}


function rankPlayer(
  rows: any[],
  playerId: string,
  key: string
) {
  const eligible =
    rows
      .filter(
        (row) =>
          numberValue(
            row.games_played
          ) > 0
      )
      .slice()
      .sort(
        (a, b) =>
          numberValue(
            b[key]
          ) -
          numberValue(
            a[key]
          )
      );

  const index =
    eligible.findIndex(
      (row) =>
        row.player_id ===
        playerId
    );

  return index >= 0
    ? index + 1
    : null;
}


function averageRows(
  rows: any[]
) {
  if (!rows.length) {
    return {
      points: 0,
      rebounds: 0,
      assists: 0,
    };
  }

  return {
    points:
      rows.reduce(
        (sum, row) =>
          sum +
          numberValue(
            row.points
          ),
        0
      ) /
      rows.length,

    rebounds:
      rows.reduce(
        (sum, row) =>
          sum +
          numberValue(
            row.rebounds
          ),
        0
      ) /
      rows.length,

    assists:
      rows.reduce(
        (sum, row) =>
          sum +
          numberValue(
            row.assists
          ),
        0
      ) /
      rows.length,
  };
}


function gamePerspective(
  game: any,
  teamId: string
) {
  const home =
    game?.home_team_id ===
    teamId;

  const opponent =
    home
      ? game?.away_team
      : game?.home_team;

  const ownScore =
    home
      ? game?.home_score
      : game?.away_score;

  const opponentScore =
    home
      ? game?.away_score
      : game?.home_score;

  let result = "—";

  if (
    game?.status ===
      "finished" &&
    ownScore !== null &&
    opponentScore !== null
  ) {
    result =
      ownScore >
      opponentScore
        ? "W"
        : ownScore <
          opponentScore
        ? "L"
        : "D";
  }

  return {
    opponentName:
      opponent?.name ??
      "Unknown",
    result,
    score:
      ownScore !== null &&
      opponentScore !== null
        ? `${ownScore}-${opponentScore}`
        : "—",
  };
}


function PlayerGameRow({
  row,
  playerTeamId,
}: {
  row: any;
  playerTeamId: string;
}) {
  const info =
    gamePerspective(
      row.game,
      playerTeamId
    );

  return (
    <div
      className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--surface)",
      }}
    >
      <div>
        <p className="text-lg font-black">
          {row.points}
        </p>
        <p
          className="text-[10px] font-black uppercase tracking-wide"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          PTS
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate font-bold">
          {info.opponentName}
        </p>
        <p
          className="mt-0.5 text-xs"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {formatDate(
            row.game?.game_date
          )} · {row.rebounds} REB · {row.assists} AST
        </p>
      </div>

      <ResultBadge
        result={info.result}
        score={info.score}
      />
    </div>
  );
}


function ResultBadge({
  result,
  score,
}: {
  result: string;
  score: string;
}) {
  return (
    <span
      className="inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-black"
      style={{
        background:
          result === "W"
            ? "color-mix(in srgb, #16a34a 15%, var(--card))"
            : result === "L"
            ? "color-mix(in srgb, var(--danger) 12%, var(--card))"
            : "var(--card)",
        color:
          result === "W"
            ? "#16a34a"
            : result === "L"
            ? "var(--danger)"
            : "var(--muted-foreground)",
      }}
    >
      {result} {score}
    </span>
  );
}


function StatCard({
  label,
  value,
  rank,
  highlight = false,
}: {
  label: string;
  value:
    | string
    | number;
  rank?:
    | number
    | null;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor:
          highlight
            ? "color-mix(in srgb, var(--primary) 45%, var(--border))"
            : "var(--border)",
        background:
          highlight
            ? "var(--primary-soft)"
            : "var(--card)",
      }}
    >
      <p
        className="text-xs font-black uppercase tracking-wider"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {label}
      </p>
      <p className="mt-1 text-3xl font-black">
        {value}
      </p>
      {rank && (
        <p
          className="mt-1 text-xs font-black"
          style={{
            color:
              "var(--primary)",
          }}
        >
          #{rank} in league
        </p>
      )}
    </div>
  );
}


function ShootingCard({
  label,
  made,
  attempted,
  percentage,
}: {
  label: string;
  made: any;
  attempted: any;
  percentage: any;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--surface)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-black">
          {label}
        </p>
        <p
          className="text-xs font-bold"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {numberValue(made)}-{numberValue(attempted)}
        </p>
      </div>
      <p className="mt-3 text-3xl font-black">
        {formatPercentage(
          percentage
        )}
      </p>
    </div>
  );
}


function MiniStat({
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
      className="rounded-xl p-3"
      style={{
        background:
          "var(--surface)",
      }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-wide"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {label}
      </p>
      <p className="mt-1 text-xl font-black">
        {value}
      </p>
    </div>
  );
}


function HistoryStat({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="md:text-center">
      <p
        className="text-[10px] font-black uppercase tracking-wide"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {label}
      </p>
      <p className="mt-1 font-black">
        {value}
      </p>
    </div>
  );
}


function StatCell({
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
      className={`whitespace-nowrap px-3 py-3 ${
        bold
          ? "font-black"
          : ""
      }`}
    >
      {value}
    </td>
  );
}


function ShootingStatCell({
  made,
  attempted,
  percentage,
}: {
  made: unknown;
  attempted: unknown;
  percentage: unknown;
}) {
  return (
    <td className="whitespace-nowrap px-3 py-3">
      <p className="font-semibold">
        {numberValue(made)}-{numberValue(attempted)}
      </p>
      <p
        className="mt-1 text-xs"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {formatPercentage(percentage)}
      </p>
    </td>
  );
}


function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section
      className="rounded-[1.6rem] border p-4 sm:p-5"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >
      <p
        className="text-xs font-black uppercase tracking-[0.16em]"
        style={{
          color:
            "var(--primary)",
        }}
      >
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-black sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}


function EmptyText({
  text,
}: {
  text: string;
}) {
  return (
    <p
      className="rounded-xl border border-dashed p-6 text-center text-sm"
      style={{
        borderColor:
          "var(--border)",
        color:
          "var(--muted-foreground)",
      }}
    >
      {text}
    </p>
  );
}


function formatNumber(
  value: unknown
) {
  return numberValue(
    value
  ).toFixed(1);
}


function formatPercentage(
  value: unknown
) {
  return `${numberValue(
    value
  ).toFixed(1)}%`;
}


function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  return new Intl.DateTimeFormat(
    "en-HK",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}


function coastLabel(
  division:
    | string
    | null
    | undefined
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

  return division ?? "League";
}
