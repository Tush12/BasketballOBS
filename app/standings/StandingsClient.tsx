"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Standing = {
  team_id: string;
  team_name: string;

  games_played: number;
  wins: number;
  losses: number;

  points_for: number;
  points_against: number;
  point_diff: number;

  division: string | null;

  season_id: string;
  season_name: string;
  season_year: number | null;
};

type Season = {
  id: string;
  name: string;
  season_year: number | null;
};

type Coast = "west" | "east";

export default function StandingsClient({
  standings,
  seasons,
}: {
  standings: Standing[];
  seasons: Season[];
}) {
  /*
   * Default to the newest season.
   */

  const newestSeason =
    seasons.length > 0
      ? seasons[0].id
      : "";

  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState(newestSeason);

  const [
    selectedCoast,
    setSelectedCoast,
  ] = useState<Coast>("west");

  /*
   * Database values:
   *
   * 西岸 = West Coast
   * 東岸 = East Coast
   */

  const division =
    selectedCoast === "west"
      ? "西岸"
      : "東岸";

  const filteredStandings =
    useMemo(() => {
      return standings
        .filter(
          (row) =>
            row.season_id ===
              selectedSeason &&
            row.division ===
              division
        )
        .sort((a, b) => {
          /*
           * Ranking:
           *
           * 1. Wins
           * 2. Fewer losses
           * 3. Point differential
           * 4. Points scored
           */

          if (
            b.wins !== a.wins
          ) {
            return (
              b.wins -
              a.wins
            );
          }

          if (
            a.losses !==
            b.losses
          ) {
            return (
              a.losses -
              b.losses
            );
          }

          if (
            b.point_diff !==
            a.point_diff
          ) {
            return (
              b.point_diff -
              a.point_diff
            );
          }

          return (
            b.points_for -
            a.points_for
          );
        });
    }, [
      standings,
      selectedSeason,
      division,
    ]);

  const activeSeason =
    seasons.find(
      (season) =>
        season.id ===
        selectedSeason
    );

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">

      {/* HEADER */}

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="text-sm uppercase tracking-widest text-zinc-500">
            League
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Standings
          </h1>

          <p className="mt-2 text-zinc-400">
            View league standings by
            coast and season.
          </p>

        </div>


        {/* SEASON SELECTOR */}

        <div className="min-w-[180px]">

          <label className="mb-2 block text-sm font-medium text-zinc-400">
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
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-semibold outline-none focus:border-zinc-500"
          >

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
                  {
                    season.name
                  }
                </option>
              )
            )}

          </select>

        </div>

      </div>


      {/* WEST / EAST COAST */}

      <div className="mt-10 grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-800">

        <button
          type="button"
          onClick={() =>
            setSelectedCoast(
              "west"
            )
          }
          className={`px-6 py-5 text-lg font-bold transition ${
            selectedCoast ===
            "west"
              ? "bg-blue-600 text-white"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          West Coast
        </button>


        <button
          type="button"
          onClick={() =>
            setSelectedCoast(
              "east"
            )
          }
          className={`border-l border-zinc-800 px-6 py-5 text-lg font-bold transition ${
            selectedCoast ===
            "east"
              ? "bg-blue-600 text-white"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          East Coast
        </button>

      </div>


      {/* TABLE TITLE */}

      <div className="mt-8 flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-black">
            {selectedCoast ===
            "west"
              ? "West Coast"
              : "East Coast"}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Season{" "}
            {activeSeason?.name ??
              "-"}
          </p>

        </div>


        <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">

          {
            filteredStandings.length
          }{" "}
          teams

        </div>

      </div>


      {/* STANDINGS TABLE */}

      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-800">

        <table className="min-w-[900px] w-full">

          <thead className="bg-zinc-900">

            <tr className="text-sm uppercase tracking-wide text-zinc-500">

              <th className="px-5 py-4 text-center">
                #
              </th>

              <th className="px-5 py-4 text-left">
                Team
              </th>

              <th className="px-5 py-4 text-center">
                Season
              </th>

              <th className="px-5 py-4 text-center">
                GP
              </th>

              <th className="px-5 py-4 text-center">
                W
              </th>

              <th className="px-5 py-4 text-center">
                L
              </th>

              <th className="px-5 py-4 text-center">
                Win %
              </th>

              <th className="px-5 py-4 text-center">
                PF
              </th>

              <th className="px-5 py-4 text-center">
                PA
              </th>

              <th className="px-5 py-4 text-center">
                DIFF
              </th>

            </tr>

          </thead>


          <tbody>

            {filteredStandings.map(
              (
                row,
                index
              ) => {

                const winPct =
                  row.games_played >
                  0
                    ? (
                        (row.wins /
                          row.games_played) *
                        100
                      ).toFixed(1)
                    : "0.0";

                return (
                  <tr
                    key={`${row.season_id}-${row.team_id}`}
                    className="border-t border-zinc-800 transition hover:bg-zinc-900/70"
                  >

                    {/* RANK */}

                    <td className="px-5 py-5 text-center font-black text-zinc-500">
                      {
                        index +
                        1
                      }
                    </td>


                    {/* TEAM */}

                    <td className="px-5 py-5">

                      <Link
                        href={`/teams/${row.team_id}`}
                        className="text-base font-bold hover:underline"
                      >
                        {
                          row.team_name
                        }
                      </Link>

                    </td>


                    {/* SEASON */}

                    <td className="px-5 py-5 text-center text-zinc-400">
                      {
                        row.season_name
                      }
                    </td>


                    {/* GP */}

                    <td className="px-5 py-5 text-center">
                      {
                        row.games_played
                      }
                    </td>


                    {/* W */}

                    <td className="px-5 py-5 text-center font-bold">
                      {
                        row.wins
                      }
                    </td>


                    {/* L */}

                    <td className="px-5 py-5 text-center">
                      {
                        row.losses
                      }
                    </td>


                    {/* WIN % */}

                    <td className="px-5 py-5 text-center">
                      {
                        winPct
                      }%
                    </td>


                    {/* PF */}

                    <td className="px-5 py-5 text-center">
                      {
                        row.points_for
                      }
                    </td>


                    {/* PA */}

                    <td className="px-5 py-5 text-center">
                      {
                        row.points_against
                      }
                    </td>


                    {/* POINT DIFF */}

                    <td
                      className={`px-5 py-5 text-center font-bold ${
                        row.point_diff >
                        0
                          ? "text-green-400"
                          : row.point_diff <
                            0
                          ? "text-red-400"
                          : "text-zinc-400"
                      }`}
                    >

                      {row.point_diff >
                      0
                        ? "+"
                        : ""}

                      {
                        row.point_diff
                      }

                    </td>

                  </tr>
                );
              }
            )}


            {filteredStandings.length ===
              0 && (
              <tr>

                <td
                  colSpan={10}
                  className="px-6 py-16 text-center text-zinc-500"
                >
                  No standings
                  found for this
                  coast and season.
                </td>

              </tr>
            )}

          </tbody>

        </table>

      </div>


      {/* TABLE LEGEND */}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-600">

        <span>
          GP = Games Played
        </span>

        <span>
          W = Wins
        </span>

        <span>
          L = Losses
        </span>

        <span>
          PF = Points For
        </span>

        <span>
          PA = Points Against
        </span>

        <span>
          DIFF = Point Differential
        </span>

      </div>

    </main>
  );
}