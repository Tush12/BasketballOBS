"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const DEFAULT_PLAYLIST_ID = "PLf2iwi2R4tYQi-heCgPIHio1rRosI--H4";

type Team = { id: string; name: string };
type Season = { id: string; name: string; season_year: number | null; league_id: string | null };
type Game = {
  id: string;
  season_id: string;
  game_date: string;
  game_time: string | null;
  status: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
};
type SeasonTeam = { season_id: string; team_id: string };
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

export default function ScorerHighlightsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightTeams, setHighlightTeams] = useState<HighlightTeam[]>([]);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [gameId, setGameId] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    async function initialise() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleError || !roleRow || roleRow.role !== "admin") {
        setError(roleError?.message ?? "Administrator access required.");
        setLoading(false);
        return;
      }

      setRole(roleRow.role);
      await loadAll();
    }

    void initialise();
  }, [router]);

  async function loadAll() {
    setLoading(true);

    const [teamResult, seasonResult, gameResult, membershipResult, highlightResult, linkResult] =
      await Promise.all([
        supabase.from("teams").select("id,name").order("name"),
        supabase
          .from("seasons")
          .select("id,name,season_year,league_id")
          .order("season_year", { ascending: false, nullsFirst: false }),
        supabase
          .from("games")
          .select("id,season_id,game_date,game_time,status,home_team_id,away_team_id,home_score,away_score")
          .order("game_date", { ascending: false })
          .order("game_time", { ascending: false }),
        supabase.from("season_teams").select("season_id,team_id"),
        supabase
          .from("highlights")
          .select("id,youtube_video_id,youtube_url,title,season_id,game_id,playlist_id,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("highlight_teams").select("highlight_id,team_id"),
      ]);

    const failure =
      teamResult.error ||
      seasonResult.error ||
      gameResult.error ||
      membershipResult.error ||
      highlightResult.error ||
      linkResult.error;

    if (failure) {
      setError(failure.message);
      setLoading(false);
      return;
    }

    const loadedSeasons = (seasonResult.data ?? []) as Season[];
    setTeams((teamResult.data ?? []) as Team[]);
    setSeasons(loadedSeasons);
    setGames((gameResult.data ?? []) as Game[]);
    setSeasonTeams((membershipResult.data ?? []) as SeasonTeam[]);
    setHighlights((highlightResult.data ?? []) as Highlight[]);
    setHighlightTeams((linkResult.data ?? []) as HighlightTeam[]);

    setSeasonId((current) => current || loadedSeasons[0]?.id || "");
    setLoading(false);
  }

  const seasonGames = useMemo(
    () => games.filter((game) => !seasonId || game.season_id === seasonId),
    [games, seasonId]
  );

  const seasonTeamIds = useMemo(
    () => new Set(seasonTeams.filter((row) => row.season_id === seasonId).map((row) => row.team_id)),
    [seasonId, seasonTeams]
  );

  const availableTeams = useMemo(
    () => teams.filter((team) => !seasonId || seasonTeamIds.has(team.id)),
    [seasonId, seasonTeamIds, teams]
  );

  const selectedGame = useMemo(
    () => games.find((game) => game.id === gameId) ?? null,
    [gameId, games]
  );

  function selectGame(value: string) {
    setGameId(value);
    const game = games.find((row) => row.id === value);
    if (!game) return;

    setSeasonId(game.season_id);
    setTeamIds([game.home_team_id, game.away_team_id]);

    if (!title.trim()) {
      const home = teams.find((team) => team.id === game.home_team_id)?.name ?? "Home";
      const away = teams.find((team) => team.id === game.away_team_id)?.name ?? "Away";
      setTitle(`${home} vs ${away} Highlights`);
    }
  }

  function toggleTeam(teamId: string) {
    setTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId]
    );
  }

  function clearForm() {
    setYoutubeUrl("");
    setTitle("");
    setGameId("");
    setTeamIds([]);
    setEditingId(null);
  }

  async function saveHighlight(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const videoId = parseYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      setError("Paste a valid YouTube video URL (watch, youtu.be, Shorts or embed URL).");
      return;
    }

    if (!gameId && teamIds.length === 0) {
      setError("Select a game or at least one team so this video can be linked.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase.rpc("admin_upsert_highlight", {
      p_youtube_video_id: videoId,
      p_youtube_url: canonicalYouTubeUrl(videoId),
      p_title: title.trim() || null,
      p_game_id: gameId || null,
      p_season_id: seasonId || null,
      p_team_ids: teamIds,
      p_playlist_id: DEFAULT_PLAYLIST_ID,
    });

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setSuccess(editingId ? "Highlight updated and re-linked." : "Highlight linked successfully.");
    clearForm();
    await loadAll();
    setSaving(false);
  }

  function editHighlight(highlight: Highlight) {
    const linkedTeamIds = highlightTeams
      .filter((row) => row.highlight_id === highlight.id)
      .map((row) => row.team_id);

    setEditingId(highlight.id);
    setYoutubeUrl(highlight.youtube_url);
    setTitle(highlight.title);
    setSeasonId(highlight.season_id ?? "");
    setGameId(highlight.game_id ?? "");
    setTeamIds(linkedTeamIds);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteHighlight(highlight: Highlight) {
    if (!window.confirm(`Delete highlight link "${highlight.title}"?\n\nThis does not delete the video from YouTube.`)) {
      return;
    }

    setDeletingId(highlight.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.rpc("admin_delete_highlight", {
      p_highlight_id: highlight.id,
    });

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setSuccess("Highlight link deleted. The YouTube video itself was not changed.");
    await loadAll();
    setDeletingId(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><p>Loading highlights management…</p></main>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: "var(--primary)" }}>Administration</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">YouTube Highlights</h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--muted-foreground)" }}>
            Paste a YouTube link and select the game. The home and away teams are linked automatically.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border px-4 py-2 text-xs font-bold uppercase" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>{role}</span>
          <button type="button" onClick={logout} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--border)" }}>Sign Out</button>
        </div>
      </div>

      <nav className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border p-2 sm:flex sm:flex-wrap" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <AdminNav href="/scorer" label="Dashboard" />
        <AdminNav href="/scorer/games" label="Games" />
        <AdminNav href="/scorer/seasons" label="Seasons" />
        <AdminNav href="/scorer/teams" label="Teams" />
        <AdminNav href="/scorer/highlights" label="Highlights" active />
      </nav>

      {error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">{error}</div>}
      {success && <div className="mt-6 rounded-xl border border-green-900 bg-green-950/30 p-4 text-green-400">{success}</div>}

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={saveHighlight} className="rounded-2xl border p-5 sm:p-7" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: "var(--primary)" }}>{editingId ? "Update Link" : "Quick Link"}</p>
              <h2 className="mt-2 text-2xl font-black">{editingId ? "Edit Highlight" : "Add Highlight"}</h2>
            </div>
            {editingId && <button type="button" onClick={clearForm} className="text-sm font-black" style={{ color: "var(--muted-foreground)" }}>Cancel</button>}
          </div>

          <Field label="YouTube Video URL">
            <input
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              className="w-full rounded-xl border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
          </Field>

          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional — selecting a game can fill this automatically"
              className="w-full rounded-xl border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
          </Field>

          <Field label="Season">
            <select
              value={seasonId}
              onChange={(event) => {
                setSeasonId(event.target.value);
                setGameId("");
                setTeamIds([]);
              }}
              className="w-full rounded-xl border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <option value="">No season</option>
              {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.season_year ? ` · ${season.season_year}` : ""}</option>)}
            </select>
          </Field>

          <Field label="Game (fastest option)">
            <select
              value={gameId}
              onChange={(event) => selectGame(event.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <option value="">No specific game</option>
              {seasonGames.map((game) => {
                const home = teams.find((team) => team.id === game.home_team_id)?.name ?? "Home";
                const away = teams.find((team) => team.id === game.away_team_id)?.name ?? "Away";
                return <option key={game.id} value={game.id}>{game.game_date} · {home} {game.home_score ?? "–"}–{game.away_score ?? "–"} {away}</option>;
              })}
            </select>
            <p className="mt-2 text-xs leading-5" style={{ color: "var(--muted-foreground)" }}>
              Pick a game and both teams are selected automatically. In future, linking a new video can be just: paste URL → select game → save.
            </p>
          </Field>

          <Field label="Linked Teams">
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              {availableTeams.map((team) => (
                <label key={team.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5">
                  <input type="checkbox" checked={teamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} />
                  <span>{team.name}</span>
                </label>
              ))}
            </div>
          </Field>

          {selectedGame && (
            <div className="mt-5 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)", background: "var(--primary-soft)", color: "var(--primary)" }}>
              Game selected — home and away teams will be enforced server-side even if a checkbox is accidentally cleared.
            </div>
          )}

          <button type="submit" disabled={saving} className="mt-6 w-full rounded-xl px-5 py-3 font-black text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
            {saving ? "Saving…" : editingId ? "Save Changes" : "Link Highlight"}
          </button>
        </form>

        <section className="rounded-2xl border p-5 sm:p-7" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: "var(--primary)" }}>Current Links</p>
              <h2 className="mt-2 text-2xl font-black">Linked Videos</h2>
            </div>
            <Link href="/highlights" className="text-sm font-black hover:underline" style={{ color: "var(--primary)" }}>Public Page →</Link>
          </div>

          <div className="mt-5 space-y-3">
            {highlights.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>No videos linked yet.</div>
            ) : highlights.map((highlight) => {
              const linked = highlightTeams.filter((row) => row.highlight_id === highlight.id).map((row) => teams.find((team) => team.id === row.team_id)?.name).filter(Boolean);
              return (
                <div key={highlight.id} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[140px_1fr_auto] sm:items-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <a href={highlight.youtube_url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg bg-black">
                    <img src={`https://i.ytimg.com/vi/${highlight.youtube_video_id}/mqdefault.jpg`} alt={highlight.title} className="aspect-video h-full w-full object-cover" />
                  </a>
                  <div className="min-w-0">
                    <p className="font-black">{highlight.title}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{linked.join(" · ") || "No teams linked"}</p>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <button type="button" onClick={() => editHighlight(highlight)} className="rounded-lg border px-3 py-2 text-sm font-black" style={{ borderColor: "var(--border)", color: "var(--primary)" }}>Edit</button>
                    <button type="button" disabled={deletingId === highlight.id} onClick={() => void deleteHighlight(highlight)} className="rounded-lg border px-3 py-2 text-sm font-black disabled:opacity-50" style={{ borderColor: "var(--border)", color: "var(--danger)" }}>{deletingId === highlight.id ? "Deleting…" : "Delete"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-5 block">
      <span className="mb-2 block text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>{label}</span>
      {children}
    </label>
  );
}

function AdminNav({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-4 py-3 text-center text-sm font-black transition"
      style={{ background: active ? "var(--primary-soft)" : "transparent", color: active ? "var(--primary)" : "var(--foreground)" }}
    >
      {label}
    </Link>
  );
}

function parseYouTubeVideoId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return cleanVideoId(url.pathname.split("/").filter(Boolean)[0]);
    }

    if (host.endsWith("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) return cleanVideoId(watchId);

      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0] ?? "")) {
        return cleanVideoId(parts[1]);
      }
    }
  } catch {
    // Continue to plain-ID validation below.
  }

  return cleanVideoId(trimmed);
}

function cleanVideoId(value?: string | null) {
  if (!value) return null;
  const cleaned = value.split(/[?&#]/)[0].trim();
  return /^[A-Za-z0-9_-]{6,20}$/.test(cleaned) ? cleaned : null;
}

function canonicalYouTubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
