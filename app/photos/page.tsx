"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type League = { id: string; name: string };
type Season = {
  id: string;
  name: string;
  season_year: number | null;
  league_id: string | null;
};
type Team = { id: string; name: string; logo_path?: string | null };
type Album = {
  id: string;
  title: string;
  drive_folder_id: string;
  drive_folder_url: string;
  season_id: string | null;
  game_id: string | null;
  created_at: string;
  updated_at: string;
};
type AlbumTeam = { album_id: string; team_id: string };
type AlbumSummary = {
  album_id: string;
  photo_count: number;
  cover_drive_file_id: string | null;
};
type Photo = {
  id: string;
  album_id: string;
  drive_file_id: string;
  name: string;
  mime_type: string | null;
  sort_order: number;
  drive_created_time: string | null;
};
type Game = {
  id: string;
  game_date: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
};

export default function PhotosPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumTeams, setAlbumTeams] = useState<AlbumTeam[]>([]);
  const [albumSummaries, setAlbumSummaries] = useState<AlbumSummary[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [games, setGames] = useState<Game[]>([]);

  const [leagueId, setLeagueId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [team1, setTeam1] = useState("");
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState("");
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [
        leagueResult,
        seasonResult,
        teamResult,
        albumResult,
        albumTeamResult,
        albumSummaryResult,
        gameResult,
      ] = await Promise.all([
          supabase.from("leagues").select("id,name").order("name"),
          supabase
            .from("seasons")
            .select("id,name,season_year,league_id")
            .order("season_year", { ascending: false, nullsFirst: false }),
          supabase.from("teams").select("id,name,logo_path").order("name"),
          supabase
            .from("photo_albums")
            .select(
              "id,title,drive_folder_id,drive_folder_url,season_id,game_id,created_at,updated_at"
            )
            .order("updated_at", { ascending: false }),
          supabase.from("photo_album_teams").select("album_id,team_id"),
          supabase.rpc("get_public_photo_album_summaries"),
          supabase
            .from("games")
            .select("id,game_date,home_team_id,away_team_id,home_score,away_score"),
        ]);

      const failure =
        leagueResult.error ||
        seasonResult.error ||
        teamResult.error ||
        albumResult.error ||
        albumTeamResult.error ||
        albumSummaryResult.error ||
        gameResult.error;

      if (failure) {
        setError(failure.message);
        setLoading(false);
        return;
      }

      const loadedLeagues = (leagueResult.data ?? []) as League[];
      const loadedSeasons = (seasonResult.data ?? []) as Season[];
      const loadedAlbums = (albumResult.data ?? []) as Album[];

      setLeagues(loadedLeagues);
      setSeasons(loadedSeasons);
      setTeams((teamResult.data ?? []) as Team[]);
      setAlbums(loadedAlbums);
      setAlbumTeams((albumTeamResult.data ?? []) as AlbumTeam[]);
      setAlbumSummaries((albumSummaryResult.data ?? []) as AlbumSummary[]);
      setGames((gameResult.data ?? []) as Game[]);

      const requestedTeam = searchParams.get("team1") ?? "";
      const requestedAlbum = searchParams.get("album") ?? "";
      const requestedSeason = searchParams.get("season") ?? "";
      const requestedLeague = searchParams.get("league") ?? "";

      const initialLeague =
        loadedLeagues.find((league) => league.id === requestedLeague)?.id ??
        loadedLeagues[0]?.id ??
        "";
      setLeagueId(initialLeague);

      const firstSeason = loadedSeasons.find(
        (season) => !initialLeague || season.league_id === initialLeague
      );
      setSeasonId(
        loadedSeasons.find((season) => season.id === requestedSeason)?.id ??
          firstSeason?.id ??
          loadedSeasons[0]?.id ??
          ""
      );
      setTeam1((teamResult.data ?? []).some((team: any) => team.id === requestedTeam) ? requestedTeam : "");
      setSelectedAlbumId(
        loadedAlbums.some((album) => album.id === requestedAlbum)
          ? requestedAlbum
          : loadedAlbums[0]?.id ?? ""
      );
      setLoading(false);
    }

    void load();
  }, [searchParams]);

  const availableSeasons = useMemo(
    () => seasons.filter((season) => !leagueId || season.league_id === leagueId),
    [leagueId, seasons]
  );

  const albumTeamMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of albumTeams) {
      if (!map.has(row.album_id)) map.set(row.album_id, new Set());
      map.get(row.album_id)?.add(row.team_id);
    }
    return map;
  }, [albumTeams]);

  const albumSummaryMap = useMemo(() => {
    const map = new Map<string, AlbumSummary>();
    for (const summary of albumSummaries) {
      map.set(summary.album_id, {
        ...summary,
        photo_count: Number(summary.photo_count ?? 0),
      });
    }
    return map;
  }, [albumSummaries]);

  const filteredAlbums = useMemo(() => {
    return albums.filter((album) => {
      if (seasonId && album.season_id && album.season_id !== seasonId) return false;
      const linked = albumTeamMap.get(album.id) ?? new Set<string>();
      if (team1 && !linked.has(team1)) return false;
      return true;
    });
  }, [albums, albumTeamMap, seasonId, team1]);

  useEffect(() => {
    if (!filteredAlbums.some((album) => album.id === selectedAlbumId)) {
      setSelectedAlbumId(filteredAlbums[0]?.id ?? "");
      setSelectedPhotoId("");
    }
  }, [filteredAlbums, selectedAlbumId]);

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedAlbumPhotos() {
      setSelectedPhotoId("");
      setSlideIndex(0);
      setSlideshowOpen(false);
      setSlideshowPlaying(false);

      if (!selectedAlbumId) {
        setPhotos([]);
        return;
      }

      setLoadingPhotos(true);
      setError("");

      const pageSize = 500;
      let from = 0;
      const loaded: Photo[] = [];

      while (true) {
        const { data, error: photoError } = await supabase
          .from("photos")
          .select(
            "id,album_id,drive_file_id,name,mime_type,sort_order,drive_created_time"
          )
          .eq("album_id", selectedAlbumId)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
          .range(from, from + pageSize - 1);

        if (cancelled) return;

        if (photoError) {
          setError(photoError.message);
          setPhotos([]);
          setLoadingPhotos(false);
          return;
        }

        const batch = (data ?? []) as Photo[];
        loaded.push(...batch);

        if (batch.length < pageSize) break;
        from += pageSize;
      }

      if (!cancelled) {
        setPhotos(loaded);
        setLoadingPhotos(false);
      }
    }

    void loadSelectedAlbumPhotos();

    return () => {
      cancelled = true;
    };
  }, [selectedAlbumId]);

  const albumPhotos = photos;

  useEffect(() => {
    if (!slideshowOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSlideshowOpen(false);
        setSlideshowPlaying(false);
      } else if (event.key === "ArrowLeft") {
        setSlideIndex((current) =>
          albumPhotos.length ? (current - 1 + albumPhotos.length) % albumPhotos.length : 0
        );
      } else if (event.key === "ArrowRight") {
        setSlideIndex((current) =>
          albumPhotos.length ? (current + 1) % albumPhotos.length : 0
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [albumPhotos.length, slideshowOpen]);

  useEffect(() => {
    if (!slideshowOpen || !slideshowPlaying || albumPhotos.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % albumPhotos.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [albumPhotos.length, slideshowOpen, slideshowPlaying]);

  useEffect(() => {
    if (!albumPhotos.some((photo) => photo.id === selectedPhotoId)) {
      setSelectedPhotoId(albumPhotos[0]?.id ?? "");
    }
  }, [albumPhotos, selectedPhotoId]);

  const selectedPhoto = albumPhotos.find((photo) => photo.id === selectedPhotoId) ?? null;
  const slideshowPhoto = albumPhotos[slideIndex] ?? null;

  function openSlideshow(photoId: string) {
    const index = albumPhotos.findIndex((photo) => photo.id === photoId);
    setSlideIndex(index >= 0 ? index : 0);
    setSelectedPhotoId(photoId);
    setSlideshowPlaying(false);
    setSlideshowOpen(true);
  }

  function previousSlide() {
    if (!albumPhotos.length) return;
    setSlideIndex((current) => (current - 1 + albumPhotos.length) % albumPhotos.length);
  }

  function nextSlide() {
    if (!albumPhotos.length) return;
    setSlideIndex((current) => (current + 1) % albumPhotos.length);
  }

  const selectedGame = selectedAlbum?.game_id
    ? games.find((game) => game.id === selectedAlbum.game_id) ?? null
    : null;

  const selectedTeamNames = selectedAlbum
    ? [...(albumTeamMap.get(selectedAlbum.id) ?? new Set<string>())]
        .map((id) => teams.find((team) => team.id === id)?.name)
        .filter(Boolean)
    : [];

  function clearFilters() {
    setTeam1("");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p style={{ color: "var(--muted-foreground)" }}>Loading OBS photos...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <p
          className="text-sm font-black uppercase tracking-[0.18em]"
          style={{ color: "var(--primary)" }}
        >
          Observation Basketball
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Photos</h1>
        <p className="mt-3 max-w-3xl text-base sm:text-lg" style={{ color: "var(--muted-foreground)" }}>
          Browse OBS game photography by league, season and team. Select any photo to open the
          full-screen slideshow without leaving the website.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
          {error}
        </div>
      )}

      <section
        className="mt-8 rounded-2xl border p-4 sm:p-5"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="League"
            value={leagueId}
            onChange={(value) => {
              setLeagueId(value);
              const next = seasons.find((season) => !value || season.league_id === value);
              setSeasonId(next?.id ?? "");
            }}
            options={leagues.map((league) => ({ value: league.id, label: league.name }))}
          />

          <FilterSelect
            label="Season"
            value={seasonId}
            onChange={setSeasonId}
            options={availableSeasons.map((season) => ({
              value: season.id,
              label: `${season.name}${season.season_year ? ` · ${season.season_year}` : ""}`,
            }))}
          />

          <FilterSelect
            label="Team"
            value={team1}
            onChange={setTeam1}
            includeAll="All teams"
            options={teams.map((team) => ({ value: team.id, label: team.name }))}
          />

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-xl border px-4 py-3 font-black"
              style={{ borderColor: "var(--border)" }}
            >
              Clear Team
            </button>
          </div>
        </div>
      </section>

      {selectedAlbum && selectedPhoto ? (
        <section
          className="mt-7 overflow-hidden rounded-3xl border"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="grid lg:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)]">
            <div className="flex flex-col justify-between p-5 sm:p-7">
              <div>
                <p
                  className="text-xs font-black uppercase tracking-[0.2em]"
                  style={{ color: "var(--primary)" }}
                >
                  Viewing Album
                </p>
                <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
                  {selectedAlbum.title}
                </h2>
                <p className="mt-4 text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>
                  {selectedGame?.game_date ? `${formatDate(selectedGame.game_date)} · ` : ""}
                  {selectedTeamNames.join(" vs ")}
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {albumPhotos.length} photo{albumPhotos.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href={selectedAlbum.drive_folder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border px-4 py-2.5 text-sm font-black"
                  style={{ borderColor: "var(--border)" }}
                >
                  Open Drive ↗
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openSlideshow(selectedPhoto.id)}
              className="group relative flex min-h-[320px] items-center justify-center bg-black sm:min-h-[500px] lg:min-h-[620px]"
              aria-label="Open slideshow"
            >
              <img
                key={selectedPhoto.drive_file_id}
                src={driveImageUrl(selectedPhoto.drive_file_id, 1800)}
                alt={selectedPhoto.name}
                className="max-h-[78vh] w-full object-contain"
              />
              <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/70 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white opacity-90 transition group-hover:bg-black">
                Open slideshow
              </span>
            </button>
          </div>
        </section>
      ) : (
        <div
          className="mt-7 rounded-2xl border border-dashed p-10 text-center"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          {albums.length === 0
            ? "No photo albums have been synced yet."
            : "No photos match the current filters yet."}
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{ color: "var(--primary)" }}
            >
              Albums
            </p>
            <h2 className="mt-2 text-2xl font-black">Choose an Album</h2>
          </div>
          <span style={{ color: "var(--muted-foreground)" }} className="text-sm font-bold">
            {filteredAlbums.length} album{filteredAlbums.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAlbums.map((album) => {
            const summary = albumSummaryMap.get(album.id);
            const coverDriveFileId = summary?.cover_drive_file_id ?? null;
            const linkedNames = [...(albumTeamMap.get(album.id) ?? new Set<string>())]
              .map((id) => teams.find((team) => team.id === id)?.name)
              .filter(Boolean);
            const count = summary?.photo_count ?? 0;
            const active = album.id === selectedAlbumId;

            return (
              <button
                key={album.id}
                type="button"
                onClick={() => {
                  setSelectedAlbumId(album.id);
                  setSelectedPhotoId("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5"
                style={{
                  borderColor: active ? "var(--primary)" : "var(--border)",
                  background: "var(--card)",
                }}
              >
                <div className="aspect-[4/3] overflow-hidden" style={{ background: "var(--surface)" }}>
                  {coverDriveFileId ? (
                    <img
                      src={driveImageUrl(coverDriveFileId, 800)}
                      alt={album.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>
                      No photos synced
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-black leading-snug">{album.title}</p>
                  <p className="mt-2 line-clamp-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {linkedNames.join(" · ") || "OBS"}
                  </p>
                  <p className="mt-2 text-xs font-black" style={{ color: "var(--primary)" }}>
                    {count} photo{count === 1 ? "" : "s"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedAlbum && loadingPhotos && (
        <div
          className="mt-8 rounded-2xl border border-dashed p-8 text-center"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Loading all photos in this album...
        </div>
      )}

      {selectedAlbum && !loadingPhotos && albumPhotos.length > 0 && (
        <section className="mt-8">
          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{ color: "var(--primary)" }}
            >
              Gallery
            </p>
            <h2 className="mt-2 text-2xl font-black">{selectedAlbum.title}</h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {albumPhotos.map((photo) => {
              const active = photo.id === selectedPhotoId;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => openSlideshow(photo.id)}
                  className="overflow-hidden rounded-xl border transition hover:-translate-y-0.5"
                  style={{ borderColor: active ? "var(--primary)" : "var(--border)" }}
                  title={photo.name}
                >
                  <div className="aspect-square overflow-hidden bg-black">
                    <img
                      src={driveImageUrl(photo.drive_file_id, 600)}
                      alt={photo.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
      {slideshowOpen && slideshowPhoto && selectedAlbum && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedAlbum.title} photo slideshow`}
          onClick={() => {
            setSlideshowOpen(false);
            setSlideshowPlaying(false);
          }}
        >
          <div
            className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-white sm:px-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black sm:text-base">{selectedAlbum.title}</p>
              <p className="mt-0.5 text-xs text-white/60">
                {slideIndex + 1} / {albumPhotos.length}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {albumPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSlideshowPlaying((playing) => !playing)}
                  className="rounded-full border border-white/20 px-3 py-2 text-xs font-black transition hover:bg-white/10 sm:px-4"
                >
                  {slideshowPlaying ? "Pause" : "Play"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSlideshowOpen(false);
                  setSlideshowPlaying(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-xl font-black transition hover:bg-white/10"
                aria-label="Close slideshow"
              >
                ×
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-12 py-4 sm:px-20"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              key={slideshowPhoto.drive_file_id}
              src={driveImageUrl(slideshowPhoto.drive_file_id, 2200)}
              alt={slideshowPhoto.name}
              className="max-h-full max-w-full select-none object-contain"
            />

            {albumPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={previousSlide}
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-3xl font-black text-white backdrop-blur transition hover:bg-black/80 sm:left-5 sm:h-14 sm:w-14"
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-3xl font-black text-white backdrop-blur transition hover:bg-black/80 sm:right-5 sm:h-14 sm:w-14"
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <div
            className="border-t border-white/10 px-4 py-3 text-center text-xs text-white/60 sm:px-6"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="hidden sm:inline">Use ← → to navigate · Esc to close</span>
            <span className="sm:hidden">Swipe-style navigation with the arrows</span>
          </div>
        </div>
      )}

    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  includeAll,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  includeAll?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border px-4 py-3 font-bold"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {includeAll !== undefined && <option value="">{includeAll}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function driveImageUrl(fileId: string, width = 1200) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
