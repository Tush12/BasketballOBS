import type { SupabaseClient } from "@supabase/supabase-js";

type TeamRow = { id: string; name: string };
type SeasonRow = { id: string; name: string; season_year: number | null };
type GameRow = {
  id: string;
  game_date: string | null;
  game_time: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
};

type TeamSnapshot = {
  games: number;
  wins: number;
  losses: number;
  winPct: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
  avgMargin: number;
  recentGames: number;
  recentWins: number;
  recentLosses: number;
  recentWinPct: number;
  recentAvgMargin: number;
};

export async function predictMatchup(
  supabase: SupabaseClient,
  teamAName: unknown,
  teamBName: unknown,
  requestedSeason?: unknown
) {
  const aSearch = cleanSearch(teamAName);
  const bSearch = cleanSearch(teamBName);

  if (!aSearch || !bSearch) {
    return { status: "insufficient_data", reason: "Two team names are required." };
  }

  const seasonResult = await resolveSeason(supabase, requestedSeason);
  if ("reason" in seasonResult) {
    return { status: "insufficient_data", reason: seasonResult.reason };
  }

  const teamAResult = await resolveTeam(supabase, aSearch);
  if ("matches" in teamAResult) {
    return {
      status: "ambiguous",
      reason: `Multiple teams matched "${aSearch}".`,
      matches: teamAResult.matches,
    };
  }
  if ("reason" in teamAResult) {
    return { status: "insufficient_data", reason: teamAResult.reason };
  }

  const teamBResult = await resolveTeam(supabase, bSearch);
  if ("matches" in teamBResult) {
    return {
      status: "ambiguous",
      reason: `Multiple teams matched "${bSearch}".`,
      matches: teamBResult.matches,
    };
  }
  if ("reason" in teamBResult) {
    return { status: "insufficient_data", reason: teamBResult.reason };
  }

  const teamA = teamAResult.team;
  const teamB = teamBResult.team;
  const season = seasonResult.season;

  if (teamA.id === teamB.id) {
    return { status: "insufficient_data", reason: "Please choose two different teams." };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("season_teams")
    .select("team_id")
    .eq("season_id", season.id)
    .in("team_id", [teamA.id, teamB.id]);

  if (membershipError) {
    return { status: "insufficient_data", reason: membershipError.message };
  }

  const membershipIds = new Set((memberships ?? []).map((row: any) => row.team_id));
  if (!membershipIds.has(teamA.id)) {
    return {
      status: "insufficient_data",
      reason: `${teamA.name} is not registered in season ${season.name}.`,
    };
  }
  if (!membershipIds.has(teamB.id)) {
    return {
      status: "insufficient_data",
      reason: `${teamB.name} is not registered in season ${season.name}.`,
    };
  }

  const { data: gameData, error: gameError } = await supabase
    .from("games")
    .select(`
      id,
      game_date,
      game_time,
      home_team_id,
      away_team_id,
      home_score,
      away_score
    `)
    .eq("season_id", season.id)
    .eq("status", "finished")
    .order("game_date", { ascending: true })
    .order("game_time", { ascending: true });

  if (gameError) {
    return { status: "insufficient_data", reason: gameError.message };
  }

  const games = ((gameData ?? []) as GameRow[])
    .filter(
      (game) =>
        game.home_team_id &&
        game.away_team_id &&
        Number.isFinite(Number(game.home_score)) &&
        Number.isFinite(Number(game.away_score))
    )
    .sort(compareGames);

  const aStats = buildTeamSnapshot(games, teamA.id);
  const bStats = buildTeamSnapshot(games, teamB.id);

  if (aStats.games === 0 || bStats.games === 0) {
    return {
      status: "insufficient_data",
      season: { id: season.id, name: season.name, year: season.season_year },
      reason:
        "Both teams need at least one finished game in this season before a prediction can be calculated.",
      sample: {
        team_a_games: aStats.games,
        team_b_games: bStats.games,
      },
    };
  }

  const eloRatings = calculateElo(games);
  const aElo = eloRatings.get(teamA.id) ?? 1500;
  const bElo = eloRatings.get(teamB.id) ?? 1500;

  const aMarginAdjustment = clamp(aStats.avgMargin * 3, -45, 45);
  const bMarginAdjustment = clamp(bStats.avgMargin * 3, -45, 45);
  const aRecentAdjustment = clamp((aStats.recentWinPct - 0.5) * 50, -25, 25);
  const bRecentAdjustment = clamp((bStats.recentWinPct - 0.5) * 50, -25, 25);

  const h2h = getHeadToHead(games, teamA.id, teamB.id);
  const h2hAdjustment = clamp((h2h.teamAWins - h2h.teamBWins) * 8, -24, 24);

  const aAdjusted = aElo + aMarginAdjustment + aRecentAdjustment + h2hAdjustment;
  const bAdjusted = bElo + bMarginAdjustment + bRecentAdjustment - h2hAdjustment;

  const rawProbabilityA = eloProbability(aAdjusted, bAdjusted);

  // Low-sample predictions are pulled back toward 50/50.
  const smallerSample = Math.min(aStats.games, bStats.games);
  const evidenceWeight = clamp(smallerSample / 8, 0.12, 1);
  const probabilityA = 0.5 + (rawProbabilityA - 0.5) * evidenceWeight;
  const probabilityAPct = round1(probabilityA * 100);
  const probabilityBPct = round1(100 - probabilityAPct);

  const projectedScore =
    aStats.games >= 2 && bStats.games >= 2
      ? {
          team_a: Math.max(
            0,
            Math.round((aStats.avgPointsFor + bStats.avgPointsAgainst) / 2)
          ),
          team_b: Math.max(
            0,
            Math.round((bStats.avgPointsFor + aStats.avgPointsAgainst) / 2)
          ),
        }
      : null;

  return {
    status: "ok",
    season: { id: season.id, name: season.name, year: season.season_year },
    team_a: {
      id: teamA.id,
      name: teamA.name,
      games: aStats.games,
      wins: aStats.wins,
      losses: aStats.losses,
      win_pct: round3(aStats.winPct),
      avg_points_for: round2(aStats.avgPointsFor),
      avg_points_against: round2(aStats.avgPointsAgainst),
      avg_margin: round2(aStats.avgMargin),
      recent_games: aStats.recentGames,
      recent_wins: aStats.recentWins,
      recent_losses: aStats.recentLosses,
      recent_win_pct: round3(aStats.recentWinPct),
      recent_avg_margin: round2(aStats.recentAvgMargin),
      elo: round1(aElo),
      adjusted_rating: round1(aAdjusted),
    },
    team_b: {
      id: teamB.id,
      name: teamB.name,
      games: bStats.games,
      wins: bStats.wins,
      losses: bStats.losses,
      win_pct: round3(bStats.winPct),
      avg_points_for: round2(bStats.avgPointsFor),
      avg_points_against: round2(bStats.avgPointsAgainst),
      avg_margin: round2(bStats.avgMargin),
      recent_games: bStats.recentGames,
      recent_wins: bStats.recentWins,
      recent_losses: bStats.recentLosses,
      recent_win_pct: round3(bStats.recentWinPct),
      recent_avg_margin: round2(bStats.recentAvgMargin),
      elo: round1(bElo),
      adjusted_rating: round1(bAdjusted),
    },
    predicted_winner: probabilityA >= 0.5 ? teamA.name : teamB.name,
    probabilities: {
      team_a: probabilityAPct,
      team_b: probabilityBPct,
    },
    projected_score: projectedScore,
    confidence: getConfidence(smallerSample),
    evidence_weight: round2(evidenceWeight),
    head_to_head: {
      games: h2h.games,
      team_a_wins: h2h.teamAWins,
      team_b_wins: h2h.teamBWins,
    },
    methodology: [
      "Season Elo rating from finished games",
      "Average point differential",
      "Recent form from up to the last 5 games",
      "Head-to-head results",
      "Sample-size shrinkage toward 50/50",
    ],
    limitations: [
      "Experimental statistical estimate, not a guaranteed result.",
      "Does not yet account for injuries, absences, starting lineups, or in-game conditions.",
      "Low-sample teams are intentionally pulled toward 50/50.",
      "Assumes a neutral court and does not add home-court advantage.",
    ],
  };
}

async function resolveSeason(
  supabase: SupabaseClient,
  requestedSeason: unknown
): Promise<{ season: SeasonRow } | { reason: string }> {
  const { data, error } = await supabase
    .from("seasons")
    .select("id,name,season_year")
    .order("season_year", { ascending: false });

  if (error) return { reason: error.message };
  const seasons = (data ?? []) as SeasonRow[];
  if (seasons.length === 0) return { reason: "No seasons are available." };

  const requested = cleanSearch(requestedSeason);
  if (!requested) return { season: seasons[0] };

  const exact = seasons.find(
    (season) =>
      season.name.toLowerCase() === requested.toLowerCase() ||
      String(season.season_year ?? "") === requested
  );
  if (exact) return { season: exact };

  const partial = seasons.filter((season) =>
    season.name.toLowerCase().includes(requested.toLowerCase())
  );
  if (partial.length === 1) return { season: partial[0] };

  return { reason: `Season "${requested}" was not found.` };
}

async function resolveTeam(
  supabase: SupabaseClient,
  search: string
): Promise<{ team: TeamRow } | { matches: string[] } | { reason: string }> {
  const { data, error } = await supabase
    .from("teams")
    .select("id,name")
    .ilike("name", `%${search}%`)
    .limit(10);

  if (error) return { reason: error.message };
  const teams = (data ?? []) as TeamRow[];
  if (teams.length === 0) return { reason: `No team matched "${search}".` };

  const exact = teams.find(
    (team) => team.name.trim().toLowerCase() === search.trim().toLowerCase()
  );
  if (exact) return { team: exact };
  if (teams.length === 1) return { team: teams[0] };

  return { matches: teams.map((team) => team.name) };
}

function buildTeamSnapshot(games: GameRow[], teamId: string): TeamSnapshot {
  const teamGames = games.filter(
    (game) => game.home_team_id === teamId || game.away_team_id === teamId
  );

  let wins = 0;
  let losses = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  let marginTotal = 0;

  for (const game of teamGames) {
    const isHome = game.home_team_id === teamId;
    const pf = isHome ? Number(game.home_score) : Number(game.away_score);
    const pa = isHome ? Number(game.away_score) : Number(game.home_score);
    const margin = pf - pa;
    pointsFor += pf;
    pointsAgainst += pa;
    marginTotal += margin;
    if (margin > 0) wins++;
    else if (margin < 0) losses++;
  }

  const recent = teamGames.slice(-5);
  let recentWins = 0;
  let recentLosses = 0;
  let recentMarginTotal = 0;

  for (const game of recent) {
    const isHome = game.home_team_id === teamId;
    const pf = isHome ? Number(game.home_score) : Number(game.away_score);
    const pa = isHome ? Number(game.away_score) : Number(game.home_score);
    const margin = pf - pa;
    recentMarginTotal += margin;
    if (margin > 0) recentWins++;
    else if (margin < 0) recentLosses++;
  }

  const gamesPlayed = teamGames.length;
  const recentGames = recent.length;

  return {
    games: gamesPlayed,
    wins,
    losses,
    winPct: gamesPlayed ? wins / gamesPlayed : 0.5,
    avgPointsFor: gamesPlayed ? pointsFor / gamesPlayed : 0,
    avgPointsAgainst: gamesPlayed ? pointsAgainst / gamesPlayed : 0,
    avgMargin: gamesPlayed ? marginTotal / gamesPlayed : 0,
    recentGames,
    recentWins,
    recentLosses,
    recentWinPct: recentGames ? recentWins / recentGames : 0.5,
    recentAvgMargin: recentGames ? recentMarginTotal / recentGames : 0,
  };
}

function calculateElo(games: GameRow[]) {
  const ratings = new Map<string, number>();
  const getRating = (teamId: string) => ratings.get(teamId) ?? 1500;

  for (const game of games) {
    const homeRating = getRating(game.home_team_id);
    const awayRating = getRating(game.away_team_id);
    const expectedHome = eloProbability(homeRating, awayRating);
    const margin = Number(game.home_score) - Number(game.away_score);
    const actualHome = margin > 0 ? 1 : margin < 0 ? 0 : 0.5;
    const marginMultiplier = clamp(
      1 + Math.log1p(Math.abs(margin)) / 5,
      1,
      2
    );
    const change = 24 * marginMultiplier * (actualHome - expectedHome);
    ratings.set(game.home_team_id, homeRating + change);
    ratings.set(game.away_team_id, awayRating - change);
  }

  return ratings;
}

function getHeadToHead(games: GameRow[], teamAId: string, teamBId: string) {
  let teamAWins = 0;
  let teamBWins = 0;
  let count = 0;

  for (const game of games) {
    const isMatchup =
      (game.home_team_id === teamAId && game.away_team_id === teamBId) ||
      (game.home_team_id === teamBId && game.away_team_id === teamAId);
    if (!isMatchup) continue;
    count++;

    const homeScore = Number(game.home_score);
    const awayScore = Number(game.away_score);
    if (homeScore === awayScore) continue;
    const winnerId = homeScore > awayScore ? game.home_team_id : game.away_team_id;
    if (winnerId === teamAId) teamAWins++;
    else if (winnerId === teamBId) teamBWins++;
  }

  return { games: count, teamAWins, teamBWins };
}

function eloProbability(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function getConfidence(smallerSample: number): "very_low" | "low" | "medium" {
  if (smallerSample <= 1) return "very_low";
  if (smallerSample <= 4) return "low";
  return "medium";
}

function compareGames(a: GameRow, b: GameRow) {
  const aKey = `${a.game_date ?? ""}T${a.game_time ?? "00:00"}`;
  const bKey = `${b.game_date ?? ""}T${b.game_time ?? "00:00"}`;
  return aKey.localeCompare(bKey);
}

function cleanSearch(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[%_,]/g, "")
    .slice(0, 120);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}