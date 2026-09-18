"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Team = { id: string; name: string };
type Season = {
  id: string;
  name: string;
  season_year: number | null;
  league_id: string | null;
};
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
type PhotoAlbum = {
  id: string;
  title: string;
  drive_folder_id: string;
  drive_folder_url: string;
  season_id: string | null;
  game_id: string | null;
  created_at: string;
  updated_at: string;
};
type PhotoAlbumTeam = { album_id: string; team_id: string };
type AlbumSummary = {
  album_id: string;
  photo_count: number;
  cover_drive_file_id: string | null;
};

const EXAMPLE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1dC4CfX66l8D8VwrH52V8B_aQsLEQt5Hx";

export default function ScorerPhotosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [albumTeams, setAlbumTeams] = useState<PhotoAlbumTeam[]>([]);
  const [albumSummaries, setAlbumSummaries] = useState<AlbumSummary[]>([]);

  const [folderUrl, setFolderUrl] = useState("");
  const [title, setTitle] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [gameId, setGameId] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function initialise() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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

    const [
      teamResult,
      seasonResult,
      gameResult,
      membershipResult,
      albumResult,
      albumTeamResult,
      albumSummaryResult,
    ] = await Promise.all([
      supabase.from("teams").select("id,name").order("name"),
      supabase
        .from("seasons")
        .select("id,name,season_year,league_id")
        .order("season_year", { ascending: false, nullsFirst: false }),
      supabase
        .from("games")
        .select(
          "id,season_id,game_date,game_time,status,home_team_id,away_team_id,home_score,away_score"
        )
        .order("game_date", { ascending: false })
        .order("game_time", { ascending: false }),
      supabase.from("season_teams").select("season_id,team_id"),
      supabase
        .from("photo_albums")
        .select(
          "id,title,drive_folder_id,drive_folder_url,season_id,game_id,created_at,updated_at"
        )
        .order("updated_at", { ascending: false }),
      supabase.from("photo_album_teams").select("album_id,team_id"),
      supabase.rpc("get_public_photo_album_summaries"),
    ]);

    const failure =
      teamResult.error ||
      seasonResult.error ||
      gameResult.error ||
      membershipResult.error ||
      albumResult.error ||
      albumTeamResult.error ||
      albumSummaryResult.error;

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
    setAlbums((albumResult.data ?? []) as PhotoAlbum[]);
    setAlbumTeams((albumTeamResult.data ?? []) as PhotoAlbumTeam[]);
    setAlbumSummaries((albumSummaryResult.data ?? []) as AlbumSummary[]);
    setSeasonId((current) => current || loadedSeasons[0]?.id || "");
    setLoading(false);
  }

  const seasonGames = useMemo(
    () => games.filter((game) => !seasonId || game.season_id === seasonId),
    [games, seasonId]
  );

  const seasonTeamIds = useMemo(
    () =>
      new Set(
        seasonTeams
          .filter((row) => row.season_id === seasonId)
          .map((row) => row.team_id)
      ),
    [seasonId, seasonTeams]
  );

  const availableTeams = useMemo(
    () => teams.filter((team) => !seasonId || seasonTeamIds.has(team.id)),
    [seasonId, seasonTeamIds, teams]
  );

  const photoCountByAlbum = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of albumSummaries) {
      counts.set(row.album_id, Number(row.photo_count ?? 0));
    }
    return counts;
  }, [albumSummaries]);

  function selectGame(value: string) {
    setGameId(value);
    const game = games.find((row) => row.id === value);
    if (!game) return;

    setSeasonId(game.season_id);
    setTeamIds([game.home_team_id, game.away_team_id]);

    if (!title.trim()) {
      const home = teams.find((team) => team.id === game.home_team_id)?.name ?? "Home";
      const away = teams.find((team) => team.id === game.away_team_id)?.name ?? "Away";
      setTitle(`${home} vs ${away} Photos`);
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
    setFolderUrl("");
    setTitle("");
    setGameId("");
    setTeamIds([]);
    setEditingId(null);
  }

  async function syncAlbumRequest(albumId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Your login session has expired. Please sign in again.");
    }

    const response = await fetch("/api/photos/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ albumId }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error ?? "Photo sync failed.");
    }

    return {
      count: Number(payload?.count ?? 0),
      albumTitle: String(payload?.albumTitle ?? ""),
    };
  }

  async function syncAllAlbums() {
    if (albums.length === 0 || syncingAll) return;

    setError("");
    setSuccess("");
    setSyncingAll(true);
    setSyncingId(null);

    let completed = 0;
    let totalImages = 0;

    try {
      for (const album of albums) {
        setSyncProgress(`Syncing ${completed + 1} / ${albums.length}: ${album.title}`);
        const result = await syncAlbumRequest(album.id);
        completed += 1;
        totalImages += result.count;
      }

      setSyncProgress("");
      setSuccess(
        `All ${completed} photo folders synced successfully. ${totalImages.toLocaleString()} images are now indexed on OBS.`
      );
      await loadAll();
    } catch (syncError) {
      setError(
        `${
          syncError instanceof Error ? syncError.message : "Photo sync failed."
        } Completed ${completed} of ${albums.length} folders before stopping.`
      );
    } finally {
      setSyncProgress("");
      setSyncingAll(false);
    }
  }

  async function syncAlbum(albumId: string) {
    setError("");
    setSuccess("");
    setSyncingId(albumId);

    try {
      const result = await syncAlbumRequest(albumId);
      setSuccess(
        `Photo folder synced: ${result.count.toLocaleString()} image${
          result.count === 1 ? "" : "s"
        } available on OBS.`
      );
      await loadAll();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Photo sync failed.");
    } finally {
      setSyncingId(null);
    }
  }

  async function saveAlbum(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const folderId = parseDriveFolderId(folderUrl);
    if (!folderId) {
      setError("Paste a valid Google Drive folder URL.");
      return;
    }

    if (!gameId && teamIds.length === 0) {
      setError("Select a game or at least one team so the album can be linked.");
      return;
    }

    setSaving(true);

    const { data: albumId, error: saveError } = await supabase.rpc(
      "admin_upsert_photo_album",
      {
        p_drive_folder_id: folderId,
        p_drive_folder_url: canonicalDriveFolderUrl(folderId),
        p_title: title.trim() || null,
        p_game_id: gameId || null,
        p_season_id: seasonId || null,
        p_team_ids: teamIds,
      }
    );

    if (saveError || !albumId) {
      setError(saveError?.message ?? "Could not save the Google Drive folder.");
      setSaving(false);
      return;
    }

    setSuccess(
      editingId
        ? "Photo album updated. Syncing Google Drive now..."
        : "Google Drive folder linked. Syncing its photos now..."
    );

    clearForm();
    await loadAll();
    setSaving(false);
    await syncAlbum(String(albumId));
  }

  function editAlbum(album: PhotoAlbum) {
    const linkedTeamIds = albumTeams
      .filter((row) => row.album_id === album.id)
      .map((row) => row.team_id);

    setEditingId(album.id);
    setFolderUrl(album.drive_folder_url);
    setTitle(album.title);
    setSeasonId(album.season_id ?? "");
    setGameId(album.game_id ?? "");
    setTeamIds(linkedTeamIds);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAlbum(album: PhotoAlbum) {
    if (
      !window.confirm(
        `Delete photo album "${album.title}" from OBS?\n\nThis does not delete anything from Google Drive.`
      )
    ) {
      return;
    }

    setDeletingId(album.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.rpc(
      "admin_delete_photo_album",
      { p_album_id: album.id }
    );

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setSuccess("Photo album removed from OBS. Google Drive was not changed.");
    await loadAll();
    setDeletingId(null);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p style={{ color: "var(--muted-foreground)" }}>Loading photo management...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className="text-sm font-black uppercase tracking-[0.18em]"
            style={{ color: "var(--primary)" }}
          >
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Photo Management
          </h1>
          <p className="mt-2 max-w-3xl" style={{ color: "var(--muted-foreground)" }}>
            Add one Google Drive folder, link it to a game or teams, and sync every image in
            that folder into the OBS photo gallery. Add more images to the same Drive folder
            later and press Sync again.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/photos"
            className="rounded-xl border px-4 py-2.5 text-sm font-black"
            style={{ borderColor: "var(--border)" }}
          >
            Public Photos
          </Link>
          <Link
            href="/scorer"
            className="rounded-xl border px-4 py-2.5 text-sm font-black"
            style={{ borderColor: "var(--border)" }}
          >
            Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-xl border border-green-900 bg-green-950/30 p-4 text-green-400">
          {success}
        </div>
      )}

      {syncingAll && (
        <div
          className="mt-6 rounded-xl border p-4"
          style={{
            borderColor: "var(--primary)",
            background: "var(--primary-soft)",
            color: "var(--primary)",
          }}
        >
          <p className="font-black">Syncing all Google Drive photo folders…</p>
          <p className="mt-1 text-sm">{syncProgress || "Starting sync…"}</p>
        </div>
      )}

      {role === "admin" && (
        <section
          className="mt-8 rounded-2xl border p-5 sm:p-7"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.18em]"
                style={{ color: "var(--primary)" }}
              >
                Fast import
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {editingId ? "Edit Drive Album" : "Add Google Drive Folder"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={clearForm}
                className="rounded-xl border px-4 py-2 text-sm font-black"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={saveAlbum} className="mt-6 grid gap-5">
            <Field label="Google Drive Folder URL">
              <input
                type="url"
                value={folderUrl}
                onChange={(event) => setFolderUrl(event.target.value)}
                placeholder={EXAMPLE_FOLDER_URL}
                className="w-full rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              />
              <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                The folder must be shared as “Anyone with the link · Viewer” so the public OBS
                site can display the images.
              </p>
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
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
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                      {season.season_year ? ` · ${season.season_year}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Game (recommended)">
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
                    return (
                      <option key={game.id} value={game.id}>
                        {game.game_date} · {home} vs {away}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Selecting a game automatically links both teams and uses that game’s season.
                </p>
              </Field>
            </div>

            <Field label="Album Title">
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Leave blank to use Home vs Away Photos"
                className="w-full rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              />
            </Field>

            <Field label="Teams">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableTeams.map((team) => {
                  const checked = teamIds.includes(team.id);
                  return (
                    <label
                      key={team.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3"
                      style={{
                        borderColor: checked ? "var(--primary)" : "var(--border)",
                        background: checked ? "var(--primary-soft)" : "var(--surface)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeam(team.id)}
                      />
                      <span className="font-bold">{team.name}</span>
                    </label>
                  );
                })}
              </div>
            </Field>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-5 py-3.5 font-black text-white disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {saving
                ? "Saving Folder..."
                : editingId
                ? "Save & Sync Album"
                : "Add Folder & Sync Photos"}
            </button>
          </form>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{ color: "var(--primary)" }}
            >
              Google Drive
            </p>
            <h2 className="mt-2 text-2xl font-black">Linked Photo Albums</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              “Sync All Folders” reads every Google Drive page for every linked album, so folders are
              not limited to the first 50 photos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-sm font-black"
              style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
            >
              {albums.length} albums
            </span>
            {role === "admin" && albums.length > 0 && (
              <button
                type="button"
                onClick={() => void syncAllAlbums()}
                disabled={syncingAll || syncingId !== null}
                className="rounded-xl px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {syncingAll ? "Syncing All…" : "Sync All Folders"}
              </button>
            )}
          </div>
        </div>

        {albums.length === 0 ? (
          <div
            className="mt-4 rounded-2xl border border-dashed p-8 text-center"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            No Google Drive photo folders have been linked yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {albums.map((album) => {
              const linkedTeams = albumTeams
                .filter((row) => row.album_id === album.id)
                .map((row) => teams.find((team) => team.id === row.team_id)?.name)
                .filter(Boolean);
              const count = photoCountByAlbum.get(album.id) ?? 0;
              const game = games.find((row) => row.id === album.game_id);

              return (
                <div
                  key={album.id}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: "var(--border)", background: "var(--card)" }}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{album.title}</h3>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-black"
                          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                        >
                          {count} photos
                        </span>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                        {game ? `${game.game_date} · ` : ""}
                        {linkedTeams.join(" · ") || "No team links"}
                      </p>
                      <a
                        href={album.drive_folder_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-bold hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        Open Google Drive ↗
                      </a>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={syncingAll || syncingId === album.id}
                        onClick={() => void syncAlbum(album.id)}
                        className="rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-50"
                        style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
                      >
                        {syncingId === album.id ? "Syncing..." : "Sync Folder"}
                      </button>
                      <button
                        type="button"
                        onClick={() => editAlbum(album)}
                        className="rounded-xl border px-4 py-2.5 text-sm font-black"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === album.id}
                        onClick={() => void deleteAlbum(album)}
                        className="rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-50"
                        style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                      >
                        {deletingId === album.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function parseDriveFolderId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const folderMatch = trimmed.match(/\/folders\/([A-Za-z0-9_-]+)/i);
  if (folderMatch?.[1]) return folderMatch[1];

  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("id");
    return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
  } catch {
    return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
  }
}

function canonicalDriveFolderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
