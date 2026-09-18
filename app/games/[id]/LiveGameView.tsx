"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LiveGameView({
  initialGame,
  initialPlayerStats,
  initialEvents,
  roster,
}: {
  initialGame: any;
  initialPlayerStats: any[];
  initialEvents: any[];
  roster: any[];
}) {
  const [game, setGame] = useState(initialGame);
  const [playerStats, setPlayerStats] =
    useState(initialPlayerStats);

  const [events, setEvents] =
    useState(initialEvents);

  const [displayClock, setDisplayClock] =
    useState(initialGame.clock_seconds ?? 0);

  const refreshStats = useCallback(async () => {
    const { data: stats } = await supabase
      .from("player_game_stats")
      .select(`
        id,
        team_id,
        player_id,
        side,
        jersey_number,
        minutes_text,
        plus_minus,

        points,

        two_made,
        two_attempted,

        three_made,
        three_attempted,

        ft_made,
        ft_attempted,

        rebounds,
        offensive_rebounds,
        defensive_rebounds,

        assists,
        steals,
        blocks,
        turnovers,
        fouls,
        efficiency,

        player:players(
          id,
          name
        )
      `)
      .eq("game_id", initialGame.id)
      .order("points", {
        ascending: false,
      });

    setPlayerStats(stats ?? []);
  }, [initialGame.id]);

  const refreshEvents = useCallback(async () => {
    const { data } = await supabase
      .from("game_events")
      .select(`
        id,
        sequence_no,
        event_type,
        team_id,
        player_id,
        period,
        clock_seconds,
        points,
        reversed_at
      `)
      .eq("game_id", initialGame.id)
      .order("sequence_no", {
        ascending: false,
      })
      .limit(20);

    setEvents(data ?? []);
  }, [initialGame.id]);

  /*
   * REALTIME
   *
   * 1. games updates scoreboard / period / clock
   * 2. game_events updates play-by-play + box score
   */
  useEffect(() => {
    const channel = supabase
      .channel(`public-game-${initialGame.id}`)

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${initialGame.id}`,
        },
        (payload) => {
          const updated: any = payload.new;

          setGame((previous: any) => ({
            ...previous,
            ...updated,
          }));

          if (
            updated.clock_seconds !== null &&
            updated.clock_seconds !== undefined
          ) {
            setDisplayClock(updated.clock_seconds);
          }
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_events",
          filter: `game_id=eq.${initialGame.id}`,
        },
        async () => {
          await Promise.all([
            refreshStats(),
            refreshEvents(),
          ]);
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    initialGame.id,
    refreshEvents,
    refreshStats,
  ]);

  /*
   * PUBLIC CLOCK
   *
   * The browser ticks locally between server syncs.
   */
  useEffect(() => {
    if (game.status !== "live") return;
    if (!game.clock_running) return;

    const timer = setInterval(() => {
      setDisplayClock((current: number) => {
        if (current <= 0) {
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    game.status,
    game.clock_running,
  ]);

  const homeTeam: any = game.home_team;
  const awayTeam: any = game.away_team;

  const homePlayers =
    playerStats.filter(
      (row) =>
        row.team_id === game.home_team_id
    );

  const awayPlayers =
    playerStats.filter(
      (row) =>
        row.team_id === game.away_team_id
    );

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">

      <Link
        href="/games"
        className="text-sm text-zinc-400 hover:text-white"
      >
        ← All Games
      </Link>

      {/* LIVE SCOREBOARD */}

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

        <div className="flex items-center justify-between">

          <div className="text-sm text-zinc-400">
            {game.game_date}

            {game.game_time
              ? ` · ${game.game_time}`
              : ""}
          </div>

          <GameStatus status={game.status} />

        </div>

        {game.status === "live" && (
          <div className="mt-6 text-center">

            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">
              {periodLabel(
                game.current_period
              )}
            </p>

            <p className="mt-2 font-mono text-4xl font-black">
              {formatClock(displayClock)}
            </p>

          </div>
        )}

        <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-8">

          {/* HOME */}

          <div>

            <p className="text-sm uppercase text-zinc-500">
              Home
            </p>

            <Link
              href={`/teams/${game.home_team_id}`}
              className="mt-2 block text-2xl font-black hover:underline"
            >
              {homeTeam?.name}
            </Link>

          </div>


          {/* SCORE */}

          <div className="flex items-center gap-6 text-6xl font-black">

            <span>
              {game.home_score ?? 0}
            </span>

            <span className="text-zinc-700">
              -
            </span>

            <span>
              {game.away_score ?? 0}
            </span>

          </div>


          {/* AWAY */}

          <div className="text-right">

            <p className="text-sm uppercase text-zinc-500">
              Away
            </p>

            <Link
              href={`/teams/${game.away_team_id}`}
              className="mt-2 block text-2xl font-black hover:underline"
            >
              {awayTeam?.name}
            </Link>

          </div>

        </div>

        {game.venue && (
          <p className="mt-8 text-center text-sm text-zinc-500">
            {game.venue}
          </p>
        )}

      </section>


      {/* QUARTER SCORES */}

      <section className="mt-8">

        <h2 className="mb-4 text-xl font-bold">
          Score by Quarter
        </h2>

        <div className="overflow-hidden rounded-xl border border-zinc-800">

          <table className="w-full text-center">

            <thead className="bg-zinc-900 text-sm text-zinc-400">

              <tr>
                <th className="px-5 py-4 text-left">
                  Team
                </th>

                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th>Q4</th>

                <th>
                  Total
                </th>
              </tr>

            </thead>

            <tbody>

              <QuarterRow
                name={homeTeam?.name}
                values={[
                  game.q1_home,
                  game.q2_home,
                  game.q3_home,
                  game.q4_home,
                ]}
                total={game.home_score}
              />

              <QuarterRow
                name={awayTeam?.name}
                values={[
                  game.q1_away,
                  game.q2_away,
                  game.q3_away,
                  game.q4_away,
                ]}
                total={game.away_score}
              />

            </tbody>

          </table>

        </div>

      </section>


      {/* PLAY BY PLAY */}

      {game.status === "live" && (
        <section className="mt-10">

          <div className="flex items-center justify-between">

            <h2 className="text-2xl font-bold">
              Live Play-by-Play
            </h2>

            <span className="flex items-center gap-2 text-sm text-zinc-400">

              <span className="h-2 w-2 rounded-full bg-red-500" />

              Live

            </span>

          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">

            {events.length === 0 && (
              <p className="p-6 text-zinc-500">
                Waiting for the first event...
              </p>
            )}

            {events.map((event) => {
              const rosterPlayer =
                roster.find(
                  (row) =>
                    row.player?.id ===
                    event.player_id
                );

              return (
                <div
                  key={event.id}
                  className={`flex items-center justify-between border-b border-zinc-800 px-5 py-4 last:border-0 ${
                    event.reversed_at
                      ? "opacity-30 line-through"
                      : ""
                  }`}
                >

                  <div>

                    <p className="font-semibold">
                      {eventLabel(
                        event.event_type
                      )}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {rosterPlayer?.player
                        ?.name ??
                        "Unknown Player"}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="font-mono">
                      {periodLabel(
                        event.period
                      )}
                      {" · "}
                      {formatClock(
                        event.clock_seconds ??
                          0
                      )}
                    </p>

                    {event.points > 0 && (
                      <p className="mt-1 text-sm font-bold">
                        +{event.points}
                      </p>
                    )}

                  </div>

                </div>
              );
            })}

          </div>

        </section>
      )}


      {/* HOME BOX SCORE */}

      <BoxScore
        teamName={homeTeam?.name}
        players={homePlayers}
      />


      {/* AWAY BOX SCORE */}

      <BoxScore
        teamName={awayTeam?.name}
        players={awayPlayers}
      />

    </main>
  );
}


function BoxScore({
  teamName,
  players,
}: {
  teamName: string;
  players: any[];
}) {
  return (
    <section className="mt-10">

      <h2 className="mb-4 text-2xl font-bold">
        {teamName}
      </h2>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">

        <table className="min-w-[1050px] w-full text-sm">

          <thead className="bg-zinc-900 text-zinc-400">

            <tr>

              <th className="px-4 py-4 text-left">
                Player
              </th>

              <th>PTS</th>
              <th>2PT</th>
              <th>3PT</th>
              <th>FT</th>
              <th>REB</th>
              <th>AST</th>
              <th>STL</th>
              <th>BLK</th>
              <th>TO</th>
              <th>PF</th>

            </tr>

          </thead>

          <tbody>

            {players.map((row) => (
              <tr
                key={row.id}
                className="border-t border-zinc-800"
              >

                <td className="px-4 py-4">

                  <Link
                    href={`/players/${row.player?.id}`}
                    className="font-semibold hover:underline"
                  >
                    {row.jersey_number !==
                    null
                      ? `#${row.jersey_number} `
                      : ""}

                    {row.player?.name}
                  </Link>

                </td>

                <Cell value={row.points} />

                <Cell
                  value={`${row.two_made ?? 0}-${row.two_attempted ?? 0}`}
                />

                <Cell
                  value={`${row.three_made ?? 0}-${row.three_attempted ?? 0}`}
                />

                <Cell
                  value={`${row.ft_made ?? 0}-${row.ft_attempted ?? 0}`}
                />

                <Cell value={row.rebounds} />
                <Cell value={row.assists} />
                <Cell value={row.steals} />
                <Cell value={row.blocks} />
                <Cell value={row.turnovers} />
                <Cell value={row.fouls} />

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </section>
  );
}


