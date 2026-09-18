"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const DEFAULT_PLAYLIST_ID = "PLf2iwi2R4tYQi-heCgPIHio1rRosI--H4";

type League = { id: string; name: string };
type Season = {
  id: string;
  name: string;
  season_year: number | null;
  league_id: string | null;
};
type Team = { id: string; name: string; logo_path: string | null };
type Game = {
  id: string;
  season_id: string;
  game_date: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
};
type Highlight = {
  id: string;
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  season_id: string | null;
  game_id: string | null;
  playlist_id: string | null;
  created_at: string;
};
type HighlightTeam = { highlight_id: string; team_id: string };

export default function HighlightsPage() {
  const playerSectionRef = useRef<HTMLElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightTeams, setHighlightTeams] = useState<HighlightTeam[]>([]);

  const [leagueId, setLeagueId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [selectedHighlightId, setSelectedHighlightId] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const [
        leagueResult,
        seasonResult,
        teamResult,
        gameResult,
        highlightResult,
        linkResult,
      ] = await Promise.all([
        supabase.from("leagues").select("id,name").order("name"),
        supabase
          .from("seasons")
          .select("id,name,season_year,league_id")
          .order("season_year", { ascending: false, nullsFirst: false }),
        supabase.from("teams").select("id,name,logo_path").order("name"),
        supabase
          .from("games")
          .select(
            "id,season_id,game_date,home_team_id,away_team_id,home_score,away_score"
          )
          .order("game_date", { ascending: false }),
        supabase
          .from("highlights")
          .select(
            "id,youtube_video_id,youtube_url,title,season_id,game_id,playlist_id,created_at"
          )
          .order("created_at", { ascending: false }),
        supabase.from("highlight_teams").select("highlight_id,team_id"),
      ]);

      const failure =
        leagueResult.error ||
        seasonResult.error ||
        teamResult.error ||
        gameResult.error ||
        highlightResult.error ||
        linkResult.error;

      if (failure) {
        setError(failure.message);
        setLoading(false);
        return;
      }

      setLeagues((leagueResult.data ?? []) as League[]);
      setSeasons((seasonResult.data ?? []) as Season[]);
      setTeams((teamResult.data ?? []) as Team[]);
      setGames((gameResult.data ?? []) as Game[]);
      setHighlights((highlightResult.data ?? []) as Highlight[]);
      setHighlightTeams((linkResult.data ?? []) as HighlightTeam[]);
      setLoading(false);
    }

    void load();
  }, []);

  const filteredSeasons = useMemo(
    () =>
      leagueId
        ? seasons.filter((season) => season.league_id === leagueId)
        : seasons,
    [leagueId, seasons]
  );

  const scopeSeasonIds = useMemo(() => {
    if (seasonId) return new Set([seasonId]);

    if (leagueId) {
      return new Set(
        seasons
          .filter((season) => season.league_id === leagueId)
          .map((season) => season.id)
      );
    }

    return null;
  }, [leagueId, seasonId, seasons]);

  const allowedTeamIds = useMemo(() => {
    if (!scopeSeasonIds) return null;

    const ids = new Set<string>();
    for (const game of games) {
      if (scopeSeasonIds.has(game.season_id)) {
        ids.add(game.home_team_id);
        ids.add(game.away_team_id);
      }
    }
    return ids;
  }, [games, scopeSeasonIds]);

  const filteredTeams = useMemo(
    () =>
      allowedTeamIds
        ? teams.filter((team) => allowedTeamIds.has(team.id))
        : teams,
    [allowedTeamIds, teams]
  );

  const teamIdsByHighlight = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const row of highlightTeams) {
      if (!map.has(row.highlight_id)) {
        map.set(row.highlight_id, new Set());
      }
      map.get(row.highlight_id)?.add(row.team_id);
    }

    return map;
  }, [highlightTeams]);

  const scopedHighlights = useMemo(() => {
    return highlights.filter((highlight) => {
      if (seasonId && highlight.season_id !== seasonId) return false;

      if (leagueId && !seasonId) {
        const season = seasons.find((row) => row.id === highlight.season_id);
        if (!season || season.league_id !== leagueId) return false;
      }

      return true;
    });
  }, [highlights, leagueId, seasonId, seasons]);

  const team2Options = useMemo(() => {
    if (!team1Id) {
      return filteredTeams;
    }

    const opponentIds = new Set<string>();

    for (const highlight of scopedHighlights) {
      const ids = teamIdsByHighlight.get(highlight.id);
      if (!ids?.has(team1Id)) continue;

      for (const id of ids) {
        if (id !== team1Id) opponentIds.add(id);
      }
    }

    return filteredTeams.filter(
      (team) => team.id !== team1Id && opponentIds.has(team.id)
    );
  }, [filteredTeams, scopedHighlights, team1Id, teamIdsByHighlight]);

  const visibleHighlights = useMemo(() => {
    return scopedHighlights.filter((highlight) => {
      const ids = teamIdsByHighlight.get(highlight.id);

      if (team1Id && !ids?.has(team1Id)) return false;
      if (team2Id && !ids?.has(team2Id)) return false;

      return true;
    });
  }, [scopedHighlights, team1Id, team2Id, teamIdsByHighlight]);

  const selectedHighlight = useMemo(
    () =>
      selectedHighlightId
        ? highlights.find((highlight) => highlight.id === selectedHighlightId) ?? null
        : null,
    [highlights, selectedHighlightId]
  );

  function linkedTeams(highlightId: string) {
    const ids = teamIdsByHighlight.get(highlightId) ?? new Set<string>();
    return teams.filter((team) => ids.has(team.id));
  }

  function gameFor(highlight: Highlight) {
    return highlight.game_id
      ? games.find((game) => game.id === highlight.game_id) ?? null
      : null;
  }

  function playHighlight(highlight: Highlight) {
    setSelectedHighlightId(highlight.id);

    window.requestAnimationFrame(() => {
      playerSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function clearFilters() {
    setLeagueId("");
    setSeasonId("");
    setTeam1Id("");
    setTeam2Id("");
  }

  const selectedGame = selectedHighlight ? gameFor(selectedHighlight) : null;
  const selectedHome = selectedGame
    ? teams.find((team) => team.id === selectedGame.home_team_id) ?? null
    : null;
  const selectedAway = selectedGame
    ? teams.find((team) => team.id === selectedGame.away_team_id) ?? null
    : null;

  const playerSrc = selectedHighlight
    ? `https://www.youtube.com/embed/${selectedHighlight.youtube_video_id}?autoplay=1&rel=0`
    : `https://www.youtube.com/embed/videoseries?list=${DEFAULT_PLAYLIST_ID}`;

  const hasFilters = Boolean(leagueId || seasonId || team1Id || team2Id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <section
        ref={playerSectionRef}
        className="scroll-mt-24 overflow-hidden rounded-[2rem] border"
        style={{
          borderColor: "var(--border)",
          background: "var(--card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className={
            selectedHighlight
              ? "grid gap-0 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)] lg:items-center"
              : "grid gap-0 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)] lg:items-center"
          }
        >
          <div className="min-w-0 p-5 sm:p-7 lg:p-8">
            <p
              className="text-xs font-black uppercase tracking-[0.2em] sm:text-sm"
              style={{ color: "var(--primary)" }}
            >
              {selectedHighlight ? "Now Playing" : "OBS Video"}
            </p>

            <h1
              className={
                selectedHighlight
                  ? "mt-3 max-w-full break-words text-2xl font-black leading-[1.08] tracking-tight sm:text-3xl lg:text-[2rem] xl:text-[2.25rem]"
                  : "mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl"
              }
              style={{ overflowWrap: "anywhere" }}
            >
              {selectedHighlight ? selectedHighlight.title : "YouTube Highlights"}
            </h1>

            {selectedHighlight ? (
              <>
                {selectedGame && (
                  <div
                    className="mt-4 rounded-xl border px-4 py-3"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <p
                      className="text-xs font-black uppercase tracking-[0.14em]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {formatDate(selectedGame.game_date)}
                    </p>
                    <p className="mt-1 text-sm font-black leading-6 sm:text-base">
                      {selectedHome?.name ?? "Home"}{" "}
                      <span style={{ color: "var(--primary)" }}>
                        {selectedGame.home_score ?? "–"}–{selectedGame.away_score ?? "–"}
                      </span>{" "}
                      {selectedAway?.name ?? "Away"}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedHighlightId("")}
                    className="rounded-xl border px-4 py-2.5 text-sm font-black"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--primary)",
                    }}
                  >
                    ← Playlist
                  </button>

                  <a
                    href={selectedHighlight.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl px-4 py-2.5 text-sm font-black text-white"
                    style={{ background: "var(--primary)" }}
                  >
                    YouTube ↗
                  </a>
                </div>
              </>
            ) : (
              <>
                <p
                  className="mt-4 max-w-xl text-sm leading-6 sm:text-base sm:leading-7"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Watch Observation Basketball highlights here. Click any video below and the
                  player on this page will switch to that highlight.
                </p>

                <a
                  href={`https://www.youtube.com/playlist?list=${DEFAULT_PLAYLIST_ID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex rounded-xl px-5 py-3 font-black text-white"
                  style={{ background: "var(--primary)" }}
                >
                  Open Full Playlist ↗
                </a>
              </>
            )}
          </div>

          <div className="min-w-0 bg-black lg:p-0">
            <div className="aspect-video w-full overflow-hidden bg-black">
              <iframe
                key={playerSrc}
                className="block h-full w-full"
                src={playerSrc}
                title={selectedHighlight?.title ?? "OBS YouTube Highlights Playlist"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="mt-6 rounded-2xl border p-4 sm:p-5"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="League"
            value={leagueId}
            onChange={(value) => {
              setLeagueId(value);
              setSeasonId("");
              setTeam1Id("");
              setTeam2Id("");
            }}
            options={leagues.map((league) => ({
              value: league.id,
              label: league.name,
            }))}
            allLabel="All Leagues"
          />

          <FilterSelect
            label="Season"
            value={seasonId}
            onChange={(value) => {
              setSeasonId(value);
              setTeam1Id("");
              setTeam2Id("");
            }}
            options={filteredSeasons.map((season) => ({
              value: season.id,
              label: `${season.name}${season.season_year ? ` · ${season.season_year}` : ""}`,
            }))}
            allLabel="All Seasons"
          />

          <FilterSelect
            label="Team 1"
            value={team1Id}
            onChange={(value) => {
              setTeam1Id(value);
              setTeam2Id("");
            }}
            options={filteredTeams.map((team) => ({
              value: team.id,
              label: team.name,
            }))}
            allLabel="Any Team"
          />

          <FilterSelect
            label="Team 2"
            value={team2Id}
            onChange={setTeam2Id}
            options={team2Options.map((team) => ({
              value: team.id,
              label: team.name,
            }))}
            allLabel={team1Id ? "Any Opponent" : "Any Team"}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {team1Id && team2Id
              ? `Showing the exact matchup: ${
                  teams.find((team) => team.id === team1Id)?.name ?? "Team 1"
                } vs ${teams.find((team) => team.id === team2Id)?.name ?? "Team 2"}.`
              : team1Id
              ? `Showing all highlights involving ${
                  teams.find((team) => team.id === team1Id)?.name ?? "the selected team"
                }.`
              : "Choose one team for all of its videos, or choose two teams for an exact matchup."}
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 rounded-xl border px-4 py-2 text-sm font-black"
              style={{ borderColor: "var(--border)", color: "var(--primary)" }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
          {error}
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{ color: "var(--primary)" }}
            >
              Linked Highlights
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {loading ? "Loading…" : `${visibleHighlights.length} videos`}
            </h2>
          </div>
        </div>

        {!loading && visibleHighlights.length === 0 ? (
          <div
            className="mt-4 rounded-2xl border border-dashed p-10 text-center"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            No linked highlights match these filters yet. Try another matchup or clear the
            filters.
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleHighlights.map((highlight) => {
              const linked = linkedTeams(highlight.id);
              const game = gameFor(highlight);
              const home = game
                ? teams.find((team) => team.id === game.home_team_id)
                : null;
              const away = game
                ? teams.find((team) => team.id === game.away_team_id)
                : null;
              const isPlaying = selectedHighlightId === highlight.id;

              return (
                <article
                  key={highlight.id}
                  className="overflow-hidden rounded-2xl border"
                  style={{
                    borderColor: isPlaying ? "var(--primary)" : "var(--border)",
                    background: "var(--card)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => playHighlight(highlight)}
                    className="group block w-full text-left"
                    aria-label={`Watch ${highlight.title} on this page`}
                  >
                    <div className="relative aspect-video overflow-hidden bg-black">
                      <img
                        src={`https://i.ytimg.com/vi/${highlight.youtube_video_id}/hqdefault.jpg`}
                        alt={highlight.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-black/30">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white shadow-xl">
                          ▶
                        </span>
                      </div>

                      <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">
                        {isPlaying ? "Playing now" : "Watch here"}
                      </span>
                    </div>
                  </button>

                  <div className="p-5">
                    <h3 className="text-lg font-black leading-snug">{highlight.title}</h3>

                    {game && (
                      <p
                        className="mt-2 text-sm font-bold"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {formatDate(game.game_date)} · {home?.name ?? "Home"}{" "}
                        {game.home_score ?? "–"}–{game.away_score ?? "–"}{" "}
                        {away?.name ?? "Away"}
                      </p>
                    )}

                    {linked.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {linked.map((team) => (
                          <Link
                            key={team.id}
                            href={`/teams/${team.id}`}
                            className="rounded-full border px-3 py-1 text-xs font-black hover:underline"
                            style={{
                              borderColor: "var(--border)",
                              color: "var(--primary)",
                            }}
                          >
                            {team.name}
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => playHighlight(highlight)}
                        className="rounded-xl px-4 py-2 text-sm font-black text-white"
                        style={{ background: "var(--primary)" }}
                      >
                        {isPlaying ? "Playing Above" : "Watch Here"}
                      </button>

                      <a
                        href={highlight.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border px-4 py-2 text-sm font-black"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        YouTube ↗
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <label>
      <span
        className="mb-2 block text-xs font-black uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border px-4 py-3 font-bold"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-HK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
