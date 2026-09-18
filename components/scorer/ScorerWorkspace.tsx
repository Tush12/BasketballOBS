"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  division: string | null;
  home_colour: string | null;
  away_colour: string | null;
  manager: string | null;
  logo_path: string | null;
};

type Season = {
  id: string;
  name: string;
  season_year: number | null;
  league_id: string | null;
};

type League = {
  id: string;
  name: string;
};

type SeasonTeam = {
  season_id: string;
  team_id: string;
  division: string;
};

type ScheduledGame = {
  id: string;
  season_id: string;
  game_date: string;
  game_time: string | null;
  venue: string | null;
  home_team_id: string;
  away_team_id: string;
  q1_length_seconds: number | null;
  q2_length_seconds: number | null;
  q3_length_seconds: number | null;
  q4_length_seconds: number | null;
  overtime_length_seconds: number | null;
};

type OngoingGame = ScheduledGame & {
  home_score: number | null;
  away_score: number | null;
  current_period: number;
  clock_seconds: number;
  clock_running: boolean;
  clock_synced_at: string | null;
  started_at: string | null;
};

type CompletedGame = ScheduledGame & {
  source: string | null;
  source_game_id: number | null;
  home_score: number | null;
  away_score: number | null;
  q1_home: number | null;
  q1_away: number | null;
  q2_home: number | null;
  q2_away: number | null;
  q3_home: number | null;
  q3_away: number | null;
  q4_home: number | null;
  q4_away: number | null;
  q5_home: number | null;
  q5_away: number | null;
  ended_at: string | null;
};

type PlayerOption = {
  id: string;
  name: string;
};

type AdminRosterPlayer = {
  roster_id: string;
  player_id: string;
  player_name: string;
  jersey_number: number | null;
  photo_path: string | null;
};

type ScorerView =
  | "dashboard"
  | "games"
  | "seasons"
  | "teams";


const MEDIA_BUCKET =
  "basketball-media";

function mediaPublicUrl(
  path:
    | string
    | null
    | undefined
) {
  if (!path) {
    return null;
  }

  return supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(path)
    .data.publicUrl;
}

function imageExtension(
  file: File
) {
  const byType: Record<
    string,
    string
  > = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return (
    byType[file.type] ??
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() ??
    "jpg"
  );
}

function validImageFile(
  file: File
) {
  return (
    [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ].includes(file.type) &&
    file.size <=
      5 * 1024 * 1024
  );
}