function Cell({
  value,
}: {
  value: any;
}) {
  return (
    <td className="px-3 py-4 text-center">
      {value ?? 0}
    </td>
  );
}


function QuarterRow({
  name,
  values,
  total,
}: {
  name: string;
  values: any[];
  total: number;
}) {
  return (
    <tr className="border-t border-zinc-800">

      <td className="px-5 py-4 text-left font-semibold">
        {name}
      </td>

      {values.map((value, index) => (
        <td
          key={index}
          className="px-4 py-4"
        >
          {value ?? 0}
        </td>
      ))}

      <td className="font-black">
        {total ?? 0}
      </td>

    </tr>
  );
}


function GameStatus({
  status,
}: {
  status: string;
}) {
  if (status === "live") {
    return (
      <span className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold uppercase text-white">
        ● Live
      </span>
    );
  }

  if (status === "finished") {
    return (
      <span className="rounded-full bg-zinc-700 px-4 py-2 text-xs font-bold uppercase">
        Final
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-600 px-4 py-2 text-xs font-bold uppercase text-black">
      Scheduled
    </span>
  );
}


function formatClock(seconds: number) {
  const safe = Math.max(
    0,
    seconds ?? 0
  );

  const minutes =
    Math.floor(safe / 60);

  const secs =
    safe % 60;

  return `${minutes}:${secs
    .toString()
    .padStart(2, "0")}`;
}


function periodLabel(period: number) {
  if (!period || period === 1) return "Q1";
  if (period === 2) return "Q2";
  if (period === 3) return "Q3";
  if (period === 4) return "Q4";
  if (period === 5) return "Q5";

  return "Q5";
}


function eventLabel(type: string) {
  const labels: Record<
    string,
    string
  > = {
    free_throw_made:
      "Free Throw Made",

    free_throw_missed:
      "Free Throw Missed",

    two_point_made:
      "2PT Made",

    two_point_missed:
      "2PT Missed",

    three_point_made:
      "3PT Made",

    three_point_missed:
      "3PT Missed",

    rebound:
      "Rebound",

    assist:
      "Assist",

    steal:
      "Steal",

    block:
      "Block",

    turnover:
      "Turnover",

    foul:
      "Foul",
  };

  return labels[type] ?? type;
}