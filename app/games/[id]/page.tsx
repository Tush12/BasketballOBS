import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getTeamProfile,
  numberValue,
} from "@/lib/profile-data";


type PageProps = {
  params: Promise<{
    id: string;
  }>;
};


export default async function TeamProfilePage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const payload =
    await getTeamProfile(id);

  if (!payload) {
    notFound();
  }

  const {
    team,
    standings,
    latestSeason,
    divisionStandings,
    roster,
    latestSeasonGames,
    latestTeamGameStats,
  } = payload;

  const rankedDivision =
    divisionStandings
      .slice()
      .sort(
        (a: any, b: any) =>
          numberValue(b.wins) -
            numberValue(a.wins) ||
          numberValue(b.point_diff) -
            numberValue(a.point_diff)
      );

  const divisionRank =
    rankedDivision.findIndex(
      (row: any) =>
        row.team_id ===
        id
    ) + 1;

  const finishedGames =
    latestSeasonGames.filter(
      (game: any) =>
        game.status ===
        "finished"
    );

  const upcomingGames =
    latestSeasonGames
      .filter(
        (game: any) =>
          game.status ===
          "scheduled"
      )
      .slice()
      .sort(
        (a: any, b: any) =>
          `${a.game_date} ${a.game_time ?? ""}`.localeCompare(
            `${b.game_date} ${b.game_time ?? ""}`
          )
      )
      .slice(0, 5);

  const recentGames =
    finishedGames.slice(
      0,
      5
    );

  const form =
    recentGames.map(
      (game: any) =>
        teamGamePerspective(
          game,
          id
        ).result
    );

  const leaders = {
    points:
      topPlayer(
        roster,
        "ppg"
      ),
    rebounds:
      topPlayer(
        roster,
        "rpg"
      ),
    assists:
      topPlayer(
        roster,
        "apg"
      ),
    steals:
      topPlayer(
        roster,
        "spg"
      ),
    blocks:
      topPlayer(
        roster,
        "bpg"
      ),
  };

  const teamAverages =
    aggregateTeamStats(
      latestTeamGameStats,
      latestSeason
    );

  const headToHead =
    buildHeadToHead(
      finishedGames,
      id
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

      <div className="mb-5">
        <Link
          href="/teams"
          className="text-sm font-bold hover:underline"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          ← All Teams
        </Link>
      </div>


      {/* HERO */}

      <section
        className="rounded-[2rem] border p-5 sm:p-7"
        style={{
          borderColor:
            "var(--border)",
          background:
            "var(--card)",
          boxShadow:
            "var(--shadow-card)",
        }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
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
                  latestSeason?.division ??
                  team.division
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
              {team.name}
            </h1>

            <div
              className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              {team.manager && (
                <span>
                  Manager:{" "}
                  <strong
                    style={{
                      color:
                        "var(--foreground)",
                    }}
                  >
                    {team.manager}
                  </strong>
                </span>
              )}

              {team.home_colour && (
                <span>
                  Home:{" "}
                  <strong
                    style={{
                      color:
                        "var(--foreground)",
                    }}
                  >
                    {team.home_colour}
                  </strong>
                </span>
              )}

              {team.away_colour && (
                <span>
                  Away:{" "}
                  <strong
                    style={{
                      color:
                        "var(--foreground)",
                    }}
                  >
                    {team.away_colour}
                  </strong>
                </span>
              )}
            </div>
          </div>


          <div className="flex flex-wrap gap-3">
            <HeroMetric
              label="Record"
              value={`${latestSeason?.wins ?? 0}-${latestSeason?.losses ?? 0}`}
            />
            <HeroMetric
              label="Division Rank"
              value={
                divisionRank > 0
                  ? `#${divisionRank}`
                  : "—"
              }
            />
            <HeroMetric
              label="Point Diff"
              value={signed(
                latestSeason?.point_diff
              )}
            />
          </div>

        </div>

        <div className="mt-6 flex items-center gap-2">
          <span
            className="text-xs font-black uppercase tracking-[0.16em]"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            Last 5
          </span>

          {form.length ? (
            form.map(
              (
                result,
                index
              ) => (
                <span
                  key={`${result}-${index}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black"
                  style={{
                    background:
                      result === "W"
                        ? "color-mix(in srgb, #16a34a 15%, var(--card))"
                        : "color-mix(in srgb, var(--danger) 12%, var(--card))",
                    color:
                      result === "W"
                        ? "#16a34a"
                        : "var(--danger)",
                  }}
                >
                  {result}
                </span>
              )
            )
          ) : (
            <span
              className="text-sm"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              No completed games
            </span>
          )}
        </div>
      </section>


      {/* TEAM METRICS */}

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="PPG"
          value={formatNumber(
            teamAverages.ppg
          )}
          highlight
        />
        <MetricCard
          label="RPG"
          value={formatNumber(
            teamAverages.rpg
          )}
        />
        <MetricCard
          label="APG"
          value={formatNumber(
            teamAverages.apg
          )}
        />
        <MetricCard
          label="FG%"
          value={formatPct(
            teamAverages.fgPct
          )}
        />
        <MetricCard
          label="3PT%"
          value={formatPct(
            teamAverages.threePct
          )}
        />
        <MetricCard
          label="Win%"
          value={formatPct(
            winPercentage(
              latestSeason
            )
          )}
        />
      </section>


      {/* LEADERS */}

      <section className="mt-5">
        <Panel
          eyebrow="Current Season"
          title="Team Leaders"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <LeaderCard
              label="Points"
              player={leaders.points}
              statKey="ppg"
              suffix="PPG"
            />
            <LeaderCard
              label="Rebounds"
              player={leaders.rebounds}
              statKey="rpg"
              suffix="RPG"
            />
            <LeaderCard
              label="Assists"
              player={leaders.assists}
              statKey="apg"
              suffix="APG"
            />
            <LeaderCard
              label="Steals"
              player={leaders.steals}
              statKey="spg"
              suffix="SPG"
            />
            <LeaderCard
              label="Blocks"
              player={leaders.blocks}
              statKey="bpg"
              suffix="BPG"
            />
          </div>
        </Panel>
      </section>


      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">

        {/* ROSTER */}

        <Panel
          eyebrow="Players"
          title={`Roster (${roster.length})`}
        >
          <div
            className="overflow-x-auto rounded-xl border"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <table className="w-full min-w-[680px] text-sm">
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
                    "#",
                    "Player",
                    "GP",
                    "PPG",
                    "RPG",
                    "APG",
                    "FG%",
                    "3PT%",
                  ].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-3 py-3 text-left text-xs font-black uppercase tracking-wide"
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {roster.map(
                  (player: any) => (
                    <tr
                      key={player.player_id}
                      className="border-t"
                      style={{
                        borderColor:
                          "var(--border)",
                      }}
                    >
                      <td className="px-3 py-3 font-black">
                        {player.jersey_number ?? "—"}
                      </td>

                      <td className="px-3 py-3">
                        <Link
                          href={`/players/${player.player_id}`}
                          className="font-black hover:underline"
                        >
                          {player.player_name}
                        </Link>
                      </td>

                      <TableValue
                        value={player.games_played}
                      />
                      <TableValue
                        value={formatNumber(
                          player.ppg
                        )}
                        bold
                      />
                      <TableValue
                        value={formatNumber(
                          player.rpg
                        )}
                      />
                      <TableValue
                        value={formatNumber(
                          player.apg
                        )}
                      />
                      <TableValue
                        value={formatPct(
                          player.fg_pct
                        )}
                      />
                      <TableValue
                        value={formatPct(
                          player.three_pct
                        )}
                      />
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Panel>


        {/* RECENT / UPCOMING */}

        <div className="grid gap-5">
          <Panel
            eyebrow="Results"
            title="Recent Games"
          >
            <div className="space-y-2">
              {recentGames.length ? (
                recentGames.map(
                  (game: any) => (
                    <TeamGameRow
                      key={game.id}
                      game={game}
                      teamId={id}
                    />
                  )
                )
              ) : (
                <EmptyText text="No recent games." />
              )}
            </div>
          </Panel>

          <Panel
            eyebrow="Schedule"
            title="Upcoming Games"
          >
            <div className="space-y-2">
              {upcomingGames.length ? (
                upcomingGames.map(
                  (game: any) => (
                    <TeamGameRow
                      key={game.id}
                      game={game}
                      teamId={id}
                    />
                  )
                )
              ) : (
                <EmptyText text="No scheduled games." />
              )}
            </div>
          </Panel>
        </div>

      </div>


      {/* HEAD TO HEAD */}

      <section className="mt-5">
        <Panel
          eyebrow="Matchups"
          title="Head-to-Head Record"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {headToHead.map(
              (row: any) => (
                <Link
                  key={row.opponentId}
                  href={`/teams/${row.opponentId}`}
                  className="rounded-2xl border p-4 transition hover:-translate-y-0.5"
                  style={{
                    borderColor:
                      "var(--border)",
                    background:
                      "var(--surface)",
                  }}
                >
                  <p className="truncate font-black">
                    {row.opponentName}
                  </p>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-2xl font-black">
                      {row.wins}-{row.losses}
                    </p>

                    <p
                      className="text-xs font-bold"
                      style={{
                        color:
                          "var(--muted-foreground)",
                      }}
                    >
                      {row.pointsFor}-{row.pointsAgainst} pts
                    </p>
                  </div>
                </Link>
              )
            )}

            {!headToHead.length && (
              <EmptyText text="No completed head-to-head games yet." />
            )}
          </div>
        </Panel>
      </section>


      {/* SEASON HISTORY */}

      <section className="mt-5">
        <Panel
          eyebrow="History"
          title="Season Records"
        >
          <div className="grid gap-3">
            {standings.map(
              (row: any) => (
                <div
                  key={row.season_id}
                  className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_repeat(5,85px)] sm:items-center"
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
                    <p
                      className="mt-1 text-xs"
                      style={{
                        color:
                          "var(--muted-foreground)",
                      }}
                    >
                      {coastLabel(
                        row.division
                      )} Division
                    </p>
                  </div>

                  <HistoryValue
                    label="GP"
                    value={row.games_played}
                  />
                  <HistoryValue
                    label="W"
                    value={row.wins}
                  />
                  <HistoryValue
                    label="L"
                    value={row.losses}
                  />
                  <HistoryValue
                    label="PF"
                    value={row.points_for}
                  />
                  <HistoryValue
                    label="+/-"
                    value={signed(
                      row.point_diff
                    )}
                  />
                </div>
              )
            )}
          </div>
        </Panel>
      </section>

    </main>
  );
}


function aggregateTeamStats(
  rows: any[],
  standing: any
) {
  const gameCount =
    rows.length ||
    numberValue(
      standing?.games_played
    );

  const sum =
    (key: string) =>
      rows.reduce(
        (total, row) =>
          total +
          numberValue(
            row[key]
          ),
        0
      );

  const fgMade =
    sum("fg_made");

  const fgAtt =
    sum("fg_attempted");

  const threeMade =
    sum("three_made");

  const threeAtt =
    sum("three_attempted");

  return {
    ppg:
      gameCount
        ? (
            rows.length
              ? sum("points")
              : numberValue(
                  standing?.points_for
                )
          ) /
          gameCount
        : 0,

    rpg:
      gameCount
        ? sum("rebounds") /
          gameCount
        : 0,

    apg:
      gameCount
        ? sum("assists") /
          gameCount
        : 0,

    fgPct:
      fgAtt
        ? (fgMade /
            fgAtt) *
          100
        : 0,

    threePct:
      threeAtt
        ? (threeMade /
            threeAtt) *
          100
        : 0,
  };
}


function buildHeadToHead(
  games: any[],
  teamId: string
) {
  const map =
    new Map<string, any>();

  games.forEach(
    (game) => {
      const info =
        teamGamePerspective(
          game,
          teamId
        );

      if (
        !info.opponentId
      ) {
        return;
      }

      const current =
        map.get(
          info.opponentId
        ) ?? {
          opponentId:
            info.opponentId,
          opponentName:
            info.opponentName,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        };

      if (
        info.result ===
        "W"
      ) {
        current.wins += 1;
      } else if (
        info.result ===
        "L"
      ) {
        current.losses += 1;
      }

      current.pointsFor +=
        info.ownScore;

      current.pointsAgainst +=
        info.opponentScore;

      map.set(
        info.opponentId,
        current
      );
    }
  );

  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      b.wins -
        a.wins ||
      (
        b.pointsFor -
        b.pointsAgainst
      ) -
        (
          a.pointsFor -
          a.pointsAgainst
        )
  );
}


function teamGamePerspective(
  game: any,
  teamId: string
) {
  const home =
    game.home_team_id ===
    teamId;

  const opponent =
    home
      ? game.away_team
      : game.home_team;

  const ownScore =
    numberValue(
      home
        ? game.home_score
        : game.away_score
    );

  const opponentScore =
    numberValue(
      home
        ? game.away_score
        : game.home_score
    );

  const result =
    game.status !==
    "finished"
      ? "—"
      : ownScore >
        opponentScore
      ? "W"
      : ownScore <
        opponentScore
      ? "L"
      : "D";

  return {
    opponentId:
      opponent?.id ??
      null,

    opponentName:
      opponent?.name ??
      "Unknown",

    ownScore,
    opponentScore,
    result,

    score:
      game.status ===
      "finished"
        ? `${ownScore}-${opponentScore}`
        : formatTime(
            game.game_time
          ),
  };
}


function topPlayer(
  roster: any[],
  key: string
) {
  return (
    roster
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
      )[0] ??
    null
  );
}


function TeamGameRow({
  game,
  teamId,
}: {
  game: any;
  teamId: string;
}) {
  const info =
    teamGamePerspective(
      game,
      teamId
    );

  return (
    <div
      className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--surface)",
      }}
    >
      <div>
        <p className="text-xs font-black">
          {formatShortDate(
            game.game_date
          )}
        </p>
        <p
          className="mt-0.5 text-[10px]"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {game.game_time ?? "—"}
        </p>
      </div>

      <div className="min-w-0">
        {info.opponentId ? (
          <Link
            href={`/teams/${info.opponentId}`}
            className="block truncate font-black hover:underline"
          >
            {info.opponentName}
          </Link>
        ) : (
          <p className="truncate font-black">
            {info.opponentName}
          </p>
        )}

        <p
          className="mt-0.5 truncate text-xs"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {game.venue || "Venue TBC"}
        </p>
      </div>

      <span
        className="rounded-lg px-2.5 py-1 text-xs font-black"
        style={{
          background:
            info.result === "W"
              ? "color-mix(in srgb, #16a34a 15%, var(--card))"
              : info.result === "L"
              ? "color-mix(in srgb, var(--danger) 12%, var(--card))"
              : "var(--card)",

          color:
            info.result === "W"
              ? "#16a34a"
              : info.result === "L"
              ? "var(--danger)"
              : "var(--foreground)",
        }}
      >
        {info.result !==
          "—" &&
          `${info.result} `}
        {info.score}
      </span>
    </div>
  );
}


function LeaderCard({
  label,
  player,
  statKey,
  suffix,
}: {
  label: string;
  player: any;
  statKey: string;
  suffix: string;
}) {
  if (!player) {
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
        <p
          className="text-xs font-black uppercase tracking-wide"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          {label}
        </p>
        <p className="mt-3 font-black">
          —
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/players/${player.player_id}`}
      className="rounded-2xl border p-4 transition hover:-translate-y-0.5"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--surface)",
      }}
    >
      <p
        className="text-xs font-black uppercase tracking-wide"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {label}
      </p>

      <p className="mt-2 truncate font-black">
        #{player.jersey_number ?? "—"}{" "}
        {player.player_name}
      </p>

      <p
        className="mt-2 text-2xl font-black"
        style={{
          color:
            "var(--primary)",
        }}
      >
        {formatNumber(
          player[statKey]
        )}
      </p>

      <p
        className="text-[10px] font-black uppercase tracking-wide"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {suffix}
      </p>
    </Link>
  );
}


function HeroMetric({
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
      className="min-w-[105px] rounded-2xl border p-4 text-center"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--surface)",
      }}
    >
      <p className="text-2xl font-black">
        {value}
      </p>
      <p
        className="mt-1 text-[10px] font-black uppercase tracking-wide"
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


function MetricCard({
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
        className="text-xs font-black uppercase tracking-wide"
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
    </div>
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


function TableValue({
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


function HistoryValue({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="sm:text-center">
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


function winPercentage(
  standing: any
) {
  const games =
    numberValue(
      standing?.games_played
    );

  return games
    ? (
        numberValue(
          standing?.wins
        ) /
        games
      ) *
        100
    : 0;
}


function formatNumber(
  value: unknown
) {
  return numberValue(
    value
  ).toFixed(1);
}


function formatPct(
  value: unknown
) {
  return `${numberValue(
    value
  ).toFixed(1)}%`;
}


function signed(
  value: unknown
) {
  const number =
    numberValue(value);

  return number > 0
    ? `+${number}`
    : String(number);
}


function coastLabel(
  value:
    | string
    | null
    | undefined
) {
  if (
    value ===
    "西岸"
  ) {
    return "West";
  }

  if (
    value ===
    "東岸"
  ) {
    return "East";
  }

  return value ?? "League";
}


function formatShortDate(
  value: string
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
    }
  ).format(date);
}


function formatTime(
  value:
    | string
    | null
) {
  return value || "TBC";
}