export default function ScorerWorkspace({
  view = "dashboard",
}: {
  view?: ScorerView;
}) {
  const router = useRouter();

  const pageCopy = {
    dashboard: {
      eyebrow: "Administration",
      title: "Scorer Dashboard",
      description:
        "Live game control and league administration.",
    },

    games: {
      eyebrow: "Game Operations",
      title: "Games",
      description:
        "Resume live matches, manage scheduled fixtures and create new games.",
    },

    seasons: {
      eyebrow: "Administration",
      title: "Season Management",
      description:
        "Create, edit and safely remove seasons.",
    },

    teams: {
      eyebrow: "Administration",
      title: "Team Management",
      description:
        "Create teams, assign managers and manage season rosters.",
    },
  }[view];

  const [loading, setLoading] =
    useState(true);

  const [creatingGame, setCreatingGame] =
    useState(false);

  const [creatingSeason, setCreatingSeason] =
    useState(false);

  const [creatingTeam, setCreatingTeam] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [role, setRole] =
    useState("");

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [leagues, setLeagues] =
    useState<League[]>([]);

  const [newLeagueName, setNewLeagueName] =
    useState("");

  const [creatingLeague, setCreatingLeague] =
    useState(false);

  const [managingLeagueId, setManagingLeagueId] =
    useState<string | null>(null);

  const [managingLeagueName, setManagingLeagueName] =
    useState("");

  const [savingLeagueId, setSavingLeagueId] =
    useState<string | null>(null);

  const [deletingLeagueId, setDeletingLeagueId] =
    useState<string | null>(null);

  const [
    seasonTeams,
    setSeasonTeams,
  ] = useState<SeasonTeam[]>([]);

  const [
    scheduledGames,
    setScheduledGames,
  ] = useState<ScheduledGame[]>([]);

  const [
    ongoingGames,
    setOngoingGames,
  ] = useState<OngoingGame[]>([]);

  const [
    completedGames,
    setCompletedGames,
  ] = useState<CompletedGame[]>([]);

  const [
    editingCompletedGameId,
    setEditingCompletedGameId,
  ] = useState<string | null>(null);

  const [
    savingCompletedGameEdit,
    setSavingCompletedGameEdit,
  ] = useState(false);

  const [
    deletingCompletedGameId,
    setDeletingCompletedGameId,
  ] = useState<string | null>(null);

  const [
    showAllCompletedGames,
    setShowAllCompletedGames,
  ] = useState(false);

  const [
    completedEditDate,
    setCompletedEditDate,
  ] = useState("");

  const [
    completedEditTime,
    setCompletedEditTime,
  ] = useState("");

  const [
    completedEditVenue,
    setCompletedEditVenue,
  ] = useState("");

  const [
    completedEditHomeScore,
    setCompletedEditHomeScore,
  ] = useState(0);

  const [
    completedEditAwayScore,
    setCompletedEditAwayScore,
  ] = useState(0);

  const [
    completedEditQ1Home,
    setCompletedEditQ1Home,
  ] = useState(0);

  const [
    completedEditQ1Away,
    setCompletedEditQ1Away,
  ] = useState(0);

  const [
    completedEditQ2Home,
    setCompletedEditQ2Home,
  ] = useState(0);

  const [
    completedEditQ2Away,
    setCompletedEditQ2Away,
  ] = useState(0);

  const [
    completedEditQ3Home,
    setCompletedEditQ3Home,
  ] = useState(0);

  const [
    completedEditQ3Away,
    setCompletedEditQ3Away,
  ] = useState(0);

  const [
    completedEditQ4Home,
    setCompletedEditQ4Home,
  ] = useState(0);

  const [
    completedEditQ4Away,
    setCompletedEditQ4Away,
  ] = useState(0);

  const [
    completedEditQ5Home,
    setCompletedEditQ5Home,
  ] = useState(0);

  const [
    completedEditQ5Away,
    setCompletedEditQ5Away,
  ] = useState(0);

  const [
    editingGameId,
    setEditingGameId,
  ] = useState<string | null>(null);

  const [
    savingGameEdit,
    setSavingGameEdit,
  ] = useState(false);

  const [
    deletingGameId,
    setDeletingGameId,
  ] = useState<string | null>(null);

  const [
    editSeasonId,
    setEditSeasonId,
  ] = useState("");

  const [
    editHomeTeamId,
    setEditHomeTeamId,
  ] = useState("");

  const [
    editAwayTeamId,
    setEditAwayTeamId,
  ] = useState("");

  const [
    editGameDate,
    setEditGameDate,
  ] = useState("");

  const [
    editGameTime,
    setEditGameTime,
  ] = useState("");

  const [
    editVenue,
    setEditVenue,
  ] = useState("");

  const [
    editQ1Minutes,
    setEditQ1Minutes,
  ] = useState(10);

  const [
    editQ2Minutes,
    setEditQ2Minutes,
  ] = useState(10);

  const [
    editQ3Minutes,
    setEditQ3Minutes,
  ] = useState(10);

  const [
    editQ4Minutes,
    setEditQ4Minutes,
  ] = useState(10);

  const [
    editQ5Minutes,
    setEditQ5Minutes,
  ] = useState(5);


  /*
   * =====================================================
   * EDIT / DELETE COMPLETED GAME
   * =====================================================
   */

  function beginEditCompletedGame(
    game: CompletedGame
  ) {
    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can edit completed games."
      );

      return;
    }

    setError("");
    setSuccess("");

    setEditingCompletedGameId(
      game.id
    );

    setCompletedEditDate(
      game.game_date ?? ""
    );

    setCompletedEditTime(
      game.game_time ?? ""
    );

    setCompletedEditVenue(
      game.venue ?? ""
    );

    setCompletedEditHomeScore(
      Number(
        game.home_score ?? 0
      )
    );

    setCompletedEditAwayScore(
      Number(
        game.away_score ?? 0
      )
    );

    setCompletedEditQ1Home(
      Number(
        game.q1_home ?? 0
      )
    );

    setCompletedEditQ1Away(
      Number(
        game.q1_away ?? 0
      )
    );

    setCompletedEditQ2Home(
      Number(
        game.q2_home ?? 0
      )
    );

    setCompletedEditQ2Away(
      Number(
        game.q2_away ?? 0
      )
    );

    setCompletedEditQ3Home(
      Number(
        game.q3_home ?? 0
      )
    );

    setCompletedEditQ3Away(
      Number(
        game.q3_away ?? 0
      )
    );

    setCompletedEditQ4Home(
      Number(
        game.q4_home ?? 0
      )
    );

    setCompletedEditQ4Away(
      Number(
        game.q4_away ?? 0
      )
    );

    setCompletedEditQ5Home(
      Number(
        game.q5_home ?? 0
      )
    );

    setCompletedEditQ5Away(
      Number(
        game.q5_away ?? 0
      )
    );
  }


  function cancelEditCompletedGame() {
    setEditingCompletedGameId(
      null
    );

    setSavingCompletedGameEdit(
      false
    );
  }


  async function saveCompletedGameEdit(
    e: FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can edit completed games."
      );

      return;
    }

    if (
      !editingCompletedGameId
    ) {
      return;
    }

    if (
      !completedEditDate
    ) {
      setError(
        "Game date is required."
      );

      return;
    }

    const scores = [
      completedEditHomeScore,
      completedEditAwayScore,
      completedEditQ1Home,
      completedEditQ1Away,
      completedEditQ2Home,
      completedEditQ2Away,
      completedEditQ3Home,
      completedEditQ3Away,
      completedEditQ4Home,
      completedEditQ4Away,
      completedEditQ5Home,
      completedEditQ5Away,
    ];

    if (
      scores.some(
        (value) =>
          !Number.isInteger(
            value
          ) ||
          value < 0
      )
    ) {
      setError(
        "All scores must be whole numbers of 0 or more."
      );

      return;
    }

    setSavingCompletedGameEdit(
      true
    );

    const {
      error,
    } = await supabase.rpc(
      "admin_update_completed_game",
      {
        p_game_id:
          editingCompletedGameId,

        p_game_date:
          completedEditDate,

        p_game_time:
          completedEditTime.trim() ||
          null,

        p_venue:
          completedEditVenue.trim() ||
          null,

        p_home_score:
          completedEditHomeScore,

        p_away_score:
          completedEditAwayScore,

        p_q1_home:
          completedEditQ1Home,

        p_q1_away:
          completedEditQ1Away,

        p_q2_home:
          completedEditQ2Home,

        p_q2_away:
          completedEditQ2Away,

        p_q3_home:
          completedEditQ3Home,

        p_q3_away:
          completedEditQ3Away,

        p_q4_home:
          completedEditQ4Home,

        p_q4_away:
          completedEditQ4Away,

        p_q5_home:
          completedEditQ5Home,

        p_q5_away:
          completedEditQ5Away,
      }
    );

    if (error) {
      setError(
        error.message
      );

      setSavingCompletedGameEdit(
        false
      );

      return;
    }

    await refreshCompletedGames();

    setEditingCompletedGameId(
      null
    );

    setSavingCompletedGameEdit(
      false
    );

    setSuccess(
      "Completed game updated successfully. Standings and public results now use the corrected score."
    );
  }


  async function deleteCompletedGame(
    game: CompletedGame
  ) {
    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can delete completed games."
      );

      return;
    }

    const home =
      teams.find(
        (team) =>
          team.id ===
          game.home_team_id
      );

    const away =
      teams.find(
        (team) =>
          team.id ===
          game.away_team_id
      );

    const confirmed =
      window.confirm(
        `PERMANENTLY DELETE completed game?\n\n${home?.name ?? "Home Team"} ${game.home_score ?? 0} - ${game.away_score ?? 0} ${away?.name ?? "Away Team"}\n${game.game_date}\n\nThis also deletes this game's player box score, team stats, scoring events and validation issues. This cannot be undone.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    if (
      game.source ===
      "palsports"
    ) {
      const palConfirmed =
        window.confirm(
          "This is a PAL Sports imported game. If it still exists in a future PAL refresh file, importing that refresh may add it back. Delete it anyway?"
        );

      if (
        !palConfirmed
      ) {
        return;
      }
    }

    setError("");
    setSuccess("");

    setDeletingCompletedGameId(
      game.id
    );

    const {
      error,
    } = await supabase.rpc(
      "admin_delete_completed_game",
      {
        p_game_id:
          game.id,
      }
    );

    if (error) {
      setError(
        error.message
      );

      setDeletingCompletedGameId(
        null
      );

      return;
    }

    if (
      editingCompletedGameId ===
      game.id
    ) {
      setEditingCompletedGameId(
        null
      );
    }

    await refreshCompletedGames();

    setDeletingCompletedGameId(
      null
    );

    setSuccess(
      "Completed game and all of its related game data were permanently deleted."
    );
  }


  /*
   * =====================================================
   * LEAGUE MANAGEMENT
   * =====================================================
   */

  async function createLeague(
    e: FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (role !== "admin") {
      setError(
        "Only an administrator can create a league."
      );
      return;
    }

    const name =
      newLeagueName.trim();

    if (!name) {
      setError(
        "Please enter a league name."
      );
      return;
    }

    setCreatingLeague(
      true
    );

    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_create_league",
      {
        p_name: name,
      }
    );

    if (error) {
      setError(
        error.message
      );
      setCreatingLeague(
        false
      );
      return;
    }

    const createdLeague =
      Array.isArray(data)
        ? data[0]
        : data;

    await refreshLeagues(
      createdLeague?.id
    );

    setNewLeagueName(
      ""
    );

    setCreatingLeague(
      false
    );

    setSuccess(
      `League ${name} created successfully.`
    );
  }


  function beginLeagueEdit(
    league: League
  ) {
    setError("");
    setSuccess("");

    setManagingLeagueId(
      league.id
    );

    setManagingLeagueName(
      league.name
    );
  }


  function cancelLeagueEdit() {
    setManagingLeagueId(
      null
    );

    setManagingLeagueName(
      ""
    );
  }


  async function saveLeagueEdit(
    league: League
  ) {
    if (role !== "admin") {
      setError(
        "Only an administrator can edit a league."
      );
      return;
    }

    const name =
      managingLeagueName.trim();

    if (!name) {
      setError(
        "League name is required."
      );
      return;
    }

    setError("");
    setSuccess("");
    setSavingLeagueId(
      league.id
    );

    const { error } =
      await supabase.rpc(
        "admin_update_league",
        {
          p_league_id:
            league.id,
          p_name:
            name,
        }
      );

    if (error) {
      setError(
        error.message
      );
      setSavingLeagueId(
        null
      );
      return;
    }

    await refreshLeagues(
      league.id
    );

    setSavingLeagueId(
      null
    );

    cancelLeagueEdit();

    setSuccess(
      `League renamed to ${name}.`
    );
  }


  async function deleteLeague(
    league: League
  ) {
    if (role !== "admin") {
      setError(
        "Only an administrator can delete a league."
      );
      return;
    }

    const seasonCount =
      seasons.filter(
        (season) =>
          season.league_id ===
          league.id
      ).length;

    if (seasonCount > 0) {
      setError(
        `League ${league.name} still contains ${seasonCount} season${seasonCount === 1 ? "" : "s"}. Delete those seasons first.`
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete league "${league.name}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingLeagueId(
      league.id
    );

    const { error } =
      await supabase.rpc(
        "admin_delete_league",
        {
          p_league_id:
            league.id,
        }
      );

    if (error) {
      setError(
        error.message
      );
      setDeletingLeagueId(
        null
      );
      return;
    }

    if (
      managingLeagueId ===
      league.id
    ) {
      cancelLeagueEdit();
    }

    await refreshLeagues();

    setDeletingLeagueId(
      null
    );

    setSuccess(
      `League ${league.name} deleted successfully.`
    );
  }


  /*
   * =====================================================
   * CREATE SEASON
   * =====================================================
   */

  const [
    newSeasonName,
    setNewSeasonName,
  ] = useState("");

  const [
    newSeasonYear,
    setNewSeasonYear,
  ] = useState("");

  const [
    newSeasonLeagueId,
    setNewSeasonLeagueId,
  ] = useState("");

  const [
    copyRosters,
    setCopyRosters,
  ] = useState(true);

  const [
    copyFromSeasonId,
    setCopyFromSeasonId,
  ] = useState("");

  const [
    managingSeasonId,
    setManagingSeasonId,
  ] = useState<
    string | null
  >(null);

  const [
    managingSeasonName,
    setManagingSeasonName,
  ] = useState("");

  const [
    managingSeasonYear,
    setManagingSeasonYear,
  ] = useState("");

  const [
    savingSeasonId,
    setSavingSeasonId,
  ] = useState<
    string | null
  >(null);

  const [
    deletingSeasonId,
    setDeletingSeasonId,
  ] = useState<
    string | null
  >(null);


  /*
   * =====================================================
   * ADD TEAM
   * =====================================================
   */

  const [
    newTeamSeasonId,
    setNewTeamSeasonId,
  ] = useState("");

  const [
    newTeamName,
    setNewTeamName,
  ] = useState("");

  const [
    newTeamDivision,
    setNewTeamDivision,
  ] = useState("西岸");

  const [
    newTeamManager,
    setNewTeamManager,
  ] = useState("");

  const [
    newTeamManagerEmail,
    setNewTeamManagerEmail,
  ] = useState("");

  const [
    newTeamHomeColour,
    setNewTeamHomeColour,
  ] = useState("");

  const [
    newTeamAwayColour,
    setNewTeamAwayColour,
  ] = useState("");


  /*
   * =====================================================
   * EDIT / DELETE TEAM
   * =====================================================
   */

  const [
    teamManageSeasonId,
    setTeamManageSeasonId,
  ] = useState("");

  const [
    editingTeamId,
    setEditingTeamId,
  ] = useState<string | null>(null);

  const [
    editTeamName,
    setEditTeamName,
  ] = useState("");

  const [
    editTeamDivision,
    setEditTeamDivision,
  ] = useState("西岸");

  const [
    editTeamManager,
    setEditTeamManager,
  ] = useState("");

  const [
    editTeamManagerEmail,
    setEditTeamManagerEmail,
  ] = useState("");

  const [
    editTeamHomeColour,
    setEditTeamHomeColour,
  ] = useState("");

  const [
    editTeamAwayColour,
    setEditTeamAwayColour,
  ] = useState("");

  const [
    savingTeamId,
    setSavingTeamId,
  ] = useState<string | null>(null);

  const [
    deletingTeamId,
    setDeletingTeamId,
  ] = useState<string | null>(null);


  const [
    uploadingTeamLogoId,
    setUploadingTeamLogoId,
  ] = useState<string | null>(null);

  const [
    uploadingPlayerPhotoId,
    setUploadingPlayerPhotoId,
  ] = useState<string | null>(null);


  /*
   * =====================================================
   * ROSTER MANAGEMENT
   * =====================================================
   */

  const [
    rosterSeasonId,
    setRosterSeasonId,
  ] = useState("");

  const [
    rosterTeamId,
    setRosterTeamId,
  ] = useState("");

  const [
    rosterPlayers,
    setRosterPlayers,
  ] = useState<
    AdminRosterPlayer[]
  >([]);

  const [
    allPlayers,
    setAllPlayers,
  ] = useState<
    PlayerOption[]
  >([]);

  const [
    assignedPlayerIds,
    setAssignedPlayerIds,
  ] = useState<
    string[]
  >([]);

  const [
    rosterLoading,
    setRosterLoading,
  ] = useState(false);

  const [
    addingRosterPlayer,
    setAddingRosterPlayer,
  ] = useState(false);

  const [
    removingRosterPlayerId,
    setRemovingRosterPlayerId,
  ] = useState<
    string | null
  >(null);

  const [
    updatingRosterPlayerId,
    setUpdatingRosterPlayerId,
  ] = useState<
    string | null
  >(null);

  const [
    addPlayerMode,
    setAddPlayerMode,
  ] = useState<
    "new" | "existing"
  >("new");

  const [
    newRosterPlayerName,
    setNewRosterPlayerName,
  ] = useState("");

  const [
    existingRosterPlayerId,
    setExistingRosterPlayerId,
  ] = useState("");

  const [
    rosterJerseyNumber,
    setRosterJerseyNumber,
  ] = useState("");


  /*
   * =====================================================
   * CREATE GAME
   * =====================================================
   */

  const [
    seasonId,
    setSeasonId,
  ] = useState("");

  const [
    homeTeamId,
    setHomeTeamId,
  ] = useState("");

  const [
    awayTeamId,
    setAwayTeamId,
  ] = useState("");

  const [
    gameDate,
    setGameDate,
  ] = useState(getToday());

  const [
    gameTime,
    setGameTime,
  ] = useState("19:00");

  const [
    venue,
    setVenue,
  ] = useState("");


  /*
   * Q1 - Q5
   */

  const [
    q1Minutes,
    setQ1Minutes,
  ] = useState(10);

  const [
    q2Minutes,
    setQ2Minutes,
  ] = useState(10);

  const [
    q3Minutes,
    setQ3Minutes,
  ] = useState(10);

  const [
    q4Minutes,
    setQ4Minutes,
  ] = useState(10);

  const [
    q5Minutes,
    setQ5Minutes,
  ] = useState(5);


  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    async function initialise() {
      setError("");

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const {
        data: roleData,
        error: roleError,
      } = await supabase
        .from("user_roles")
        .select("role")
        .eq(
          "user_id",
          session.user.id
        )
        .maybeSingle();

      if (roleError) {
        setError(
          roleError.message
        );

        setLoading(false);

        return;
      }

      if (
        !roleData ||
        ![
          "admin",
          "scorer",
        ].includes(
          roleData.role
        )
      ) {
        setError(
          "You do not have scorer access."
        );

        setLoading(false);

        return;
      }

      setRole(
        roleData.role
      );


      /*
       * LOAD EVERYTHING
       */

      const [
        teamResult,
        seasonResult,
        leagueResult,
        seasonTeamResult,
        scheduledGameResult,
        ongoingGameResult,
        completedGameResult,
      ] =
        await Promise.all([
          supabase
            .from("teams")
            .select(`
              id,
              name,
              division,
              home_colour,
              away_colour,
              manager,
              logo_path
            `)
            .order("name"),

          supabase
            .from("seasons")
            .select(`
              id,
              name,
              season_year,
              league_id
            `)
            .order(
              "season_year",
              {
                ascending: false,
              }
            ),

          supabase
            .from("leagues")
            .select(`
              id,
              name
            `)
            .order("name"),

          supabase
            .from(
              "season_teams"
            )
            .select(`
              season_id,
              team_id,
              division
            `),

          supabase
            .from("games")
            .select(`
              id,
              season_id,
              game_date,
              game_time,
              venue,
              home_team_id,
              away_team_id,
              q1_length_seconds,
              q2_length_seconds,
              q3_length_seconds,
              q4_length_seconds,
              overtime_length_seconds
            `)
            .eq(
              "status",
              "scheduled"
            )
            .order(
              "game_date",
              {
                ascending: true,
              }
            )
            .order(
              "game_time",
              {
                ascending: true,
              }
            ),

          supabase
            .from("games")
            .select(`
              id,
              season_id,
              game_date,
              game_time,
              venue,
              home_team_id,
              away_team_id,
              home_score,
              away_score,
              current_period,
              clock_seconds,
              clock_running,
              clock_synced_at,
              started_at,
              q1_length_seconds,
              q2_length_seconds,
              q3_length_seconds,
              q4_length_seconds,
              overtime_length_seconds
            `)
            .eq(
              "status",
              "live"
            )
            .order(
              "started_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("games")
            .select(`
              id,
              season_id,
              source,
              source_game_id,
              game_date,
              game_time,
              venue,
              home_team_id,
              away_team_id,
              home_score,
              away_score,
              q1_home,
              q1_away,
              q2_home,
              q2_away,
              q3_home,
              q3_away,
              q4_home,
              q4_away,
              q5_home,
              q5_away,
              ended_at,
              q1_length_seconds,
              q2_length_seconds,
              q3_length_seconds,
              q4_length_seconds,
              overtime_length_seconds
            `)
            .eq(
              "status",
              "finished"
            )
            .order(
              "game_date",
              {
                ascending: false,
              }
            )
            .order(
              "game_time",
              {
                ascending: false,
              }
            ),
        ]);


      if (
        teamResult.error
      ) {
        setError(
          teamResult.error
            .message
        );

        setLoading(false);

        return;
      }

      if (
        seasonResult.error
      ) {
        setError(
          seasonResult.error
            .message
        );

        setLoading(false);

        return;
      }

      if (
        leagueResult.error
      ) {
        setError(
          leagueResult.error
            .message
        );

        setLoading(false);

        return;
      }

      if (
        seasonTeamResult.error
      ) {
        setError(
          seasonTeamResult.error
            .message
        );

        setLoading(false);

        return;
      }

      if (
        scheduledGameResult.error
      ) {
        setError(
          scheduledGameResult.error
            .message
        );

        setLoading(false);

        return;
      }

      if (
        ongoingGameResult.error
      ) {
        setError(
          ongoingGameResult.error
            .message
        );

        setLoading(false);

        return;
      }

      if (
        completedGameResult.error
      ) {
        setError(
          completedGameResult.error
            .message
        );

        setLoading(false);

        return;
      }


      const loadedTeams =
        teamResult.data ?? [];

      const loadedSeasons =
        seasonResult.data ?? [];

      const loadedLeagues =
        leagueResult.data ?? [];

      const loadedSeasonTeams =
        seasonTeamResult.data ??
        [];

      const loadedScheduledGames =
        scheduledGameResult.data ??
        [];

      const loadedOngoingGames =
        ongoingGameResult.data ??
        [];

      const loadedCompletedGames =
        completedGameResult.data ??
        [];


      setTeams(
        loadedTeams
      );

      setSeasons(
        loadedSeasons
      );

      setLeagues(
        loadedLeagues
      );

      setSeasonTeams(
        loadedSeasonTeams
      );

      setScheduledGames(
        loadedScheduledGames
      );

      setOngoingGames(
        loadedOngoingGames
      );

      setCompletedGames(
        loadedCompletedGames
      );


      /*
       * DEFAULT LEAGUE
       */

      if (
        loadedLeagues.length >
        0
      ) {
        setNewSeasonLeagueId(
          loadedLeagues[0].id
        );
      }


      /*
       * DEFAULT CURRENT SEASON
       */

      if (
        loadedSeasons.length >
        0
      ) {
        const newestSeason =
          loadedSeasons[0];

        setSeasonId(
          newestSeason.id
        );

        setNewTeamSeasonId(
          newestSeason.id
        );

        setTeamManageSeasonId(
          newestSeason.id
        );

        setRosterSeasonId(
          newestSeason.id
        );

        setCopyFromSeasonId(
          newestSeason.id
        );
      }


      /*
       * DEFAULT NEXT SEASON YEAR
       */

      const years =
        loadedSeasons
          .map(
            (season) =>
              season.season_year
          )
          .filter(
            (
              year
            ): year is number =>
              year !== null
          );

      const latestYear =
        years.length > 0
          ? Math.max(
              ...years
            )
          : new Date()
              .getFullYear();

      const nextYear =
        latestYear + 1;

      setNewSeasonYear(
        String(nextYear)
      );

      setNewSeasonName(
        String(nextYear)
      );


      setLoading(false);
    }

    initialise();
  }, [router]);


  /*
   * =====================================================
   * REFRESH DATA
   * =====================================================
   */

  async function refreshTeams() {
    const [
      teamResult,
      membershipResult,
    ] =
      await Promise.all([
        supabase
          .from("teams")
          .select(`
            id,
            name,
            division,
            home_colour,
            away_colour,
            manager,
            logo_path
          `)
          .order("name"),

        supabase
          .from(
            "season_teams"
          )
          .select(`
            season_id,
            team_id,
            division
          `),
      ]);

    if (
      teamResult.error
    ) {
      setError(
        teamResult.error.message
      );

      return;
    }

    if (
      membershipResult.error
    ) {
      setError(
        membershipResult
          .error.message
      );

      return;
    }

    setTeams(
      teamResult.data ?? []
    );

    setSeasonTeams(
      membershipResult.data ??
        []
    );
  }


  async function refreshLeagues(
    preferredLeagueId?: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("leagues")
      .select(`
        id,
        name
      `)
      .order("name");

    if (error) {
      setError(
        error.message
      );

      return;
    }

    const rows =
      (data ?? []) as League[];

    setLeagues(
      rows
    );

    const preferredStillExists =
      preferredLeagueId &&
      rows.some(
        (league) =>
          league.id ===
          preferredLeagueId
      );

    if (
      preferredStillExists
    ) {
      setNewSeasonLeagueId(
        preferredLeagueId!
      );
    } else {
      setNewSeasonLeagueId(
        (current) =>
          rows.some(
            (league) =>
              league.id ===
              current
          )
            ? current
            : rows[0]?.id ?? ""
      );
    }
  }


  async function refreshSeasons(
    preferredSeasonId?: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("seasons")
      .select(`
        id,
        name,
        season_year,
        league_id
      `)
      .order(
        "season_year",
        {
          ascending: false,
        }
      );

    if (error) {
      setError(
        error.message
      );

      return;
    }

    const rows =
      data ?? [];

    setSeasons(
      rows
    );

    if (
      preferredSeasonId
    ) {
      setSeasonId(
        preferredSeasonId
      );

      setNewTeamSeasonId(
        preferredSeasonId
      );

      setTeamManageSeasonId(
        preferredSeasonId
      );

      setCopyFromSeasonId(
        preferredSeasonId
      );
    }
  }


  /*
   * =====================================================
   * REFRESH SCHEDULED GAMES
   * =====================================================
   */

  async function refreshScheduledGames() {
    const {
      data,
      error,
    } = await supabase
      .from("games")
      .select(`
        id,
        season_id,
        game_date,
        game_time,
        venue,
        home_team_id,
        away_team_id,
        q1_length_seconds,
        q2_length_seconds,
        q3_length_seconds,
        q4_length_seconds,
        overtime_length_seconds
      `)
      .eq(
        "status",
        "scheduled"
      )
      .order(
        "game_date",
        {
          ascending: true,
        }
      )
      .order(
        "game_time",
        {
          ascending: true,
        }
      );

    if (error) {
      setError(
        error.message
      );

      return;
    }

    setScheduledGames(
      data ?? []
    );
  }



  /*
   * =====================================================
   * REFRESH ONGOING GAMES
   * =====================================================
   */

  async function refreshOngoingGames() {
    const {
      data,
      error,
    } = await supabase
      .from("games")
      .select(`
        id,
        season_id,
        game_date,
        game_time,
        venue,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        current_period,
        clock_seconds,
        clock_running,
        clock_synced_at,
        started_at,
        q1_length_seconds,
        q2_length_seconds,
        q3_length_seconds,
        q4_length_seconds,
        overtime_length_seconds
      `)
      .eq(
        "status",
        "live"
      )
      .order(
        "started_at",
        {
          ascending: false,
        }
      );

    if (error) {
      setError(
        error.message
      );

      return;
    }

    setOngoingGames(
      data ?? []
    );
  }


  /*
   * =====================================================
   * REFRESH COMPLETED GAMES
   * =====================================================
   */

  async function refreshCompletedGames() {
    const {
      data,
      error,
    } = await supabase
      .from("games")
      .select(`
        id,
        season_id,
        source,
        source_game_id,
        game_date,
        game_time,
        venue,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        q1_home,
        q1_away,
        q2_home,
        q2_away,
        q3_home,
        q3_away,
        q4_home,
        q4_away,
        q5_home,
        q5_away,
        ended_at,
        q1_length_seconds,
        q2_length_seconds,
        q3_length_seconds,
        q4_length_seconds,
        overtime_length_seconds
      `)
      .eq(
        "status",
        "finished"
      )
      .order(
        "game_date",
        {
          ascending: false,
        }
      )
      .order(
        "game_time",
        {
          ascending: false,
        }
      );

    if (error) {
      setError(
        error.message
      );

      return;
    }

    setCompletedGames(
      (data ?? []) as CompletedGame[]
    );
  }


  /*
   * Refresh fixture/live lists whenever the scorer
   * dashboard becomes active again.
   */

  useEffect(() => {
    function refreshOnFocus() {
      refreshScheduledGames();
      refreshOngoingGames();
      refreshCompletedGames();
    }

    window.addEventListener(
      "focus",
      refreshOnFocus
    );

    return () =>
      window.removeEventListener(
        "focus",
        refreshOnFocus
      );
  }, []);


  /*
   * =====================================================
   * TEAMS AVAILABLE FOR SELECTED GAME SEASON
   * =====================================================
   */

  const gameTeams =
    useMemo(() => {
      const ids =
        new Set(
          seasonTeams
            .filter(
              (row) =>
                row.season_id ===
                seasonId
            )
            .map(
              (row) =>
                row.team_id
            )
        );

      return teams.filter(
        (team) =>
          ids.has(
            team.id
          )
      );
    }, [
      teams,
      seasonTeams,
      seasonId,
    ]);


  /*
   * =====================================================
   * TEAMS AVAILABLE WHILE EDITING A FIXTURE
   * =====================================================
   */

  const editGameTeams =
    useMemo(() => {
      const ids =
        new Set(
          seasonTeams
            .filter(
              (row) =>
                row.season_id ===
                editSeasonId
            )
            .map(
              (row) =>
                row.team_id
            )
        );

      return teams.filter(
        (team) =>
          ids.has(
            team.id
          )
      );
    }, [
      teams,
      seasonTeams,
      editSeasonId,
    ]);


  /*
   * =====================================================
   * TEAMS IN SELECTED MANAGEMENT SEASON
   * =====================================================
   */

  const managedTeams =
    useMemo(() => {
      if (
        !teamManageSeasonId
      ) {
        return [];
      }

      const ids =
        new Set(
          seasonTeams
            .filter(
              (row) =>
                row.season_id ===
                teamManageSeasonId
            )
            .map(
              (row) =>
                row.team_id
            )
        );

      return teams
        .filter(
          (team) =>
            ids.has(
              team.id
            )
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name
            )
        );
    }, [
      teamManageSeasonId,
      seasonTeams,
      teams,
    ]);


  /*
   * =====================================================
   * ROSTER MANAGEMENT
   * =====================================================
   */

  const rosterTeams =
    useMemo(() => {
      if (
        !rosterSeasonId
      ) {
        return [];
      }

      const ids =
        new Set(
          seasonTeams
            .filter(
              (
                row
              ) =>
                row.season_id ===
                rosterSeasonId
            )
            .map(
              (
                row
              ) =>
                row.team_id
            )
        );

      return teams
        .filter(
          (
            team
          ) =>
            ids.has(
              team.id
            )
        )
        .sort(
          (
            a,
            b
          ) =>
            a.name.localeCompare(
              b.name
            )
        );
    }, [
      rosterSeasonId,
      seasonTeams,
      teams,
    ]);


  const availableExistingPlayers =
    useMemo(() => {
      const assigned =
        new Set(
          assignedPlayerIds
        );

      return allPlayers.filter(
        (
          player
        ) =>
          !assigned.has(
            player.id
          )
      );
    }, [
      allPlayers,
      assignedPlayerIds,
    ]);


  useEffect(() => {
    if (
      view !==
        "teams" ||
      role !==
        "admin"
    ) {
      return;
    }

    if (
      rosterTeams.length ===
      0
    ) {
      setRosterTeamId("");
      return;
    }

    const stillValid =
      rosterTeams.some(
        (
          team
        ) =>
          team.id ===
          rosterTeamId
      );

    if (
      !stillValid
    ) {
      setRosterTeamId(
        rosterTeams[0].id
      );
    }
  }, [
    view,
    role,
    rosterTeams,
    rosterTeamId,
  ]);


  useEffect(() => {
    if (
      view !==
        "teams" ||
      role !==
        "admin"
    ) {
      return;
    }

    loadAllPlayers();
  }, [
    view,
    role,
  ]);


  useEffect(() => {
    if (
      view !==
        "teams" ||
      role !==
        "admin" ||
      !rosterSeasonId
    ) {
      setAssignedPlayerIds([]);
      return;
    }

    loadSeasonRosterAssignments();
  }, [
    view,
    role,
    rosterSeasonId,
  ]);


  useEffect(() => {
    if (
      view !==
        "teams" ||
      role !==
        "admin" ||
      !rosterSeasonId ||
      !rosterTeamId
    ) {
      setRosterPlayers([]);
      return;
    }

    loadRoster();
  }, [
    view,
    role,
    rosterSeasonId,
    rosterTeamId,
  ]);


  async function loadAllPlayers() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "players"
        )
        .select(`
          id,
          name
        `)
        .order(
          "name",
          {
            ascending:
              true,
          }
        );

    if (
      error
    ) {
      setError(
        error.message
      );

      return;
    }

    setAllPlayers(
      (
        data ??
        []
      ) as PlayerOption[]
    );
  }


  async function loadSeasonRosterAssignments() {
    if (
      !rosterSeasonId
    ) {
      setAssignedPlayerIds([]);
      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "rosters"
        )
        .select(
          "player_id"
        )
        .eq(
          "season_id",
          rosterSeasonId
        );

    if (
      error
    ) {
      setError(
        error.message
      );

      return;
    }

    setAssignedPlayerIds(
      (
        data ??
        []
      )
        .map(
          (
            row: any
          ) =>
            row.player_id
        )
        .filter(
          Boolean
        )
    );
  }


  async function loadRoster() {
    if (
      !rosterSeasonId ||
      !rosterTeamId
    ) {
      setRosterPlayers([]);
      return;
    }

    setRosterLoading(
      true
    );

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "rosters"
        )
        .select(`
          id,
          player_id,
          jersey_number,
          player:players(
            id,
            name,
            photo_path
          )
        `)
        .eq(
          "season_id",
          rosterSeasonId
        )
        .eq(
          "team_id",
          rosterTeamId
        );

    if (
      error
    ) {
      setError(
        error.message
      );

      setRosterLoading(
        false
      );

      return;
    }

    const rows =
      (
        data ??
        []
      )
        .map(
          (
            row: any
          ) => {
            const player =
              Array.isArray(
                row.player
              )
                ? row.player[0]
                : row.player;

            return {
              roster_id:
                row.id,

              player_id:
                row.player_id,

              player_name:
                player?.name ??
                "Unknown Player",

              jersey_number:
                row.jersey_number ??
                null,

              photo_path:
                player?.photo_path ??
                null,
            } satisfies AdminRosterPlayer;
          }
        )
        .sort(
          (
            a,
            b
          ) => {
            const aNumber =
              a.jersey_number ??
              9999;

            const bNumber =
              b.jersey_number ??
              9999;

            if (
              aNumber !==
              bNumber
            ) {
              return (
                aNumber -
                bNumber
              );
            }

            return a.player_name.localeCompare(
              b.player_name
            );
          }
        );

    setRosterPlayers(
      rows
    );

    setRosterLoading(
      false
    );
  }


  async function addRosterPlayer(
    e: FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      role !==
        "admin"
    ) {
      setError(
        "Only an administrator can manage rosters."
      );

      return;
    }

    if (
      !rosterSeasonId ||
      !rosterTeamId
    ) {
      setError(
        "Please select a season and team first."
      );

      return;
    }

    if (
      addPlayerMode ===
        "new" &&
      !newRosterPlayerName.trim()
    ) {
      setError(
        "Please enter the new player's name."
      );

      return;
    }

    if (
      addPlayerMode ===
        "existing" &&
      !existingRosterPlayerId
    ) {
      setError(
        "Please select an existing player."
      );

      return;
    }

    const jersey =
      rosterJerseyNumber.trim() ===
      ""
        ? null
        : Number(
            rosterJerseyNumber
          );

    if (
      jersey !==
        null &&
      (
        !Number.isInteger(
          jersey
        ) ||
        jersey <
          0 ||
        jersey >
          999
      )
    ) {
      setError(
        "Jersey number must be a whole number between 0 and 999."
      );

      return;
    }

    setAddingRosterPlayer(
      true
    );

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "admin_add_player_to_roster",
        {
          p_season_id:
            rosterSeasonId,

          p_team_id:
            rosterTeamId,

          p_player_id:
            addPlayerMode ===
            "existing"
              ? existingRosterPlayerId
              : null,

          p_player_name:
            addPlayerMode ===
            "new"
              ? newRosterPlayerName.trim()
              : null,

          p_jersey_number:
            jersey,
        }
      );

    if (
      error
    ) {
      setError(
        error.message
      );

      setAddingRosterPlayer(
        false
      );

      return;
    }

    const added =
      Array.isArray(
        data
      )
        ? data[0]
        : data;

    const selectedTeam =
      teams.find(
        (
          team
        ) =>
          team.id ===
          rosterTeamId
      );

    setSuccess(
      `${added?.player_name ?? "Player"} added to ${
        selectedTeam?.name ??
        "the team"
      }.`
    );

    setNewRosterPlayerName("");
    setExistingRosterPlayerId("");
    setRosterJerseyNumber("");

    await Promise.all([
      loadRoster(),
      loadAllPlayers(),
      loadSeasonRosterAssignments(),
    ]);

    setAddingRosterPlayer(
      false
    );
  }


  async function updateRosterPlayerDetails(
    player:
      AdminRosterPlayer
  ) {
    if (
      role !==
        "admin" ||
      !rosterSeasonId ||
      !rosterTeamId
    ) {
      return;
    }

    const playerName =
      player.player_name.trim();

    const jersey =
      player.jersey_number;

    if (
      !playerName
    ) {
      setError(
        "Player name cannot be blank."
      );

      return;
    }

    if (
      jersey !==
        null &&
      (
        !Number.isInteger(
          jersey
        ) ||
        jersey <
          0 ||
        jersey >
          999
      )
    ) {
      setError(
        "Jersey number must be a whole number between 0 and 999."
      );

      return;
    }

    setError(
      ""
    );
    setSuccess(
      ""
    );

    setUpdatingRosterPlayerId(
      player.player_id
    );

    const {
      error,
    } =
      await supabase.rpc(
        "admin_update_roster_player_details",
        {
          p_season_id:
            rosterSeasonId,

          p_team_id:
            rosterTeamId,

          p_player_id:
            player.player_id,

          p_player_name:
            playerName,

          p_jersey_number:
            jersey,
        }
      );

    if (
      error
    ) {
      setError(
        error.message
      );

      setUpdatingRosterPlayerId(
        null
      );

      return;
    }

    setSuccess(
      `${playerName}'s player details were updated.`
    );

    await Promise.all([
      loadRoster(),
      loadAllPlayers(),
    ]);

    setUpdatingRosterPlayerId(
      null
    );
  }


  async function removeRosterPlayer(
    player:
      AdminRosterPlayer
  ) {
    if (
      role !==
        "admin" ||
      !rosterSeasonId ||
      !rosterTeamId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove #${
          player.jersey_number ??
          "—"
        } ${
          player.player_name
        } from this season roster? Historical player records are not deleted.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setError("");
    setSuccess("");

    setRemovingRosterPlayerId(
      player.player_id
    );

    const {
      error,
    } =
      await supabase.rpc(
        "admin_remove_player_from_roster",
        {
          p_season_id:
            rosterSeasonId,

          p_team_id:
            rosterTeamId,

          p_player_id:
            player.player_id,
        }
      );

    if (
      error
    ) {
      setError(
        error.message
      );

      setRemovingRosterPlayerId(
        null
      );

      return;
    }

    setSuccess(
      `${player.player_name} removed from the roster.`
    );

    await Promise.all([
      loadRoster(),
      loadSeasonRosterAssignments(),
    ]);

    setRemovingRosterPlayerId(
      null
    );
  }


  /*
   * =====================================================
   * EDIT / DELETE SCHEDULED GAME
   * =====================================================
   */

  function beginEditGame(
    game: ScheduledGame
  ) {
    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can edit scheduled games."
      );

      return;
    }

    setError("");
    setSuccess("");

    setEditingGameId(
      game.id
    );

    setEditSeasonId(
      game.season_id
    );

    setEditHomeTeamId(
      game.home_team_id
    );

    setEditAwayTeamId(
      game.away_team_id
    );

    setEditGameDate(
      game.game_date
    );

    setEditGameTime(
      game.game_time ?? ""
    );

    setEditVenue(
      game.venue ?? ""
    );

    setEditQ1Minutes(
      secondsToMinutes(
        game.q1_length_seconds,
        10
      )
    );

    setEditQ2Minutes(
      secondsToMinutes(
        game.q2_length_seconds,
        10
      )
    );

    setEditQ3Minutes(
      secondsToMinutes(
        game.q3_length_seconds,
        10
      )
    );

    setEditQ4Minutes(
      secondsToMinutes(
        game.q4_length_seconds,
        10
      )
    );

    setEditQ5Minutes(
      secondsToMinutes(
        game.overtime_length_seconds,
        5
      )
    );
  }


  function cancelEditGame() {
    setEditingGameId(
      null
    );

    setSavingGameEdit(
      false
    );
  }


  async function saveEditedGame(
    e: FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can edit scheduled games."
      );

      return;
    }

    if (
      !editingGameId
    ) {
      return;
    }

    if (
      !editSeasonId ||
      !editHomeTeamId ||
      !editAwayTeamId ||
      !editGameDate
    ) {
      setError(
        "Season, home team, away team and game date are required."
      );

      return;
    }

    if (
      editHomeTeamId ===
      editAwayTeamId
    ) {
      setError(
        "Home and away teams cannot be the same."
      );

      return;
    }

    const quarterValues = [
      editQ1Minutes,
      editQ2Minutes,
      editQ3Minutes,
      editQ4Minutes,
      editQ5Minutes,
    ];

    if (
      quarterValues.some(
        (value) =>
          value < 1 ||
          value > 60
      )
    ) {
      setError(
        "Quarter lengths must be between 1 and 60 minutes."
      );

      return;
    }

    setSavingGameEdit(
      true
    );

    const {
      error,
    } = await supabase.rpc(
      "admin_update_scheduled_game",
      {
        p_game_id:
          editingGameId,

        p_season_id:
          editSeasonId,

        p_home_team_id:
          editHomeTeamId,

        p_away_team_id:
          editAwayTeamId,

        p_game_date:
          editGameDate,

        p_game_time:
          editGameTime.trim() ||
          null,

        p_venue:
          editVenue.trim() ||
          null,

        p_q1_minutes:
          editQ1Minutes,

        p_q2_minutes:
          editQ2Minutes,

        p_q3_minutes:
          editQ3Minutes,

        p_q4_minutes:
          editQ4Minutes,

        p_q5_minutes:
          editQ5Minutes,
      }
    );

    if (error) {
      setError(
        error.message
      );

      setSavingGameEdit(
        false
      );

      return;
    }

    await refreshScheduledGames();

    setEditingGameId(
      null
    );

    setSavingGameEdit(
      false
    );

    setSuccess(
      "Scheduled game updated successfully. The public fixture calendar will show the new details."
    );
  }


  async function deleteScheduledGame(
    game: ScheduledGame
  ) {
    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can delete scheduled games."
      );

      return;
    }

    const home =
      teams.find(
        (team) =>
          team.id ===
          game.home_team_id
      );

    const away =
      teams.find(
        (team) =>
          team.id ===
          game.away_team_id
      );

    const confirmed =
      window.confirm(
        `Delete ${home?.name ?? "Home Team"} vs ${away?.name ?? "Away Team"} on ${game.game_date}? This cannot be undone.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setError("");
    setSuccess("");

    setDeletingGameId(
      game.id
    );

    const {
      error,
    } = await supabase.rpc(
      "admin_delete_scheduled_game",
      {
        p_game_id:
          game.id,
      }
    );

    if (error) {
      setError(
        error.message
      );

      setDeletingGameId(
        null
      );

      return;
    }

    if (
      editingGameId ===
      game.id
    ) {
      setEditingGameId(
        null
      );
    }

    await refreshScheduledGames();

    setDeletingGameId(
      null
    );

    setSuccess(
      "Scheduled game deleted. It has also been removed from the public fixture calendar."
    );
  }


  /*
   * =====================================================
   * CREATE SEASON
   * =====================================================
   */

  async function createSeason(
    e: FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can create a season."
      );

      return;
    }

    if (
      !newSeasonLeagueId
    ) {
      setError(
        "Please select a league."
      );

      return;
    }

    if (
      !newSeasonName.trim()
    ) {
      setError(
        "Please enter a season name."
      );

      return;
    }

    const year =
      Number(
        newSeasonYear
      );

    if (
      !Number.isInteger(
        year
      ) ||
      year < 1900 ||
      year > 2200
    ) {
      setError(
        "Please enter a valid season year."
      );

      return;
    }

    if (
      copyRosters &&
      !copyFromSeasonId
    ) {
      setError(
        "Please select a season to copy from."
      );

      return;
    }


    setCreatingSeason(
      true
    );


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "admin_create_season",
        {
          p_league_id:
            newSeasonLeagueId,

          p_name:
            newSeasonName.trim(),

          p_season_year:
            year,

          p_copy_from_season_id:
            copyRosters
              ? copyFromSeasonId
              : null,
        }
      );


    if (error) {
      setError(
        error.message
      );

      setCreatingSeason(
        false
      );

      return;
    }


    const createdSeason =
      Array.isArray(data)
        ? data[0]
        : data;


    await refreshSeasons(
      createdSeason?.id
    );

    await refreshTeams();


    setSuccess(
      `Season ${newSeasonName.trim()} created successfully.`
    );


    const nextYear =
      year + 1;

    setNewSeasonYear(
      String(nextYear)
    );

    setNewSeasonName(
      String(nextYear)
    );


    setCreatingSeason(
      false
    );
  }


  /*
   * =====================================================
   * EDIT / DELETE SEASON
   * =====================================================
   */

  function beginSeasonEdit(
    season: Season
  ) {
    setError("");
    setSuccess("");

    setManagingSeasonId(
      season.id
    );

    setManagingSeasonName(
      season.name
    );

    setManagingSeasonYear(
      season.season_year !==
        null
        ? String(
            season.season_year
          )
        : ""
    );
  }


  function cancelSeasonEdit() {
    setManagingSeasonId(
      null
    );

    setManagingSeasonName(
      ""
    );

    setManagingSeasonYear(
      ""
    );
  }


  async function saveSeasonEdit(
    season: Season
  ) {
    if (
      role !==
        "admin"
    ) {
      setError(
        "Only an administrator can edit a season."
      );

      return;
    }

    const name =
      managingSeasonName.trim();

    const year =
      Number(
        managingSeasonYear
      );

    if (
      !name
    ) {
      setError(
        "Season name is required."
      );

      return;
    }

    if (
      !Number.isInteger(
        year
      ) ||
      year <
        1900 ||
      year >
        2200
    ) {
      setError(
        "Season year must be between 1900 and 2200."
      );

      return;
    }

    setError("");
    setSuccess("");

    setSavingSeasonId(
      season.id
    );

    const {
      error,
    } =
      await supabase.rpc(
        "admin_update_season",
        {
          p_season_id:
            season.id,

          p_name:
            name,

          p_season_year:
            year,
        }
      );

    if (
      error
    ) {
      setError(
        error.message
      );

      setSavingSeasonId(
        null
      );

      return;
    }

    await refreshSeasons();

    setSuccess(
      `Season ${name} updated successfully.`
    );

    setSavingSeasonId(
      null
    );

    cancelSeasonEdit();
  }


  async function deleteSeason(
    season: Season
  ) {
    if (
      role !==
        "admin"
    ) {
      setError(
        "Only an administrator can delete a season."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Delete season "${season.name}"?\n\nThis removes its team memberships, manager assignments and roster memberships. Player records are kept.\n\nA season containing any games cannot be deleted.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setError("");
    setSuccess("");

    setDeletingSeasonId(
      season.id
    );

    const {
      error,
    } =
      await supabase.rpc(
        "admin_delete_season",
        {
          p_season_id:
            season.id,
        }
      );

    if (
      error
    ) {
      setError(
        error.message
      );

      setDeletingSeasonId(
        null
      );

      return;
    }

    const remaining =
      seasons.filter(
        (
          row
        ) =>
          row.id !==
          season.id
      );

    const fallbackId =
      remaining[0]?.id ??
      "";

    setSeasonId(
      (
        current
      ) =>
        current ===
        season.id
          ? fallbackId
          : current
    );

    setNewTeamSeasonId(
      (
        current
      ) =>
        current ===
        season.id
          ? fallbackId
          : current
    );

    setTeamManageSeasonId(
      (
        current
      ) =>
        current ===
        season.id
          ? fallbackId
          : current
    );

    setCopyFromSeasonId(
      (
        current
      ) =>
        current ===
        season.id
          ? fallbackId
          : current
    );

    setRosterSeasonId(
      (
        current
      ) =>
        current ===
        season.id
          ? fallbackId
          : current
    );

    if (
      rosterSeasonId ===
      season.id
    ) {
      setRosterTeamId(
        ""
      );
    }

    if (
      managingSeasonId ===
      season.id
    ) {
      cancelSeasonEdit();
    }

    await Promise.all([
      refreshSeasons(),
      refreshTeams(),
    ]);

    setSuccess(
      `Season ${season.name} deleted successfully.`
    );

    setDeletingSeasonId(
      null
    );
  }


  /*
   * =====================================================
   * EDIT / DELETE TEAM
   * =====================================================
   */

  async function beginTeamEdit(
    team: Team
  ) {
    if (
      role !== "admin" ||
      !teamManageSeasonId
    ) {
      return;
    }

    setError("");
    setSuccess("");

    const membership =
      seasonTeams.find(
        (row) =>
          row.season_id ===
            teamManageSeasonId &&
          row.team_id ===
            team.id
      );

    const {
      data: assignment,
      error: assignmentError,
    } =
      await supabase
        .from(
          "team_manager_assignments"
        )
        .select(
          "manager_email"
        )
        .eq(
          "season_id",
          teamManageSeasonId
        )
        .eq(
          "team_id",
          team.id
        )
        .maybeSingle();

    if (
      assignmentError
    ) {
      setError(
        assignmentError.message
      );
      return;
    }

    setEditingTeamId(
      team.id
    );

    setEditTeamName(
      team.name
    );

    setEditTeamDivision(
      membership?.division ??
        team.division ??
        "西岸"
    );

    setEditTeamManager(
      team.manager ?? ""
    );

    setEditTeamManagerEmail(
      assignment?.manager_email ??
        ""
    );

    setEditTeamHomeColour(
      team.home_colour ?? ""
    );

    setEditTeamAwayColour(
      team.away_colour ?? ""
    );
  }


  function cancelTeamEdit() {
    setEditingTeamId(
      null
    );

    setSavingTeamId(
      null
    );

    setEditTeamName("");
    setEditTeamManager("");
    setEditTeamManagerEmail("");
    setEditTeamHomeColour("");
    setEditTeamAwayColour("");
  }


  async function saveTeamEdit(
    team: Team
  ) {
    if (
      role !== "admin" ||
      !teamManageSeasonId
    ) {
      setError(
        "Only an administrator can edit teams."
      );
      return;
    }

    const name =
      editTeamName.trim();

    if (!name) {
      setError(
        "Team name is required."
      );
      return;
    }

    if (
      !["西岸", "東岸"].includes(
        editTeamDivision
      )
    ) {
      setError(
        "Please select West Coast or East Coast."
      );
      return;
    }

    setError("");
    setSuccess("");

    setSavingTeamId(
      team.id
    );

    const {
      error,
    } =
      await supabase.rpc(
        "admin_update_team",
        {
          p_team_id:
            team.id,

          p_season_id:
            teamManageSeasonId,

          p_name:
            name,

          p_division:
            editTeamDivision,

          p_home_colour:
            editTeamHomeColour.trim() ||
            null,

          p_away_colour:
            editTeamAwayColour.trim() ||
            null,

          p_manager:
            editTeamManager.trim() ||
            null,

          p_manager_email:
            editTeamManagerEmail.trim() ||
            null,
        }
      );

    if (error) {
      setError(
        error.message
      );

      setSavingTeamId(
        null
      );

      return;
    }

    await refreshTeams();

    setSuccess(
      `${name} updated successfully.`
    );

    cancelTeamEdit();
  }


  async function uploadTeamLogo(
    team: Team,
    file: File
  ) {
    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can upload team logos."
      );
      return;
    }

    if (
      !validImageFile(
        file
      )
    ) {
      setError(
        "Please choose a JPG, PNG, WEBP or GIF image up to 5 MB."
      );
      return;
    }

    setError("");
    setSuccess("");
    setUploadingTeamLogoId(
      team.id
    );

    const path =
      `teams/${team.id}/logo-${Date.now()}.${imageExtension(file)}`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          MEDIA_BUCKET
        )
        .upload(
          path,
          file,
          {
            cacheControl:
              "3600",
            upsert: false,
          }
        );

    if (
      uploadError
    ) {
      setError(
        uploadError.message
      );
      setUploadingTeamLogoId(
        null
      );
      return;
    }

    const {
      error: saveError,
    } =
      await supabase.rpc(
        "admin_set_team_logo",
        {
          p_team_id:
            team.id,
          p_logo_path:
            path,
        }
      );

    if (
      saveError
    ) {
      await supabase.storage
        .from(
          MEDIA_BUCKET
        )
        .remove([
          path,
        ]);

      setError(
        saveError.message
      );
      setUploadingTeamLogoId(
        null
      );
      return;
    }

    if (
      team.logo_path &&
      team.logo_path !==
        path
    ) {
      await supabase.storage
        .from(
          MEDIA_BUCKET
        )
        .remove([
          team.logo_path,
        ]);
    }

    await refreshTeams();

    setSuccess(
      `${team.name} logo updated.`
    );
    setUploadingTeamLogoId(
      null
    );
  }


  async function removeTeamLogo(
    team: Team
  ) {
    if (
      role !== "admin"
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setUploadingTeamLogoId(
      team.id
    );

    const {
      error,
    } =
      await supabase.rpc(
        "admin_set_team_logo",
        {
          p_team_id:
            team.id,
          p_logo_path:
            null,
        }
      );

    if (
      error
    ) {
      setError(
        error.message
      );
      setUploadingTeamLogoId(
        null
      );
      return;
    }

    if (
      team.logo_path
    ) {
      await supabase.storage
        .from(
          MEDIA_BUCKET
        )
        .remove([
          team.logo_path,
        ]);
    }

    await refreshTeams();

    setSuccess(
      `${team.name} logo removed.`
    );
    setUploadingTeamLogoId(
      null
    );
  }


  async function uploadPlayerPhoto(
    player:
      AdminRosterPlayer,
    file: File
  ) {
    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can upload player photos."
      );
      return;
    }

    if (
      !validImageFile(
        file
      )
    ) {
      setError(
        "Please choose a JPG, PNG, WEBP or GIF image up to 5 MB."
      );
      return;
    }

    setError("");
    setSuccess("");
    setUploadingPlayerPhotoId(
      player.player_id
    );

    const path =
      `players/${player.player_id}/photo-${Date.now()}.${imageExtension(file)}`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          MEDIA_BUCKET
        )
        .upload(
          path,
          file,
          {
            cacheControl:
              "3600",
            upsert: false,
          }
        );

    if (
      uploadError
    ) {
      setError(
        uploadError.message
      );
      setUploadingPlayerPhotoId(
        null
      );
      return;
    }

    const {
      error: saveError,
    } =
      await supabase.rpc(
        "admin_set_player_photo",
        {
          p_player_id:
            player.player_id,
          p_photo_path:
            path,
        }
      );

    if (
      saveError
    ) {
      await supabase.storage
        .from(
          MEDIA_BUCKET
        )
        .remove([
          path,
        ]);

      setError(
        saveError.message
      );
      setUploadingPlayerPhotoId(
        null
      );
      return;
    }

    if (
      player.photo_path &&
      player.photo_path !==
        path
    ) {
      await supabase.storage
        .from(
          MEDIA_BUCKET
        )
        .remove([
          player.photo_path,
        ]);
    }

    await loadRoster();

    setSuccess(
      `${player.player_name}'s photo updated.`
    );
    setUploadingPlayerPhotoId(
      null
    );
  }


  async function removePlayerPhoto(
    player:
      AdminRosterPlayer
  ) {
    if (
      role !== "admin"
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setUploadingPlayerPhotoId(
      player.player_id
    );

    const {
      error,
    } =
      await supabase.rpc(
        "admin_set_player_photo",
        {
          p_player_id:
            player.player_id,
          p_photo_path:
            null,
        }
      );

    if (
      error
    ) {
      setError(
        error.message
      );
      setUploadingPlayerPhotoId(
        null
      );
      return;
    }

    if (
      player.photo_path
    ) {
      await supabase.storage
        .from(
          MEDIA_BUCKET
        )
        .remove([
          player.photo_path,
        ]);
    }

    await loadRoster();

    setSuccess(
      `${player.player_name}'s photo removed.`
    );
    setUploadingPlayerPhotoId(
      null
    );
  }


  async function deleteTeamFromSeason(
    team: Team
  ) {
    if (
      role !== "admin" ||
      !teamManageSeasonId
    ) {
      setError(
        "Only an administrator can delete teams."
      );
      return;
    }

    const selectedSeason =
      seasons.find(
        (season) =>
          season.id ===
          teamManageSeasonId
      );

    const confirmed =
      window.confirm(
        `Delete ${team.name} from ${selectedSeason?.name ?? "this season"}?\n\nThis removes the team's roster and manager assignment for this season. If the team has any games in this season, deletion will be blocked to protect historical results and statistics.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    setDeletingTeamId(
      team.id
    );

    const {
      error,
    } =
      await supabase.rpc(
        "admin_remove_team_from_season",
        {
          p_team_id:
            team.id,

          p_season_id:
            teamManageSeasonId,
        }
      );

    if (error) {
      setError(
        error.message
      );

      setDeletingTeamId(
        null
      );

      return;
    }

    if (
      editingTeamId ===
      team.id
    ) {
      cancelTeamEdit();
    }

    if (
      rosterSeasonId ===
        teamManageSeasonId &&
      rosterTeamId ===
        team.id
    ) {
      setRosterTeamId("");
      setRosterPlayers([]);
    }

    await Promise.all([
      refreshTeams(),
      loadSeasonRosterAssignments(),
    ]);

    setDeletingTeamId(
      null
    );

    setSuccess(
      `${team.name} removed from ${selectedSeason?.name ?? "the selected season"}.`
    );
  }


  /*
   * =====================================================
   * CREATE / ADD TEAM TO SEASON
   * =====================================================
   */

  async function createTeam(
    e: FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      role !== "admin"
    ) {
      setError(
        "Only an administrator can add teams."
      );

      return;
    }

    if (
      !newTeamSeasonId
    ) {
      setError(
        "Please select a season."
      );

      return;
    }

    if (
      !newTeamName.trim()
    ) {
      setError(
        "Please enter a team name."
      );

      return;
    }

    if (
      ![
        "西岸",
        "東岸",
      ].includes(
        newTeamDivision
      )
    ) {
      setError(
        "Please select West Coast or East Coast."
      );

      return;
    }


    setCreatingTeam(
      true
    );


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "admin_create_team",
        {
          p_season_id:
            newTeamSeasonId,

          p_name:
            newTeamName.trim(),

          p_division:
            newTeamDivision,

          p_home_colour:
            newTeamHomeColour.trim() ||
            null,

          p_away_colour:
            newTeamAwayColour.trim() ||
            null,

          p_manager:
            newTeamManager.trim() ||
            null,

          p_manager_email:
            newTeamManagerEmail.trim() ||
            null,
        }
      );


    if (error) {
      setError(
        error.message
      );

      setCreatingTeam(
        false
      );

      return;
    }


    const createdTeam =
      Array.isArray(data)
        ? data[0]
        : data;


    await refreshTeams();


    const selectedSeason =
      seasons.find(
        (season) =>
          season.id ===
          newTeamSeasonId
      );


    setSuccess(
      `${createdTeam?.name ?? newTeamName} added to season ${
        selectedSeason?.name ??
        ""
      } successfully.`
    );


    /*
     * CLEAR TEAM FORM
     */

    setNewTeamName("");
    setNewTeamManager("");
    setNewTeamManagerEmail("");
    setNewTeamHomeColour("");
    setNewTeamAwayColour("");

    setCreatingTeam(
      false
    );
  }


  /*
   * =====================================================
   * CREATE GAME
   * =====================================================
   */

  async function createGame(
    e: FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !seasonId
    ) {
      setError(
        "Please select a season."
      );

      return;
    }

    if (
      !homeTeamId ||
      !awayTeamId
    ) {
      setError(
        "Please select both teams."
      );

      return;
    }

    if (
      homeTeamId ===
      awayTeamId
    ) {
      setError(
        "Home and away teams cannot be the same."
      );

      return;
    }

    if (
      q1Minutes < 1 ||
      q2Minutes < 1 ||
      q3Minutes < 1 ||
      q4Minutes < 1 ||
      q5Minutes < 1
    ) {
      setError(
        "Quarter lengths must be at least 1 minute."
      );

      return;
    }


    /*
     * GET SEASON-SPECIFIC
     * DIVISION
     */

    const homeMembership =
      seasonTeams.find(
        (row) =>
          row.season_id ===
            seasonId &&
          row.team_id ===
            homeTeamId
      );

    const awayMembership =
      seasonTeams.find(
        (row) =>
          row.season_id ===
            seasonId &&
          row.team_id ===
            awayTeamId
      );


    /*
     * If same coast:
     * save division.
     *
     * If cross-coast:
     * leave null.
     */

    const gameDivision =
      homeMembership?.division &&
      homeMembership.division ===
        awayMembership?.division
        ? homeMembership.division
        : null;


    setCreatingGame(
      true
    );


    const {
      data,
      error,
    } = await supabase
      .from("games")
      .insert({
        season_id:
          seasonId,

        source:
          "manual",

        game_date:
          gameDate,

        game_time:
          gameTime,

        venue:
          venue.trim() ||
          null,

        division:
          gameDivision,

        home_team_id:
          homeTeamId,

        away_team_id:
          awayTeamId,

        home_score: 0,
        away_score: 0,

        status:
          "scheduled",

        current_period:
          1,

        clock_running:
          false,

        /*
         * Q1 - Q4
         */

        q1_length_seconds:
          q1Minutes * 60,

        q2_length_seconds:
          q2Minutes * 60,

        q3_length_seconds:
          q3Minutes * 60,

        q4_length_seconds:
          q4Minutes * 60,

        /*
         * This existing database
         * column now represents Q5.
         */

        overtime_length_seconds:
          q5Minutes * 60,

        /*
         * Start at Q1 length
         */

        clock_seconds:
          q1Minutes * 60,

        /*
         * SCORES
         */

        q1_home: 0,
        q1_away: 0,

        q2_home: 0,
        q2_away: 0,

        q3_home: 0,
        q3_away: 0,

        q4_home: 0,
        q4_away: 0,

        q5_home: 0,
        q5_away: 0,
      })
      .select("id")
      .single();


    if (error) {
      setError(
        error.message
      );

      setCreatingGame(
        false
      );

      return;
    }


    await refreshScheduledGames();

    const homeTeam =
      teams.find(
        (team) =>
          team.id ===
          homeTeamId
      );

    const awayTeam =
      teams.find(
        (team) =>
          team.id ===
          awayTeamId
      );

    setSuccess(
      `${
        homeTeam?.name ??
        "Home team"
      } vs ${
        awayTeam?.name ??
        "Away team"
      } has been scheduled for ${gameDate}${
        gameTime
          ? ` at ${gameTime}`
          : ""
      }.`
    );

    /*
     * Keep season/date/time so it is
     * quick to schedule several games.
     * Clear only matchup-specific fields.
     */

    setHomeTeamId("");
    setAwayTeamId("");
    setVenue("");

    setCreatingGame(
      false
    );
  }


  /*
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  async function logout() {
    await supabase.auth.signOut();

    router.push("/");

    router.refresh();
  }


  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">

        <p className="text-zinc-400">
          Loading scorer dashboard...
        </p>

      </main>
    );
  }


  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">

      {/* HEADER */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <p
            className="text-sm font-black uppercase tracking-[0.18em]"
            style={{
              color:
                "var(--primary)",
            }}
          >
            {pageCopy.eyebrow}
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {pageCopy.title}
          </h1>

          <p
            className="mt-2 max-w-2xl"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            {pageCopy.description}
          </p>

        </div>


        <div className="flex items-center gap-3">

          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase text-zinc-400">
            {role}
          </span>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            Sign Out
          </button>

        </div>

      </div>


      {/* WORKSPACE NAVIGATION */}

      <nav
        className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border p-2 sm:flex sm:flex-wrap"
        style={{
          borderColor:
            "var(--border)",
          background:
            "var(--card)",
        }}
      >
        <WorkspaceNavLink
          href="/scorer"
          label="Dashboard"
          active={
            view ===
            "dashboard"
          }
        />

        <WorkspaceNavLink
          href="/scorer/games"
          label={`Games${
            ongoingGames.length >
            0
              ? ` · ${ongoingGames.length} LIVE`
              : ""
          }`}
          active={
            view ===
            "games"
          }
        />

        {role ===
          "admin" && (
          <>
            <WorkspaceNavLink
              href="/scorer/seasons"
              label="Seasons"
              active={
                view ===
                "seasons"
              }
            />

            <WorkspaceNavLink
              href="/scorer/teams"
              label="Teams"
              active={
                view ===
                "teams"
              }
            />

            <WorkspaceNavLink
              href="/scorer/highlights"
              label="Highlights"
              active={false}
            />

            <WorkspaceNavLink
              href="/scorer/photos"
              label="Photos"
              active={false}
            />
          </>
        )}
      </nav>


      {/* ERROR */}

      {error && (
        <div className="mt-8 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
          {error}
        </div>
      )}


      {/* SUCCESS */}

      {success && (
        <div className="mt-8 rounded-xl border border-green-900 bg-green-950/30 p-4 text-green-400">
          {success}
        </div>
      )}


      {view ===
        "dashboard" && (
        <section className="mt-8">

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <DashboardCard
              href="/scorer/games"
              eyebrow="Live"
              value={
                ongoingGames.length
              }
              label="Ongoing Matches"
              urgent={
                ongoingGames.length >
                0
              }
            />

            <DashboardCard
              href="/scorer/games"
              eyebrow="Fixtures"
              value={
                scheduledGames.length
              }
              label="Scheduled Games"
            />

            {role ===
              "admin" && (
              <>
                <DashboardCard
                  href="/scorer/seasons"
                  eyebrow="League"
                  value={
                    seasons.length
                  }
                  label="Seasons"
                />

                <DashboardCard
                  href="/scorer/teams"
                  eyebrow="League"
                  value={
                    teams.length
                  }
                  label="Teams"
                />
              </>
            )}

          </div>


          {ongoingGames.length >
            0 && (
            <div className="mt-8">

              <div className="flex items-end justify-between gap-4">

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">
                    Live Now
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Resume Scoring
                  </h2>
                </div>

                <Link
                  href="/scorer/games"
                  className="text-sm font-black"
                  style={{
                    color:
                      "var(--primary)",
                  }}
                >
                  All Games →
                </Link>

              </div>


              <div className="mt-4 grid gap-3">

                {ongoingGames
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      game
                    ) => {
                      const home =
                        teams.find(
                          (
                            team
                          ) =>
                            team.id ===
                            game.home_team_id
                        );

                      const away =
                        teams.find(
                          (
                            team
                          ) =>
                            team.id ===
                            game.away_team_id
                        );

                      return (
                        <Link
                          key={
                            game.id
                          }
                          href={`/scorer/${game.id}`}
                          className="grid gap-3 rounded-2xl border p-5 transition hover:-translate-y-0.5 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--danger) 40%, var(--border))",
                            background:
                              "var(--card)",
                          }}
                        >

                          <div className="min-w-0">
                            <p className="truncate font-black">
                              {home?.name ??
                                "Home"}
                            </p>
                            <p className="mt-1 text-3xl font-black tabular-nums">
                              {game.home_score ??
                                0}
                            </p>
                          </div>

                          <span className="hidden text-zinc-500 sm:block">
                            –
                          </span>

                          <div className="min-w-0 sm:text-right">
                            <p className="truncate font-black">
                              {away?.name ??
                                "Away"}
                            </p>
                            <p className="mt-1 text-3xl font-black tabular-nums">
                              {game.away_score ??
                                0}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 sm:pl-4">
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-400">
                              Q{game.current_period}
                            </span>

                            <span
                              className="font-mono text-sm font-black"
                              style={{
                                color:
                                  "var(--muted-foreground)",
                              }}
                            >
                              {formatScorerClock(
                                game.clock_seconds,
                                game.clock_running,
                                game.clock_synced_at
                              )}
                            </span>

                            <span
                              className="font-black"
                              style={{
                                color:
                                  "var(--primary)",
                              }}
                            >
                              Resume →
                            </span>
                          </div>

                        </Link>
                      );
                    }
                  )}

              </div>

            </div>
          )}


          <div className="mt-8 grid gap-4 md:grid-cols-2">

            <QuickAction
              href="/scorer/games"
              title="Game Operations"
              description="Resume a live game, edit upcoming fixtures or schedule the next match."
            />

            {role ===
              "admin" && (
              <QuickAction
                href="/scorer/teams"
                title="Manage Teams"
                description="Create teams and assign managers for the selected season."
              />
            )}

            {role ===
              "admin" && (
              <QuickAction
                href="/scorer/seasons"
                title="Manage Seasons"
                description="Set up the next season and copy existing teams and rosters."
              />
            )}

            {role ===
              "admin" && (
              <QuickAction
                href="/scorer/highlights"
                title="Manage Highlights"
                description="Quick-link YouTube videos to games and teams."
              />
            )}

            {role ===
              "admin" && (
              <QuickAction
                href="/scorer/photos"
                title="Manage Photos"
                description="Add a Google Drive folder once, then sync its photos to games and teams."
              />
            )}

            <QuickAction
              href="/games"
              title="Public Games"
              description="Open the public games and results page."
            />

          </div>

        </section>
      )}


      {(view ===
          "seasons" ||
        view ===
          "teams") &&
        role !==
          "admin" && (
          <section
            className="mt-8 rounded-2xl border p-6"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--card)",
            }}
          >
            <h2 className="text-xl font-black">
              Administrator access required
            </h2>

            <p
              className="mt-2"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              Season and team management are available to administrators only.
            </p>
          </section>
        )}


      {/* =================================================
          SEASON MANAGEMENT
          ================================================= */}

      {view === "seasons" && role === "admin" && (

        <section
          className="mt-8 rounded-2xl border p-5 sm:p-8"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
          }}
        >

          <p
            className="text-sm font-black uppercase tracking-[0.18em]"
            style={{
              color:
                "var(--primary)",
            }}
          >
            Admin
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Season Management
          </h2>

          <p
            className="mt-2"
            style={{
              color:
                "var(--muted-foreground)",
            }}
          >
            Create and manage leagues, then create, edit and safely remove seasons inside them.
          </p>


          {/* LEAGUE MANAGEMENT */}

          <div className="mt-8 rounded-2xl border p-4 sm:p-6"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--surface)",
            }}
          >

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p
                  className="text-xs font-black uppercase tracking-[0.18em]"
                  style={{
                    color:
                      "var(--primary)",
                  }}
                >
                  Leagues
                </p>

                <h3 className="mt-2 text-xl font-black">
                  League Management
                </h3>

                <p
                  className="mt-2 text-sm"
                  style={{
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  Add a new league or rename an existing one. A league can only be deleted after all of its seasons are removed.
                </p>
              </div>

              <span
                className="rounded-full px-3 py-1 text-sm font-black"
                style={{
                  background:
                    "var(--primary-soft)",
                  color:
                    "var(--primary)",
                }}
              >
                {leagues.length} league{leagues.length === 1 ? "" : "s"}
              </span>

            </div>


            <form
              onSubmit={
                createLeague
              }
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >

              <input
                type="text"
                value={
                  newLeagueName
                }
                onChange={(e) =>
                  setNewLeagueName(
                    e.target.value
                  )
                }
                placeholder="League name"
                className="min-w-0 flex-1 rounded-xl border px-4 py-3 font-bold"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--card)",
                }}
              />

              <button
                type="submit"
                disabled={
                  creatingLeague
                }
                className="rounded-xl px-5 py-3 font-black text-white disabled:opacity-40"
                style={{
                  background:
                    "var(--primary)",
                }}
              >
                {creatingLeague
                  ? "Creating..."
                  : "Add League"}
              </button>

            </form>


            {leagues.length === 0 ? (

              <div
                className="mt-5 rounded-xl border border-dashed p-5 text-center"
                style={{
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--muted-foreground)",
                }}
              >
                No leagues have been created yet.
              </div>

            ) : (

              <div className="mt-5 grid gap-3">

                {leagues.map(
                  (league) => {
                    const editing =
                      managingLeagueId ===
                      league.id;

                    const seasonCount =
                      seasons.filter(
                        (season) =>
                          season.league_id ===
                          league.id
                      ).length;

                    return (

                      <div
                        key={
                          league.id
                        }
                        className="rounded-xl border p-4"
                        style={{
                          borderColor:
                            editing
                              ? "color-mix(in srgb, var(--primary) 55%, var(--border))"
                              : "var(--border)",
                          background:
                            "var(--card)",
                        }}
                      >

                        {editing ? (

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">

                            <div className="min-w-0 flex-1">
                              <label
                                className="mb-2 block text-xs font-black uppercase tracking-wide"
                                style={{
                                  color:
                                    "var(--muted-foreground)",
                                }}
                              >
                                League Name
                              </label>

                              <input
                                type="text"
                                value={
                                  managingLeagueName
                                }
                                onChange={(e) =>
                                  setManagingLeagueName(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border px-4 py-3 font-bold"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  background:
                                    "var(--surface)",
                                }}
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={
                                  savingLeagueId ===
                                  league.id
                                }
                                onClick={() =>
                                  saveLeagueEdit(
                                    league
                                  )
                                }
                                className="rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-40"
                                style={{
                                  background:
                                    "var(--primary)",
                                }}
                              >
                                {savingLeagueId === league.id
                                  ? "Saving..."
                                  : "Save Changes"}
                              </button>

                              <button
                                type="button"
                                onClick={
                                  cancelLeagueEdit
                                }
                                className="rounded-xl border px-4 py-3 text-sm font-black"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  background:
                                    "var(--surface)",
                                }}
                              >
                                Cancel
                              </button>
                            </div>

                          </div>

                        ) : (

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div>
                              <p className="text-lg font-black">
                                {league.name}
                              </p>

                              <p
                                className="mt-1 text-sm"
                                style={{
                                  color:
                                    "var(--muted-foreground)",
                                }}
                              >
                                {seasonCount} season{seasonCount === 1 ? "" : "s"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  beginLeagueEdit(
                                    league
                                  )
                                }
                                className="rounded-xl border px-4 py-2.5 text-sm font-black"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  background:
                                    "var(--surface)",
                                  color:
                                    "var(--primary)",
                                }}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingLeagueId ===
                                    league.id ||
                                  seasonCount > 0
                                }
                                onClick={() =>
                                  deleteLeague(
                                    league
                                  )
                                }
                                title={
                                  seasonCount > 0
                                    ? "Delete the league's seasons first"
                                    : "Delete league"
                                }
                                className="rounded-xl border px-4 py-2.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
                                style={{
                                  borderColor:
                                    "color-mix(in srgb, var(--danger) 45%, var(--border))",
                                  background:
                                    "var(--surface)",
                                  color:
                                    "var(--danger)",
                                }}
                              >
                                {deletingLeagueId === league.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>

                          </div>

                        )}

                      </div>
                    );
                  }
                )}

              </div>

            )}

          </div>


          <div
            className="my-8 border-t"
            style={{
              borderColor:
                "var(--border)",
            }}
          />


          {/* EXISTING SEASONS */}

          <div className="mt-7">

            <div className="flex items-end justify-between gap-4">

              <div>

                <p
                  className="text-xs font-black uppercase tracking-[0.18em]"
                  style={{
                    color:
                      "var(--primary)",
                  }}
                >
                  Existing Seasons
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Manage Seasons
                </h3>

              </div>

              <span
                className="rounded-full px-3 py-1 text-sm font-black"
                style={{
                  background:
                    "var(--primary-soft)",
                  color:
                    "var(--primary)",
                }}
              >
                {seasons.length} seasons
              </span>

            </div>


            {seasons.length ===
            0 ? (

              <div
                className="mt-4 rounded-xl border border-dashed p-6 text-center"
                style={{
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--muted-foreground)",
                }}
              >
                No seasons have been created yet.
              </div>

            ) : (

              <div className="mt-4 grid gap-3">

                {seasons.map(
                  (
                    season
                  ) => {

                    const editing =
                      managingSeasonId ===
                      season.id;

                    const league =
                      leagues.find(
                        (
                          row
                        ) =>
                          row.id ===
                          season.league_id
                      );

                    return (

                      <div
                        key={
                          season.id
                        }
                        className="rounded-2xl border p-4 sm:p-5"
                        style={{
                          borderColor:
                            editing
                              ? "color-mix(in srgb, var(--primary) 55%, var(--border))"
                              : "var(--border)",

                          background:
                            "var(--surface)",
                        }}
                      >

                        {editing ? (

                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">

                            <div>

                              <label
                                className="mb-2 block text-xs font-black uppercase tracking-wide"
                                style={{
                                  color:
                                    "var(--muted-foreground)",
                                }}
                              >
                                Season Name
                              </label>

                              <input
                                type="text"
                                value={
                                  managingSeasonName
                                }
                                onChange={(e) =>
                                  setManagingSeasonName(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border px-4 py-3 font-bold"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  background:
                                    "var(--card)",
                                }}
                              />

                            </div>


                            <div>

                              <label
                                className="mb-2 block text-xs font-black uppercase tracking-wide"
                                style={{
                                  color:
                                    "var(--muted-foreground)",
                                }}
                              >
                                Season Year
                              </label>

                              <input
                                type="number"
                                min="1900"
                                max="2200"
                                value={
                                  managingSeasonYear
                                }
                                onChange={(e) =>
                                  setManagingSeasonYear(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border px-4 py-3 font-bold"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  background:
                                    "var(--card)",
                                }}
                              />

                            </div>


                            <div className="flex flex-wrap gap-2">

                              <button
                                type="button"
                                disabled={
                                  savingSeasonId ===
                                  season.id
                                }
                                onClick={() =>
                                  saveSeasonEdit(
                                    season
                                  )
                                }
                                className="rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-40"
                                style={{
                                  background:
                                    "var(--primary)",
                                }}
                              >
                                {savingSeasonId ===
                                season.id
                                  ? "Saving..."
                                  : "Save Changes"}
                              </button>


                              <button
                                type="button"
                                onClick={
                                  cancelSeasonEdit
                                }
                                className="rounded-xl border px-4 py-3 text-sm font-black"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  background:
                                    "var(--card)",
                                }}
                              >
                                Cancel
                              </button>

                            </div>

                          </div>

                        ) : (

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <p className="text-lg font-black">
                                  {season.name}
                                </p>

                                {season.season_year !==
                                null && (
                                  <span
                                    className="rounded-full px-2.5 py-1 text-xs font-black"
                                    style={{
                                      background:
                                        "var(--card)",
                                      color:
                                        "var(--muted-foreground)",
                                    }}
                                  >
                                    {season.season_year}
                                  </span>
                                )}

                              </div>

                              <p
                                className="mt-1 text-sm"
                                style={{
                                  color:
                                    "var(--muted-foreground)",
                                }}
                              >
                                {league?.name ??
                                  "League"}
                              </p>

                            </div>


                            <div className="flex flex-wrap gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  beginSeasonEdit(
                                    season
                                  )
                                }
                                className="rounded-xl border px-4 py-2.5 text-sm font-black"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  background:
                                    "var(--card)",
                                  color:
                                    "var(--primary)",
                                }}
                              >
                                Edit
                              </button>


                              <button
                                type="button"
                                disabled={
                                  deletingSeasonId ===
                                  season.id
                                }
                                onClick={() =>
                                  deleteSeason(
                                    season
                                  )
                                }
                                className="rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-40"
                                style={{
                                  borderColor:
                                    "color-mix(in srgb, var(--danger) 45%, var(--border))",
                                  background:
                                    "var(--card)",
                                  color:
                                    "var(--danger)",
                                }}
                              >
                                {deletingSeasonId ===
                                season.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>

                            </div>

                          </div>

                        )}

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </div>


          <div
            className="my-8 border-t"
            style={{
              borderColor:
                "var(--border)",
            }}
          />


          <div>

            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color:
                  "var(--primary)",
              }}
            >
              New Season
            </p>

            <h3 className="mt-2 text-xl font-black">
              Create Season
            </h3>

          </div>


          <form
            onSubmit={
              createSeason
            }
            className="mt-8 space-y-6"
          >

            <div className="grid gap-5 md:grid-cols-3">

              {/* LEAGUE */}

              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  League
                </label>

                <select
                  value={
                    newSeasonLeagueId
                  }
                  onChange={(e) =>
                    setNewSeasonLeagueId(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                >

                  <option value="">
                    Select League
                  </option>

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


              {/* NAME */}

              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Season Name
                </label>

                <input
                  type="text"
                  value={
                    newSeasonName
                  }
                  onChange={(e) =>
                    setNewSeasonName(
                      e.target.value
                    )
                  }
                  placeholder="2027"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                />

              </div>


              {/* YEAR */}

              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Season Year
                </label>

                <input
                  type="number"
                  min="1900"
                  max="2200"
                  value={
                    newSeasonYear
                  }
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setNewSeasonYear(
                      value
                    );

                    if (
                      /^\d{0,4}$/.test(
                        newSeasonName
                      )
                    ) {
                      setNewSeasonName(
                        value
                      );
                    }
                  }}
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                />

              </div>

            </div>


            {/* COPY */}

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">

              <label className="flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  checked={
                    copyRosters
                  }
                  onChange={(e) =>
                    setCopyRosters(
                      e.target.checked
                    )
                  }
                  className="mt-1 h-5 w-5"
                />

                <div>

                  <p className="font-bold">
                    Copy teams and rosters from previous season
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Useful when most teams and players remain the same next season.
                  </p>

                </div>

              </label>


              {copyRosters && (

                <div className="mt-5">

                  <label className="mb-2 block text-sm text-zinc-400">
                    Copy From
                  </label>

                  <select
                    value={
                      copyFromSeasonId
                    }
                    onChange={(e) =>
                      setCopyFromSeasonId(
                        e.target.value
                      )
                    }
                    className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                  >

                    <option value="">
                      Select Season
                    </option>

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
                          {season.name}
                        </option>

                      )
                    )}

                  </select>

                </div>

              )}

            </div>


            <button
              type="submit"
              disabled={
                creatingSeason
              }
              className="rounded-xl bg-blue-600 px-6 py-4 font-black text-white hover:bg-blue-500 disabled:opacity-40"
            >
              {creatingSeason
                ? "Creating Season..."
                : "Add Season"}
            </button>

          </form>

        </section>

      )}


      {/* =================================================
          TEAM MANAGEMENT
          ================================================= */}

      {view === "teams" && role === "admin" && (

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Admin
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Team Management
          </h2>

          <p className="mt-2 text-zinc-400">
            Create a new team or add an existing team to another season.
          </p>


          <form
            onSubmit={
              createTeam
            }
            className="mt-8 space-y-6"
          >

            {/* SEASON + COAST */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Season
                </label>

                <select
                  value={
                    newTeamSeasonId
                  }
                  onChange={(e) =>
                    setNewTeamSeasonId(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                >

                  <option value="">
                    Select Season
                  </option>

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
                        {season.name}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Coast
                </label>

                <select
                  value={
                    newTeamDivision
                  }
                  onChange={(e) =>
                    setNewTeamDivision(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                >

                  <option value="西岸">
                    West Coast
                  </option>

                  <option value="東岸">
                    East Coast
                  </option>

                </select>

              </div>

            </div>


            {/* TEAM NAME */}

            <div>

              <label className="mb-2 block text-sm text-zinc-400">
                Team Name
              </label>

              <input
                type="text"
                list="existing-team-names"
                value={
                  newTeamName
                }
                onChange={(e) =>
                  setNewTeamName(
                    e.target.value
                  )
                }
                placeholder="Enter team name"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
              />

              <datalist id="existing-team-names">

                {teams.map(
                  (team) => (

                    <option
                      key={
                        team.id
                      }
                      value={
                        team.name
                      }
                    />

                  )
                )}

              </datalist>

              <p className="mt-2 text-xs text-zinc-500">
                You can type a brand-new team or select an existing team name.
              </p>

            </div>


            {/* TEAM DETAILS */}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Manager
                </label>

                <input
                  type="text"
                  value={
                    newTeamManager
                  }
                  onChange={(e) =>
                    setNewTeamManager(
                      e.target.value
                    )
                  }
                  placeholder="Manager name"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Manager Email
                </label>

                <input
                  type="email"
                  value={
                    newTeamManagerEmail
                  }
                  onChange={(e) =>
                    setNewTeamManagerEmail(
                      e.target.value
                    )
                  }
                  placeholder="manager@email.com"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  The manager should register using this exact email address.
                </p>

              </div>


              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Home Colour
                </label>

                <input
                  type="text"
                  value={
                    newTeamHomeColour
                  }
                  onChange={(e) =>
                    setNewTeamHomeColour(
                      e.target.value
                    )
                  }
                  placeholder="e.g. White"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Away Colour
                </label>

                <input
                  type="text"
                  value={
                    newTeamAwayColour
                  }
                  onChange={(e) =>
                    setNewTeamAwayColour(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Red"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                />

              </div>

            </div>


            <button
              type="submit"
              disabled={
                creatingTeam
              }
              className="rounded-xl bg-blue-600 px-6 py-4 font-black text-white hover:bg-blue-500 disabled:opacity-40"
            >
              {creatingTeam
                ? "Adding Team..."
                : "Add Team"}
            </button>

          </form>


          <div
            className="my-8 border-t"
            style={{
              borderColor:
                "var(--border)",
            }}
          />


          <div>

            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color:
                  "var(--primary)",
              }}
            >
              Existing Teams
            </p>

            <h3 className="mt-2 text-xl font-black">
              Edit or Delete Team
            </h3>

            <p
              className="mt-2 max-w-3xl text-sm leading-6"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              Edit the team name, coast, manager and kit colours. Delete removes the team from the selected season and is blocked if that team already has games in the season.
            </p>

          </div>


          <div className="mt-6 max-w-sm">

            <label className="mb-2 block text-sm text-zinc-400">
              Season
            </label>

            <select
              value={
                teamManageSeasonId
              }
              onChange={(e) => {
                setTeamManageSeasonId(
                  e.target.value
                );

                cancelTeamEdit();
              }}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            >

              <option value="">
                Select Season
              </option>

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
                    {season.name}
                  </option>
                )
              )}

            </select>

          </div>


          <div className="mt-6 space-y-4">

            {managedTeams.map(
              (team) => {
                const membership =
                  seasonTeams.find(
                    (row) =>
                      row.season_id ===
                        teamManageSeasonId &&
                      row.team_id ===
                        team.id
                  );

                const editing =
                  editingTeamId ===
                  team.id;

                return (
                  <div
                    key={
                      team.id
                    }
                    className="rounded-2xl border p-4 sm:p-5"
                    style={{
                      borderColor:
                        "var(--border)",
                      background:
                        "var(--surface)",
                    }}
                  >

                    {editing ? (

                      <div className="space-y-5">

                        <div className="grid gap-4 md:grid-cols-2">

                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">
                              Team Name
                            </label>
                            <input
                              type="text"
                              value={
                                editTeamName
                              }
                              onChange={(e) =>
                                setEditTeamName(
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">
                              Coast
                            </label>
                            <select
                              value={
                                editTeamDivision
                              }
                              onChange={(e) =>
                                setEditTeamDivision(
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                            >
                              <option value="西岸">
                                West Coast
                              </option>
                              <option value="東岸">
                                East Coast
                              </option>
                            </select>
                          </div>

                        </div>


                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">
                              Manager
                            </label>
                            <input
                              type="text"
                              value={
                                editTeamManager
                              }
                              onChange={(e) =>
                                setEditTeamManager(
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">
                              Manager Email
                            </label>
                            <input
                              type="email"
                              value={
                                editTeamManagerEmail
                              }
                              onChange={(e) =>
                                setEditTeamManagerEmail(
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">
                              Home Colour
                            </label>
                            <input
                              type="text"
                              value={
                                editTeamHomeColour
                              }
                              onChange={(e) =>
                                setEditTeamHomeColour(
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">
                              Away Colour
                            </label>
                            <input
                              type="text"
                              value={
                                editTeamAwayColour
                              }
                              onChange={(e) =>
                                setEditTeamAwayColour(
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
                            />
                          </div>

                        </div>


                        <div
                          className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center"
                          style={{
                            borderColor:
                              "var(--border)",
                            background:
                              "var(--card)",
                          }}
                        >
                          <div
                            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border text-2xl font-black"
                            style={{
                              borderColor:
                                "var(--border)",
                              background:
                                "var(--surface)",
                              color:
                                "var(--primary)",
                            }}
                          >
                            {team.logo_path ? (
                              <img
                                src={
                                  mediaPublicUrl(
                                    team.logo_path
                                  ) ??
                                  ""
                                }
                                alt={`${team.name} logo`}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              team.name
                                .trim()
                                .slice(
                                  0,
                                  2
                                )
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-black">
                              Team Logo
                            </p>
                            <p
                              className="mt-1 text-xs"
                              style={{
                                color:
                                  "var(--muted-foreground)",
                              }}
                            >
                              JPG, PNG, WEBP or GIF. Maximum 5 MB.
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <label
                                className="cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-black"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  color:
                                    "var(--primary)",
                                }}
                              >
                                {uploadingTeamLogoId ===
                                team.id
                                  ? "Uploading..."
                                  : team.logo_path
                                  ? "Replace Logo"
                                  : "Upload Logo"}

                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  disabled={
                                    uploadingTeamLogoId ===
                                    team.id
                                  }
                                  className="hidden"
                                  onChange={(e) => {
                                    const file =
                                      e.currentTarget.files?.[0];

                                    e.currentTarget.value =
                                      "";

                                    if (file) {
                                      void uploadTeamLogo(
                                        team,
                                        file
                                      );
                                    }
                                  }}
                                />
                              </label>

                              {team.logo_path && (
                                <button
                                  type="button"
                                  disabled={
                                    uploadingTeamLogoId ===
                                    team.id
                                  }
                                  onClick={() =>
                                    void removeTeamLogo(
                                      team
                                    )
                                  }
                                  className="rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-40"
                                  style={{
                                    borderColor:
                                      "color-mix(in srgb, var(--danger) 45%, var(--border))",
                                    color:
                                      "var(--danger)",
                                  }}
                                >
                                  Remove Logo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>


                        <div className="flex flex-wrap gap-2">

                          <button
                            type="button"
                            disabled={
                              savingTeamId ===
                              team.id
                            }
                            onClick={() =>
                              saveTeamEdit(
                                team
                              )
                            }
                            className="rounded-xl px-5 py-3 text-sm font-black text-white disabled:opacity-40"
                            style={{
                              background:
                                "var(--primary)",
                            }}
                          >
                            {savingTeamId ===
                            team.id
                              ? "Saving..."
                              : "Save Changes"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelTeamEdit
                            }
                            className="rounded-xl border px-5 py-3 text-sm font-black"
                            style={{
                              borderColor:
                                "var(--border)",
                              background:
                                "var(--card)",
                            }}
                          >
                            Cancel
                          </button>

                        </div>

                      </div>

                    ) : (

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-3">
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-sm font-black"
                              style={{
                                borderColor:
                                  "var(--border)",
                                background:
                                  "var(--card)",
                                color:
                                  "var(--primary)",
                              }}
                            >
                              {team.logo_path ? (
                                <img
                                  src={
                                    mediaPublicUrl(
                                      team.logo_path
                                    ) ??
                                    ""
                                  }
                                  alt={`${team.name} logo`}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                team.name
                                  .trim()
                                  .slice(
                                    0,
                                    2
                                  )
                                  .toUpperCase()
                              )}
                            </div>

                            <p className="text-lg font-black">
                              {team.name}
                            </p>

                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-black"
                              style={{
                                background:
                                  "var(--card)",
                                color:
                                  "var(--primary)",
                              }}
                            >
                              {membership?.division ===
                              "西岸"
                                ? "West"
                                : membership?.division ===
                                  "東岸"
                                ? "East"
                                : "—"}
                            </span>
                          </div>

                          <p
                            className="mt-2 text-sm"
                            style={{
                              color:
                                "var(--muted-foreground)",
                            }}
                          >
                            Manager: {team.manager || "—"} · Home: {team.home_colour || "—"} · Away: {team.away_colour || "—"}
                          </p>

                        </div>


                        <div className="flex flex-wrap gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              beginTeamEdit(
                                team
                              )
                            }
                            className="rounded-xl border px-4 py-2.5 text-sm font-black"
                            style={{
                              borderColor:
                                "var(--border)",
                              background:
                                "var(--card)",
                              color:
                                "var(--primary)",
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={
                              deletingTeamId ===
                              team.id
                            }
                            onClick={() =>
                              deleteTeamFromSeason(
                                team
                              )
                            }
                            className="rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-40"
                            style={{
                              borderColor:
                                "color-mix(in srgb, var(--danger) 45%, var(--border))",
                              background:
                                "var(--card)",
                              color:
                                "var(--danger)",
                            }}
                          >
                            {deletingTeamId ===
                            team.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>

                      </div>

                    )}

                  </div>
                );
              }
            )}


            {teamManageSeasonId &&
              managedTeams.length ===
                0 && (
                <p
                  className="rounded-xl border border-dashed p-6 text-center text-sm"
                  style={{
                    borderColor:
                      "var(--border)",
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  No teams are assigned to this season yet.
                </p>
              )}

          </div>

        </section>

      )}


      {/* =================================================
          ROSTER MANAGEMENT
          ================================================= */}

      {view ===
        "teams" &&
        role ===
          "admin" && (

        <section
          className="mt-8 rounded-2xl border p-5 sm:p-8"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
          }}
        >

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <p
                className="text-xs font-black uppercase tracking-[0.18em]"
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                Rosters
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Add or Remove Players
              </h2>

              <p
                className="mt-2 max-w-2xl text-sm leading-6"
                style={{
                  color:
                    "var(--muted-foreground)",
                }}
              >
                Select a season and team, then manage that team's active roster. Removing a player does not delete the player or their historical records.
              </p>

            </div>


            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">

              <div>

                <label
                  className="mb-2 block text-xs font-black uppercase tracking-wide"
                  style={{
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  Season
                </label>

                <select
                  value={
                    rosterSeasonId
                  }
                  onChange={(e) => {
                    setRosterSeasonId(
                      e.target.value
                    );

                    setRosterTeamId("");
                    setExistingRosterPlayerId("");
                  }}
                  className="w-full rounded-xl border px-4 py-3 font-bold"
                  style={{
                    borderColor:
                      "var(--border)",
                    background:
                      "var(--surface)",
                  }}
                >
                  <option value="">
                    Select Season
                  </option>

                  {seasons.map(
                    (
                      season
                    ) => (
                      <option
                        key={
                          season.id
                        }
                        value={
                          season.id
                        }
                      >
                        {season.name}
                      </option>
                    )
                  )}

                </select>

              </div>


              <div>

                <label
                  className="mb-2 block text-xs font-black uppercase tracking-wide"
                  style={{
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  Team
                </label>

                <select
                  value={
                    rosterTeamId
                  }
                  onChange={(e) => {
                    setRosterTeamId(
                      e.target.value
                    );

                    setExistingRosterPlayerId("");
                  }}
                  disabled={
                    !rosterSeasonId ||
                    rosterTeams.length ===
                      0
                  }
                  className="w-full rounded-xl border px-4 py-3 font-bold disabled:opacity-40"
                  style={{
                    borderColor:
                      "var(--border)",
                    background:
                      "var(--surface)",
                  }}
                >
                  <option value="">
                    Select Team
                  </option>

                  {rosterTeams.map(
                    (
                      team
                    ) => (
                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                      >
                        {team.name}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>

          </div>


          {!rosterSeasonId ? (

            <div
              className="mt-7 rounded-xl border border-dashed p-8 text-center"
              style={{
                borderColor:
                  "var(--border)",
                color:
                  "var(--muted-foreground)",
              }}
            >
              Select a season to manage a roster.
            </div>

          ) : rosterTeams.length ===
            0 ? (

            <div
              className="mt-7 rounded-xl border border-dashed p-8 text-center"
              style={{
                borderColor:
                  "var(--border)",
                color:
                  "var(--muted-foreground)",
              }}
            >
              There are no teams in this season yet.
            </div>

          ) : rosterTeamId ? (

            <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">

              {/* CURRENT ROSTER */}

              <div
                className="overflow-hidden rounded-2xl border"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--surface)",
                }}
              >

                <div
                  className="flex items-center justify-between gap-4 border-b px-5 py-4"
                  style={{
                    borderColor:
                      "var(--border)",
                    background:
                      "var(--card)",
                  }}
                >

                  <div>
                    <p className="font-black">
                      {
                        teams.find(
                          (
                            team
                          ) =>
                            team.id ===
                            rosterTeamId
                        )?.name ??
                        "Selected Team"
                      }
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color:
                          "var(--muted-foreground)",
                      }}
                    >
                      Edit player names and jersey numbers. Name changes apply to the same player everywhere.
                    </p>
                  </div>

                  <span
                    className="rounded-full px-3 py-1 text-sm font-black"
                    style={{
                      background:
                        "var(--primary-soft)",
                      color:
                        "var(--primary)",
                    }}
                  >
                    {rosterPlayers.length} players
                  </span>

                </div>


                {rosterLoading ? (

                  <div
                    className="p-8 text-center text-sm"
                    style={{
                      color:
                        "var(--muted-foreground)",
                    }}
                  >
                    Loading roster...
                  </div>

                ) : rosterPlayers.length ===
                  0 ? (

                  <div
                    className="p-8 text-center text-sm"
                    style={{
                      color:
                        "var(--muted-foreground)",
                    }}
                  >
                    No players are currently on this roster.
                  </div>

                ) : (

                  <div className="divide-y divide-zinc-800">

                    {rosterPlayers.map(
                      (
                        player
                      ) => (

                        <div
                          key={
                            player.roster_id
                          }
                          className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-5"
                        >

                          <div className="group relative">
                            <label
                              className="flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-xl border text-xs font-black"
                              style={{
                                borderColor:
                                  "var(--border)",
                                background:
                                  "var(--card)",
                                color:
                                  "var(--primary)",
                              }}
                              title="Upload player photo"
                            >
                              {player.photo_path ? (
                                <img
                                  src={
                                    mediaPublicUrl(
                                      player.photo_path
                                    ) ??
                                    ""
                                  }
                                  alt={player.player_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                player.player_name
                                  .trim()
                                  .slice(
                                    0,
                                    2
                                  )
                                  .toUpperCase()
                              )}

                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                disabled={
                                  uploadingPlayerPhotoId ===
                                  player.player_id
                                }
                                className="hidden"
                                onChange={(e) => {
                                  const file =
                                    e.currentTarget.files?.[0];

                                  e.currentTarget.value =
                                    "";

                                  if (file) {
                                    void uploadPlayerPhoto(
                                      player,
                                      file
                                    );
                                  }
                                }}
                              />
                            </label>

                            {player.photo_path && (
                              <button
                                type="button"
                                disabled={
                                  uploadingPlayerPhotoId ===
                                  player.player_id
                                }
                                onClick={() =>
                                  void removePlayerPhoto(
                                    player
                                  )
                                }
                                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black"
                                style={{
                                  borderColor:
                                    "var(--border)",
                                  background:
                                    "var(--card)",
                                  color:
                                    "var(--danger)",
                                }}
                                title="Remove player photo"
                                aria-label={`Remove photo for ${player.player_name}`}
                              >
                                ×
                              </button>
                            )}
                          </div>


                          <div className="flex items-center gap-2">

                            <span className="font-black">
                              #
                            </span>

                            <input
                              type="number"
                              min="0"
                              max="999"
                              value={
                                player.jersey_number ??
                                ""
                              }
                              onChange={(e) => {
                                const value =
                                  e.target.value;

                                setRosterPlayers(
                                  (current) =>
                                    current.map(
                                      (row) =>
                                        row.player_id ===
                                        player.player_id
                                          ? {
                                              ...row,
                                              jersey_number:
                                                value ===
                                                ""
                                                  ? null
                                                  : Number(
                                                      value
                                                    ),
                                            }
                                          : row
                                    )
                                );
                              }}
                              aria-label={`Jersey number for ${player.player_name}`}
                              className="h-11 w-[76px] rounded-xl border px-3 text-center font-black tabular-nums"
                              style={{
                                borderColor:
                                  "var(--border)",
                                background:
                                  "var(--card)",
                              }}
                            />

                          </div>


                          <div className="min-w-0">

                            <input
                              type="text"
                              value={
                                player.player_name
                              }
                              onChange={(e) => {
                                const value =
                                  e.target.value;

                                setRosterPlayers(
                                  (current) =>
                                    current.map(
                                      (row) =>
                                        row.player_id ===
                                        player.player_id
                                          ? {
                                              ...row,
                                              player_name:
                                                value,
                                            }
                                          : row
                                    )
                                );
                              }}
                              aria-label={`Player name for ${player.player_name}`}
                              className="h-11 w-full rounded-xl border px-3 font-black"
                              style={{
                                borderColor:
                                  "var(--border)",
                                background:
                                  "var(--card)",
                              }}
                            />

                            <p
                              className="mt-1 text-xs"
                              style={{
                                color:
                                  "var(--muted-foreground)",
                              }}
                            >
                              Player ID:{" "}
                              {player.player_id.slice(
                                0,
                                8
                              )}
                              …
                            </p>

                            {uploadingPlayerPhotoId ===
                              player.player_id && (
                              <p
                                className="mt-1 text-xs font-bold"
                                style={{
                                  color:
                                    "var(--primary)",
                                }}
                              >
                                Uploading photo...
                              </p>
                            )}

                          </div>


                          <div className="flex items-center gap-2">

                            <button
                              type="button"
                              disabled={
                                updatingRosterPlayerId ===
                                player.player_id
                              }
                              onClick={() =>
                                updateRosterPlayerDetails(
                                  player
                                )
                              }
                              className="whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-black disabled:opacity-40"
                              style={{
                                borderColor:
                                  "var(--border)",
                                color:
                                  "var(--primary)",
                                background:
                                  "var(--card)",
                              }}
                            >
                              {updatingRosterPlayerId ===
                              player.player_id
                                ? "Saving..."
                                : "Save Changes"}
                            </button>


                            <button
                              type="button"
                              disabled={
                                removingRosterPlayerId ===
                                player.player_id
                              }
                              onClick={() =>
                                removeRosterPlayer(
                                  player
                                )
                              }
                              className="rounded-xl border px-3 py-2 text-sm font-black disabled:opacity-40"
                              style={{
                                borderColor:
                                  "color-mix(in srgb, var(--danger) 45%, var(--border))",
                                color:
                                  "var(--danger)",
                                background:
                                  "var(--card)",
                              }}
                            >
                              {removingRosterPlayerId ===
                              player.player_id
                                ? "Removing..."
                                : "Remove"}
                            </button>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>


              {/* ADD PLAYER */}

              <form
                onSubmit={
                  addRosterPlayer
                }
                className="rounded-2xl border p-5"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--surface)",
                }}
              >

                <p
                  className="text-xs font-black uppercase tracking-[0.18em]"
                  style={{
                    color:
                      "var(--primary)",
                  }}
                >
                  Add Player
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Add to Roster
                </h3>


                <div
                  className="mt-5 grid grid-cols-2 gap-2 rounded-xl p-1"
                  style={{
                    background:
                      "var(--card)",
                  }}
                >

                  <button
                    type="button"
                    onClick={() => {
                      setAddPlayerMode(
                        "new"
                      );

                      setExistingRosterPlayerId("");
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-black"
                    style={{
                      background:
                        addPlayerMode ===
                        "new"
                          ? "var(--primary)"
                          : "transparent",

                      color:
                        addPlayerMode ===
                        "new"
                          ? "white"
                          : "var(--foreground)",
                    }}
                  >
                    New Player
                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      setAddPlayerMode(
                        "existing"
                      );

                      setNewRosterPlayerName("");
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-black"
                    style={{
                      background:
                        addPlayerMode ===
                        "existing"
                          ? "var(--primary)"
                          : "transparent",

                      color:
                        addPlayerMode ===
                        "existing"
                          ? "white"
                          : "var(--foreground)",
                    }}
                  >
                    Existing Player
                  </button>

                </div>


                {addPlayerMode ===
                "new" ? (

                  <div className="mt-5">

                    <label
                      className="mb-2 block text-sm font-bold"
                      style={{
                        color:
                          "var(--muted-foreground)",
                      }}
                    >
                      Player Name
                    </label>

                    <input
                      type="text"
                      value={
                        newRosterPlayerName
                      }
                      onChange={(e) =>
                        setNewRosterPlayerName(
                          e.target.value
                        )
                      }
                      placeholder="Enter player name"
                      className="w-full rounded-xl border px-4 py-3"
                      style={{
                        borderColor:
                          "var(--border)",
                        background:
                          "var(--card)",
                      }}
                    />

                  </div>

                ) : (

                  <div className="mt-5">

                    <label
                      className="mb-2 block text-sm font-bold"
                      style={{
                        color:
                          "var(--muted-foreground)",
                      }}
                    >
                      Existing Player
                    </label>

                    <select
                      value={
                        existingRosterPlayerId
                      }
                      onChange={(e) =>
                        setExistingRosterPlayerId(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      style={{
                        borderColor:
                          "var(--border)",
                        background:
                          "var(--card)",
                      }}
                    >
                      <option value="">
                        Select Player
                      </option>

                      {availableExistingPlayers.map(
                        (
                          player
                        ) => (
                          <option
                            key={
                              player.id
                            }
                            value={
                              player.id
                            }
                          >
                            {player.name}
                          </option>
                        )
                      )}

                    </select>

                    <p
                      className="mt-2 text-xs leading-5"
                      style={{
                        color:
                          "var(--muted-foreground)",
                      }}
                    >
                      Only players not already registered to a team in this season are shown.
                    </p>

                  </div>

                )}


                <div className="mt-5">

                  <label
                    className="mb-2 block text-sm font-bold"
                    style={{
                      color:
                        "var(--muted-foreground)",
                    }}
                  >
                    Jersey Number
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={
                      rosterJerseyNumber
                    }
                    onChange={(e) =>
                      setRosterJerseyNumber(
                        e.target.value
                      )
                    }
                    placeholder="Optional"
                    className="w-full rounded-xl border px-4 py-3"
                    style={{
                      borderColor:
                        "var(--border)",
                      background:
                        "var(--card)",
                    }}
                  />

                </div>


                <button
                  type="submit"
                  disabled={
                    addingRosterPlayer
                  }
                  className="mt-6 w-full rounded-xl px-5 py-3 font-black text-white disabled:opacity-40"
                  style={{
                    background:
                      "var(--primary)",
                  }}
                >
                  {addingRosterPlayer
                    ? "Adding Player..."
                    : "+ Add Player"}
                </button>

              </form>

            </div>

          ) : null}

        </section>

      )}


      {/* =================================================
          ONGOING GAMES
          ================================================= */}

      {view === "games" && (

        <section className="mt-10 rounded-2xl border border-red-900/50 bg-zinc-900 p-5 sm:p-8">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-sm uppercase tracking-widest text-red-400">
              Live
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Ongoing Matches
            </h2>

            <p className="mt-2 text-zinc-400">
              If you leave a live scorer, resume it here without starting a new match.
            </p>

          </div>

          <div className="rounded-full border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm font-bold text-red-400">
            {ongoingGames.length} live
          </div>

        </div>


        <div className="mt-6 space-y-3">

          {ongoingGames.length === 0 && (

            <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-500">
              No match is currently live.
            </div>

          )}


          {ongoingGames.map(
            (game) => {
              const home =
                teams.find(
                  (team) =>
                    team.id ===
                    game.home_team_id
                );

              const away =
                teams.find(
                  (team) =>
                    team.id ===
                    game.away_team_id
                );

              return (
                <div
                  key={
                    game.id
                  }
                  className="rounded-xl border border-red-900/40 bg-zinc-950 p-4 sm:p-5"
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2 text-xs">

                        <span className="rounded-full bg-red-500/10 px-3 py-1 font-black text-red-400">
                          LIVE · Q{game.current_period}
                        </span>

                        <span className="text-zinc-500">
                          {formatGameDate(
                            game.game_date
                          )}
                        </span>

                        <span className="font-mono font-black text-zinc-300">
                          {formatScorerClock(
                            game.clock_seconds,
                            game.clock_running,
                            game.clock_synced_at
                          )}
                        </span>

                      </div>


                      <div className="mt-3 flex min-w-0 items-center gap-3 text-lg">

                        <span className="min-w-0 truncate font-black">
                          {home?.name ?? "Home"}
                        </span>

                        <span className="shrink-0 text-2xl font-black tabular-nums">
                          {game.home_score ?? 0}
                        </span>

                        <span className="shrink-0 text-zinc-600">
                          –
                        </span>

                        <span className="shrink-0 text-2xl font-black tabular-nums">
                          {game.away_score ?? 0}
                        </span>

                        <span className="min-w-0 truncate font-black">
                          {away?.name ?? "Away"}
                        </span>

                      </div>

                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/scorer/${game.id}`
                        )
                      }
                      className="min-h-12 shrink-0 rounded-xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500"
                    >
                      Resume Scoring
                    </button>

                  </div>

                </div>
              );
            }
          )}

        </div>

      </section>

      )}


      {/* =================================================
          SCHEDULED GAMES
          ================================================= */}

      {view === "games" && (

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-sm uppercase tracking-widest text-zinc-500">
              Fixtures
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Scheduled Games
            </h2>

            <p className="mt-2 text-zinc-400">
              Open a fixture when it is time to score. Admins can edit or delete it before it starts.
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/games"
                )
              }
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
            >
              Public Calendar
            </button>

            <div className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-400">
              {scheduledGames.length} scheduled
            </div>

          </div>

        </div>


        <div className="mt-7 space-y-4">

          {scheduledGames.length === 0 && (

            <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500">
              No games are currently scheduled.
            </div>

          )}


          {scheduledGames.map(
            (game) => {
              const home =
                teams.find(
                  (team) =>
                    team.id ===
                    game.home_team_id
                );

              const away =
                teams.find(
                  (team) =>
                    team.id ===
                    game.away_team_id
                );

              const season =
                seasons.find(
                  (row) =>
                    row.id ===
                    game.season_id
                );

              const isEditing =
                editingGameId ===
                game.id;

              return (
                <div
                  key={
                    game.id
                  }
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
                >

                  {!isEditing && (

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      <div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">

                          <span className="rounded-full border border-zinc-800 px-3 py-1">
                            Season {season?.name ?? "—"}
                          </span>

                          <span>
                            {formatGameDate(
                              game.game_date
                            )}
                          </span>

                          {game.game_time && (
                            <span>
                              {formatGameTime(
                                game.game_time
                              )}
                            </span>
                          )}

                        </div>


                        <div className="mt-4 flex flex-wrap items-center gap-3 text-lg">

                          <span className="font-black">
                            {home?.name ?? "Home Team"}
                          </span>

                          <span className="text-zinc-600">
                            vs
                          </span>

                          <span className="font-black">
                            {away?.name ?? "Away Team"}
                          </span>

                        </div>


                        <p className="mt-2 text-sm text-zinc-500">
                          {game.venue?.trim()
                            ? game.venue
                            : "Venue not set"}
                        </p>


                        <p className="mt-2 text-xs text-zinc-600">
                          Q1 {secondsToMinutes(game.q1_length_seconds, 10)}m
                          {" · "}
                          Q2 {secondsToMinutes(game.q2_length_seconds, 10)}m
                          {" · "}
                          Q3 {secondsToMinutes(game.q3_length_seconds, 10)}m
                          {" · "}
                          Q4 {secondsToMinutes(game.q4_length_seconds, 10)}m
                          {" · "}
                          Q5 {secondsToMinutes(game.overtime_length_seconds, 5)}m
                        </p>

                      </div>


                      <div className="flex flex-wrap gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/scorer/${game.id}`
                            )
                          }
                          className="rounded-xl bg-white px-5 py-3 font-black text-black hover:bg-zinc-200"
                        >
                          Open Scorer
                        </button>


                        {role === "admin" && (

                          <>

                            <button
                              type="button"
                              onClick={() =>
                                beginEditGame(
                                  game
                                )
                              }
                              className="rounded-xl border border-blue-800 px-5 py-3 font-bold text-blue-300 hover:bg-blue-950/30"
                            >
                              Edit
                            </button>


                            <button
                              type="button"
                              disabled={
                                deletingGameId ===
                                game.id
                              }
                              onClick={() =>
                                deleteScheduledGame(
                                  game
                                )
                              }
                              className="rounded-xl border border-red-900 px-5 py-3 font-bold text-red-400 hover:bg-red-950/30 disabled:opacity-40"
                            >
                              {deletingGameId ===
                              game.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>

                          </>

                        )}

                      </div>

                    </div>

                  )}


                  {isEditing &&
                    role === "admin" && (

                    <form
                      onSubmit={
                        saveEditedGame
                      }
                      className="space-y-6"
                    >

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="text-xs font-black uppercase tracking-widest text-blue-400">
                            Editing Fixture
                          </p>

                          <h3 className="mt-1 text-xl font-black">
                            {home?.name ?? "Home Team"} vs {away?.name ?? "Away Team"}
                          </h3>

                        </div>


                        <button
                          type="button"
                          onClick={
                            cancelEditGame
                          }
                          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
                        >
                          Cancel
                        </button>

                      </div>


                      <div className="grid gap-5 md:grid-cols-3">

                        <div>

                          <label className="mb-2 block text-sm text-zinc-400">
                            Season
                          </label>

                          <select
                            value={
                              editSeasonId
                            }
                            onChange={(e) => {
                              setEditSeasonId(
                                e.target.value
                              );

                              setEditHomeTeamId("");
                              setEditAwayTeamId("");
                            }}
                            required
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                          >

                            <option value="">
                              Select Season
                            </option>

                            {seasons.map(
                              (row) => (

                                <option
                                  key={
                                    row.id
                                  }
                                  value={
                                    row.id
                                  }
                                >
                                  {row.name}
                                </option>

                              )
                            )}

                          </select>

                        </div>


                        <div>

                          <label className="mb-2 block text-sm text-zinc-400">
                            Home Team
                          </label>

                          <select
                            value={
                              editHomeTeamId
                            }
                            onChange={(e) =>
                              setEditHomeTeamId(
                                e.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                          >

                            <option value="">
                              Select Home Team
                            </option>

                            {editGameTeams.map(
                              (team) => (

                                <option
                                  key={
                                    team.id
                                  }
                                  value={
                                    team.id
                                  }
                                >
                                  {team.name}
                                </option>

                              )
                            )}

                          </select>

                        </div>


                        <div>

                          <label className="mb-2 block text-sm text-zinc-400">
                            Away Team
                          </label>

                          <select
                            value={
                              editAwayTeamId
                            }
                            onChange={(e) =>
                              setEditAwayTeamId(
                                e.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                          >

                            <option value="">
                              Select Away Team
                            </option>

                            {editGameTeams.map(
                              (team) => (

                                <option
                                  key={
                                    team.id
                                  }
                                  value={
                                    team.id
                                  }
                                >
                                  {team.name}
                                </option>

                              )
                            )}

                          </select>

                        </div>

                      </div>


                      <div className="grid gap-5 md:grid-cols-3">

                        <div>

                          <label className="mb-2 block text-sm text-zinc-400">
                            Game Date
                          </label>

                          <input
                            type="date"
                            value={
                              editGameDate
                            }
                            onChange={(e) =>
                              setEditGameDate(
                                e.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                          />

                        </div>


                        <div>

                          <label className="mb-2 block text-sm text-zinc-400">
                            Game Time
                          </label>

                          <input
                            type="time"
                            value={
                              editGameTime
                            }
                            onChange={(e) =>
                              setEditGameTime(
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                          />

                        </div>


                        <div>

                          <label className="mb-2 block text-sm text-zinc-400">
                            Venue
                          </label>

                          <input
                            type="text"
                            value={
                              editVenue
                            }
                            onChange={(e) =>
                              setEditVenue(
                                e.target.value
                              )
                            }
                            placeholder="Venue"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                          />

                        </div>

                      </div>


                      <div>

                        <p className="mb-3 text-sm font-bold text-zinc-400">
                          Quarter Lengths
                        </p>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">

                          <PeriodInput
                            label="Q1"
                            value={
                              editQ1Minutes
                            }
                            onChange={
                              setEditQ1Minutes
                            }
                          />

                          <PeriodInput
                            label="Q2"
                            value={
                              editQ2Minutes
                            }
                            onChange={
                              setEditQ2Minutes
                            }
                          />

                          <PeriodInput
                            label="Q3"
                            value={
                              editQ3Minutes
                            }
                            onChange={
                              setEditQ3Minutes
                            }
                          />

                          <PeriodInput
                            label="Q4"
                            value={
                              editQ4Minutes
                            }
                            onChange={
                              setEditQ4Minutes
                            }
                          />

                          <PeriodInput
                            label="Q5"
                            value={
                              editQ5Minutes
                            }
                            onChange={
                              setEditQ5Minutes
                            }
                          />

                        </div>

                      </div>


                      <div className="flex flex-wrap gap-3 border-t border-zinc-800 pt-5">

                        <button
                          type="submit"
                          disabled={
                            savingGameEdit
                          }
                          className="rounded-xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-500 disabled:opacity-40"
                        >
                          {savingGameEdit
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            cancelEditGame
                          }
                          className="rounded-xl border border-zinc-700 px-6 py-3 font-bold hover:bg-zinc-800"
                        >
                          Cancel
                        </button>

                      </div>

                    </form>

                  )}

                </div>
              );
            }
          )}

        </div>

      </section>

      )}


      {/* =================================================
          COMPLETED GAMES
          ================================================= */}

      {view === "games" && (

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-sm uppercase tracking-widest text-zinc-500">
                History
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Completed Games
              </h2>

              <p className="mt-2 max-w-3xl text-zinc-400">
                Admins can correct a completed game's date, time, venue, final score and Q1-Q5 scores, or permanently delete the game and all of its game-specific stats.
              </p>

            </div>


            <div className="flex flex-wrap items-center gap-3">

              {completedGames.length > 12 && (

                <button
                  type="button"
                  onClick={() =>
                    setShowAllCompletedGames(
                      (value) =>
                        !value
                    )
                  }
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
                >
                  {showAllCompletedGames
                    ? "Show Recent"
                    : "Show All"}
                </button>

              )}

              <div className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-400">
                {completedGames.length} completed
              </div>

            </div>

          </div>


          <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200">
            Editing the final score does not redistribute points between players. Use this for correcting the official result or quarter scores. A future player box-score editor can handle individual player-stat corrections.
          </div>


          <div className="mt-7 space-y-4">

            {completedGames.length === 0 && (

              <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500">
                No completed games yet.
              </div>

            )}


            {(showAllCompletedGames
              ? completedGames
              : completedGames.slice(
                  0,
                  12
                )
            ).map(
              (game) => {
                const home =
                  teams.find(
                    (team) =>
                      team.id ===
                      game.home_team_id
                  );

                const away =
                  teams.find(
                    (team) =>
                      team.id ===
                      game.away_team_id
                  );

                const season =
                  seasons.find(
                    (row) =>
                      row.id ===
                      game.season_id
                  );

                const isEditing =
                  editingCompletedGameId ===
                  game.id;

                return (
                  <div
                    key={
                      game.id
                    }
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
                  >

                    {!isEditing && (

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">

                            <span className="rounded-full border border-zinc-800 px-3 py-1">
                              Season {season?.name ?? "—"}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 ${
                                game.source ===
                                "palsports"
                                  ? "border-cyan-900 text-cyan-300"
                                  : "border-zinc-800 text-zinc-400"
                              }`}
                            >
                              {game.source ===
                              "palsports"
                                ? `Game${game.source_game_id ? ` #${game.source_game_id}` : ""}`
                                : "Manual"}
                            </span>

                            <span>
                              {formatGameDate(
                                game.game_date
                              )}
                            </span>

                            {game.game_time && (
                              <span>
                                {formatGameTime(
                                  game.game_time
                                )}
                              </span>
                            )}

                          </div>


                          <div className="mt-4 flex flex-wrap items-center gap-3">

                            <span className="max-w-[320px] truncate text-lg font-black">
                              {home?.name ?? "Home Team"}
                            </span>

                            <span className="rounded-xl bg-zinc-900 px-4 py-2 text-2xl font-black tabular-nums">
                              {game.home_score ?? 0}
                              {" - "}
                              {game.away_score ?? 0}
                            </span>

                            <span className="max-w-[320px] truncate text-lg font-black">
                              {away?.name ?? "Away Team"}
                            </span>

                          </div>


                          <p className="mt-2 text-sm text-zinc-500">
                            {game.venue?.trim()
                              ? game.venue
                              : "Venue not set"}
                          </p>


                          <p className="mt-2 text-xs text-zinc-600">
                            Q1 {game.q1_home ?? 0}-{game.q1_away ?? 0}
                            {" · "}
                            Q2 {game.q2_home ?? 0}-{game.q2_away ?? 0}
                            {" · "}
                            Q3 {game.q3_home ?? 0}-{game.q3_away ?? 0}
                            {" · "}
                            Q4 {game.q4_home ?? 0}-{game.q4_away ?? 0}
                            {" · "}
                            Q5 {game.q5_home ?? 0}-{game.q5_away ?? 0}
                          </p>

                        </div>


                        {role === "admin" && (

                          <div className="flex flex-wrap gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                beginEditCompletedGame(
                                  game
                                )
                              }
                              className="rounded-xl border border-blue-800 px-5 py-3 font-bold text-blue-300 hover:bg-blue-950/30"
                            >
                              Edit Result
                            </button>


                            <button
                              type="button"
                              disabled={
                                deletingCompletedGameId ===
                                game.id
                              }
                              onClick={() =>
                                deleteCompletedGame(
                                  game
                                )
                              }
                              className="rounded-xl border border-red-900 px-5 py-3 font-bold text-red-400 hover:bg-red-950/30 disabled:opacity-40"
                            >
                              {deletingCompletedGameId ===
                              game.id
                                ? "Deleting..."
                                : "Delete Game & Data"}
                            </button>

                          </div>

                        )}

                      </div>

                    )}


                    {isEditing &&
                      role === "admin" && (

                      <form
                        onSubmit={
                          saveCompletedGameEdit
                        }
                        className="space-y-6"
                      >

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                          <div>

                            <p className="text-xs font-black uppercase tracking-widest text-blue-400">
                              Editing Completed Result
                            </p>

                            <h3 className="mt-1 text-xl font-black">
                              {home?.name ?? "Home Team"} vs {away?.name ?? "Away Team"}
                            </h3>

                            <p className="mt-2 text-sm text-zinc-500">
                              Teams and season are locked for completed games so existing player/team statistics stay attached to the correct game.
                            </p>

                          </div>


                          <button
                            type="button"
                            onClick={
                              cancelEditCompletedGame
                            }
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
                          >
                            Cancel
                          </button>

                        </div>


                        <div className="grid gap-5 md:grid-cols-3">

                          <div>

                            <label className="mb-2 block text-sm text-zinc-400">
                              Game Date
                            </label>

                            <input
                              type="date"
                              value={
                                completedEditDate
                              }
                              onChange={(e) =>
                                setCompletedEditDate(
                                  e.target.value
                                )
                              }
                              required
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                            />

                          </div>


                          <div>

                            <label className="mb-2 block text-sm text-zinc-400">
                              Game Time
                            </label>

                            <input
                              type="time"
                              value={
                                completedEditTime
                              }
                              onChange={(e) =>
                                setCompletedEditTime(
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                            />

                          </div>


                          <div>

                            <label className="mb-2 block text-sm text-zinc-400">
                              Venue
                            </label>

                            <input
                              type="text"
                              value={
                                completedEditVenue
                              }
                              onChange={(e) =>
                                setCompletedEditVenue(
                                  e.target.value
                                )
                              }
                              placeholder="Venue"
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
                            />

                          </div>

                        </div>


                        <div className="grid gap-5 md:grid-cols-2">

                          <CompletedScoreInput
                            label={`${home?.name ?? "Home"} Final Score`}
                            value={
                              completedEditHomeScore
                            }
                            onChange={
                              setCompletedEditHomeScore
                            }
                          />

                          <CompletedScoreInput
                            label={`${away?.name ?? "Away"} Final Score`}
                            value={
                              completedEditAwayScore
                            }
                            onChange={
                              setCompletedEditAwayScore
                            }
                          />

                        </div>


                        <div className="border-t border-zinc-800 pt-6">

                          <p className="text-sm font-bold text-zinc-300">
                            Quarter Scores
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Q1 through Q5 are editable independently from the final score because some imported historical games do not have complete quarter breakdowns.
                          </p>


                          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                            <CompletedQuarterScore
                              label="Q1"
                              homeName={
                                home?.name ?? "Home"
                              }
                              awayName={
                                away?.name ?? "Away"
                              }
                              homeValue={
                                completedEditQ1Home
                              }
                              awayValue={
                                completedEditQ1Away
                              }
                              onHomeChange={
                                setCompletedEditQ1Home
                              }
                              onAwayChange={
                                setCompletedEditQ1Away
                              }
                            />

                            <CompletedQuarterScore
                              label="Q2"
                              homeName={
                                home?.name ?? "Home"
                              }
                              awayName={
                                away?.name ?? "Away"
                              }
                              homeValue={
                                completedEditQ2Home
                              }
                              awayValue={
                                completedEditQ2Away
                              }
                              onHomeChange={
                                setCompletedEditQ2Home
                              }
                              onAwayChange={
                                setCompletedEditQ2Away
                              }
                            />

                            <CompletedQuarterScore
                              label="Q3"
                              homeName={
                                home?.name ?? "Home"
                              }
                              awayName={
                                away?.name ?? "Away"
                              }
                              homeValue={
                                completedEditQ3Home
                              }
                              awayValue={
                                completedEditQ3Away
                              }
                              onHomeChange={
                                setCompletedEditQ3Home
                              }
                              onAwayChange={
                                setCompletedEditQ3Away
                              }
                            />

                            <CompletedQuarterScore
                              label="Q4"
                              homeName={
                                home?.name ?? "Home"
                              }
                              awayName={
                                away?.name ?? "Away"
                              }
                              homeValue={
                                completedEditQ4Home
                              }
                              awayValue={
                                completedEditQ4Away
                              }
                              onHomeChange={
                                setCompletedEditQ4Home
                              }
                              onAwayChange={
                                setCompletedEditQ4Away
                              }
                            />

                            <CompletedQuarterScore
                              label="Q5"
                              homeName={
                                home?.name ?? "Home"
                              }
                              awayName={
                                away?.name ?? "Away"
                              }
                              homeValue={
                                completedEditQ5Home
                              }
                              awayValue={
                                completedEditQ5Away
                              }
                              onHomeChange={
                                setCompletedEditQ5Home
                              }
                              onAwayChange={
                                setCompletedEditQ5Away
                              }
                            />

                          </div>

                        </div>


                        <div className="flex flex-wrap gap-3 border-t border-zinc-800 pt-5">

                          <button
                            type="submit"
                            disabled={
                              savingCompletedGameEdit
                            }
                            className="rounded-xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-500 disabled:opacity-40"
                          >
                            {savingCompletedGameEdit
                              ? "Saving..."
                              : "Save Completed Game"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelEditCompletedGame
                            }
                            className="rounded-xl border border-zinc-700 px-6 py-3 font-bold hover:bg-zinc-800"
                          >
                            Cancel
                          </button>

                        </div>

                      </form>

                    )}

                  </div>
                );
              }
            )}

          </div>

        </section>

      )}


      {/* =================================================
          SCHEDULE GAME
          ================================================= */}

      {view === "games" && (

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Fixture Scheduling
        </p>

        <h2 className="mt-2 text-2xl font-black">
          Schedule Game
        </h2>

        <p className="mt-2 text-zinc-400">
          Save the fixture now and open the scorer later when the game is ready to begin.
        </p>

        <form
          onSubmit={
            createGame
          }
          className="mt-8 space-y-8"
        >


          {/* SEASON */}

          <div>

            <label className="mb-2 block text-sm text-zinc-400">
              Season
            </label>

            <select
              value={
                seasonId
              }
              onChange={(e) => {
                setSeasonId(
                  e.target.value
                );

                /*
                 * Clear team selection
                 * because available teams
                 * may change by season.
                 */

                setHomeTeamId("");
                setAwayTeamId("");
              }}
              required
              className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-bold"
            >

              <option value="">
                Select Season
              </option>

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
                    {season.name}
                  </option>

                )
              )}

            </select>

          </div>


          {/* NO TEAMS WARNING */}

          {seasonId &&
            gameTeams.length ===
              0 && (

              <div className="rounded-xl border border-yellow-800 bg-yellow-950/20 p-4 text-sm text-yellow-300">
                This season does not have any teams yet. Add teams above before creating a game.
              </div>

            )}


          {/* HOME / AWAY */}

          <div className="grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm text-zinc-400">
                Home Team
              </label>

              <select
                value={
                  homeTeamId
                }
                onChange={(e) =>
                  setHomeTeamId(
                    e.target.value
                  )
                }
                required
                disabled={
                  !seasonId ||
                  gameTeams.length ===
                    0
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 disabled:opacity-40"
              >

                <option value="">
                  Select Home Team
                </option>

                {gameTeams.map(
                  (team) => {

                    const membership =
                      seasonTeams.find(
                        (row) =>
                          row.season_id ===
                            seasonId &&
                          row.team_id ===
                            team.id
                      );

                    return (
                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                      >
                        {team.name}
                        {membership?.division ===
                        "西岸"
                          ? " — West"
                          : membership?.division ===
                            "東岸"
                          ? " — East"
                          : ""}
                      </option>
                    );
                  }
                )}

              </select>

            </div>


            <div>

              <label className="mb-2 block text-sm text-zinc-400">
                Away Team
              </label>

              <select
                value={
                  awayTeamId
                }
                onChange={(e) =>
                  setAwayTeamId(
                    e.target.value
                  )
                }
                required
                disabled={
                  !seasonId ||
                  gameTeams.length ===
                    0
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 disabled:opacity-40"
              >

                <option value="">
                  Select Away Team
                </option>

                {gameTeams.map(
                  (team) => {

                    const membership =
                      seasonTeams.find(
                        (row) =>
                          row.season_id ===
                            seasonId &&
                          row.team_id ===
                            team.id
                      );

                    return (
                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                      >
                        {team.name}
                        {membership?.division ===
                        "西岸"
                          ? " — West"
                          : membership?.division ===
                            "東岸"
                          ? " — East"
                          : ""}
                      </option>
                    );
                  }
                )}

              </select>

            </div>

          </div>


          {/* DATE / TIME */}

          <div className="grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm text-zinc-400">
                Game Date
              </label>

              <input
                type="date"
                value={
                  gameDate
                }
                onChange={(e) =>
                  setGameDate(
                    e.target.value
                  )
                }
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
              />

            </div>


            <div>

              <label className="mb-2 block text-sm text-zinc-400">
                Game Time
              </label>

              <input
                type="time"
                value={
                  gameTime
                }
                onChange={(e) =>
                  setGameTime(
                    e.target.value
                  )
                }
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
              />

            </div>

          </div>


          {/* VENUE */}

          <div>

            <label className="mb-2 block text-sm text-zinc-400">
              Venue
            </label>

            <input
              type="text"
              value={
                venue
              }
              onChange={(e) =>
                setVenue(
                  e.target.value
                )
              }
              placeholder="Basketball court / sports centre"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />

          </div>


          {/* QUARTERS */}

          <div className="border-t border-zinc-800 pt-8">

            <h3 className="text-lg font-bold">
              Quarter Lengths
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              Set the duration of Q1 through Q5.
            </p>


            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">

              <PeriodInput
                label="Q1"
                value={
                  q1Minutes
                }
                onChange={
                  setQ1Minutes
                }
              />

              <PeriodInput
                label="Q2"
                value={
                  q2Minutes
                }
                onChange={
                  setQ2Minutes
                }
              />

              <PeriodInput
                label="Q3"
                value={
                  q3Minutes
                }
                onChange={
                  setQ3Minutes
                }
              />

              <PeriodInput
                label="Q4"
                value={
                  q4Minutes
                }
                onChange={
                  setQ4Minutes
                }
              />

              <PeriodInput
                label="Q5"
                value={
                  q5Minutes
                }
                onChange={
                  setQ5Minutes
                }
              />

            </div>

          </div>


          {/* CREATE */}

          <button
            type="submit"
            disabled={
              creatingGame ||
              gameTeams.length ===
                0
            }
            className="w-full rounded-xl bg-white px-5 py-4 text-lg font-black text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creatingGame
              ? "Scheduling Game..."
              : "Schedule Game"}
          </button>

        </form>

      </section>

      )}

    </main>
  );
}


/*
 * =====================================================
 * PERIOD INPUT
 * =====================================================
 */

function WorkspaceNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-black transition"
      style={{
        background:
          active
            ? "var(--primary)"
            : "var(--surface)",

        color:
          active
            ? "white"
            : "var(--foreground)",
      }}
    >
      {label}
    </Link>
  );
}


function DashboardCard({
  href,
  eyebrow,
  value,
  label,
  urgent = false,
}: {
  href: string;
  eyebrow: string;
  value: number;
  label: string;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border p-5 transition hover:-translate-y-0.5"
      style={{
        borderColor:
          urgent
            ? "color-mix(in srgb, var(--danger) 45%, var(--border))"
            : "var(--border)",

        background:
          "var(--card)",
      }}
    >
      <p
        className="text-xs font-black uppercase tracking-[0.15em]"
        style={{
          color:
            urgent
              ? "var(--danger)"
              : "var(--muted-foreground)",
        }}
      >
        {eyebrow}
      </p>

      <p className="mt-2 text-4xl font-black tabular-nums">
        {value}
      </p>

      <p
        className="mt-1 text-sm font-bold"
        style={{
          color:
            "var(--muted-foreground)",
        }}
      >
        {label}
      </p>
    </Link>
  );
}


function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border p-6 transition hover:-translate-y-0.5"
      style={{
        borderColor:
          "var(--border)",
        background:
          "var(--card)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">
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
        </div>

        <span
          className="shrink-0 text-xl transition group-hover:translate-x-1"
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



function CompletedScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (
    value: number
  ) => void;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm text-zinc-400">
        {label}
      </label>

      <input
        type="number"
        min="0"
        step="1"
        value={
          value
        }
        onChange={(e) =>
          onChange(
            Math.max(
              0,
              Math.floor(
                Number(
                  e.target.value ||
                  0
                )
              )
            )
          )
        }
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-2xl font-black tabular-nums"
      />

    </div>
  );
}


function CompletedQuarterScore({
  label,
  homeName,
  awayName,
  homeValue,
  awayValue,
  onHomeChange,
  onAwayChange,
}: {
  label: string;
  homeName: string;
  awayName: string;
  homeValue: number;
  awayValue: number;
  onHomeChange: (
    value: number
  ) => void;
  onAwayChange: (
    value: number
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">

      <p className="text-center text-sm font-black">
        {label}
      </p>


      <div className="mt-4 space-y-3">

        <div>

          <label className="mb-1 block truncate text-xs text-zinc-500">
            {homeName}
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={
              homeValue
            }
            onChange={(e) =>
              onHomeChange(
                Math.max(
                  0,
                  Math.floor(
                    Number(
                      e.target.value ||
                      0
                    )
                  )
                )
              )
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center font-black tabular-nums"
          />

        </div>


        <div>

          <label className="mb-1 block truncate text-xs text-zinc-500">
            {awayName}
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={
              awayValue
            }
            onChange={(e) =>
              onAwayChange(
                Math.max(
                  0,
                  Math.floor(
                    Number(
                      e.target.value ||
                      0
                    )
                  )
                )
              )
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center font-black tabular-nums"
          />

        </div>

      </div>

    </div>
  );
}



function PeriodInput({
  label,
  value,
  onChange,
}: {
  label: string;

  value: number;

  onChange: (
    value: number
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">

      <label className="block text-center text-sm font-bold">
        {label}
      </label>

      <input
        type="number"
        min="1"
        max="60"
        step="1"
        value={
          value
        }
        onChange={(e) => {
          const number =
            Number(
              e.target.value
            );

          if (
            Number.isNaN(
              number
            )
          ) {
            return;
          }

          onChange(
            Math.min(
              60,
              Math.max(
                1,
                number
              )
            )
          );
        }}
        className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-3 text-center text-xl font-black"
      />

      <p className="mt-2 text-center text-xs text-zinc-500">
        minutes
      </p>

    </div>
  );
}


/*
 * =====================================================
 * DATE
 * =====================================================
 */

function secondsToMinutes(
  seconds: number | null,
  fallback: number
) {
  const value =
    Number(
      seconds
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.round(
      value / 60
    )
  );
}


function formatGameDate(
  value: string
) {
  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}


function formatGameTime(
  value: string
) {
  const parts =
    value.split(":");

  if (
    parts.length < 2
  ) {
    return value;
  }

  const hour =
    Number(parts[0]);

  const minute =
    Number(parts[1]);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return value;
  }

  const date =
    new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date.toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}



function formatScorerClock(
  storedSeconds: number,
  running: boolean,
  syncedAt: string | null
) {
  let seconds =
    Math.max(
      0,
      Number(
        storedSeconds ?? 0
      )
    );

  if (
    running &&
    syncedAt
  ) {
    const synced =
      new Date(
        syncedAt
      ).getTime();

    if (
      Number.isFinite(
        synced
      )
    ) {
      const elapsed =
        Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              synced
            ) / 1000
          )
        );

      seconds =
        Math.max(
          0,
          seconds -
          elapsed
        );
    }
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainder =
    seconds % 60;

  return `${minutes}:${String(
    remainder
  ).padStart(
    2,
    "0"
  )}`;
}


function getToday() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}