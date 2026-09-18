import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { predictMatchup } from "@/lib/prediction";

type AIMedia =
  | {
      type: "photo";
      id: string;
      title: string;
      thumbnailUrl: string;
      fullUrl: string;
      albumId?: string | null;
      gameId?: string | null;
    }
  | {
      type: "video";
      id: string;
      title: string;
      youtubeVideoId: string;
      youtubeUrl: string;
      thumbnailUrl: string;
      gameId?: string | null;
      timestampSeconds?: number | null;
      timestampLabel?: string | null;
    };



const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

const serverSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const MODEL = "openrouter/free";

const SYSTEM_PROMPT = `
You are the AI basketball statistics and prediction assistant for this basketball platform.

You have access to real basketball data through database tools.

CRITICAL RULES:

1. For factual questions about players, teams, standings, games,
   scores, box scores, league leaders, or statistics,
   ALWAYS use the available database tools.

2. For ANY prediction, matchup forecast, "who will win",
   win probability, projected score, or future-game comparison,
   you MUST use the predict_matchup tool.

3. NEVER invent a win probability or prediction yourself.
   The numerical probability must come from predict_matchup.

4. Never invent player names, team names, scores, statistics,
   standings, game results, rankings, or prediction percentages.

5. If predict_matchup returns insufficient_data, clearly say
   there is not enough data to make a responsible prediction.

6. Predictions are experimental statistical estimates, not guarantees.
   Never describe them as certain and never present them as betting advice.

7. Always mention the prediction confidence level.
   If confidence is low or very_low, make that prominent.

8. When explaining a prediction, focus on evidence returned by the tool:
   season record, Elo, point differential, recent form, head-to-head,
   and sample size.

9. Do not imply the model knows injuries, absences, starting lineups,
   or other information not returned by a tool.

10. Do not expose internal database UUIDs unless specifically asked.

11. When several players or teams match a name, explain the ambiguity.

12. Round per-game statistics to at most 2 decimal places.

13. If a game is live, clearly say statistics may still change.

14. For questions such as "Who scored the most in VISION's last game?",
   first find recent games, then retrieve the appropriate box score.

15. For player comparisons, retrieve statistics for both players.

16. If the user refers to "their last game", "that player", or "that team",
   use conversation context.

17. The basketball competition can contain Q1 through Q5.

18. Media is part of the OBS knowledge base. If the user asks for photos,
    albums, highlights, game video, tactical film review, or key moments,
    use the media tools instead of saying media is unavailable.

19. For photo requests, use search_photos or get_game_media. If the user asks
    what is happening in a particular photo, first locate it, then use
    inspect_photo.

20. Video retrieval is free, but OBS AI video analysis is intentionally disabled
    because OpenRouter currently requires paid video balance for the available
    video-input path. For video requests, use search_highlights or get_game_media
    to show the linked YouTube videos. Do NOT call or suggest paid video analysis.

21. If the user asks to analyze a video, explain briefly that free video analysis
    is not enabled, then use official OBS game data and the linked videos to help
    as much as possible without claiming to have watched the footage.

22. Treat official OBS box-score/database statistics as the source of truth.

23. Image observations are AI interpretations. Distinguish observations from
    official recorded statistics.

24. Never perform facial recognition or identify a person solely from their face.
    You may use visible jersey numbers together with roster/game context, while
    clearly stating any uncertainty.

25. Answer conversationally and concisely.
`;

const tools: any[] = [
  {
    type: "function",
    function: {
      name: "get_player_stats",
      description:
        "Find season statistics for a basketball player using their full or partial name.",
      parameters: {
        type: "object",
        properties: {
          player_name: { type: "string" },
        },
        required: ["player_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_stats",
      description:
        "Find a basketball team's season record and standings statistics using its full or partial name.",
      parameters: {
        type: "object",
        properties: {
          team_name: { type: "string" },
        },
        required: ["team_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_league_leaders",
      description: "Retrieve league leaders for a player statistic.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: [
              "ppg",
              "rpg",
              "apg",
              "spg",
              "bpg",
              "efficiency",
              "two_pct",
              "three_pct",
              "ft_pct",
              "fg_pct",
            ],
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 20,
          },
        },
        required: ["metric", "limit"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_team_games",
      description:
        "Retrieve a team's most recent games. Use this for recent form and locating a game before requesting its box score.",
      parameters: {
        type: "object",
        properties: {
          team_name: { type: "string" },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 10,
          },
        },
        required: ["team_name", "limit"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_game_boxscore",
      description:
        "Retrieve a complete game's score and player box score using a game ID returned from another tool.",
      parameters: {
        type: "object",
        properties: {
          game_id: { type: "string" },
        },
        required: ["game_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_games_by_status",
      description: "Retrieve live, scheduled, or finished basketball games.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["live", "scheduled", "finished"],
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 20,
          },
        },
        required: ["status", "limit"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "predict_matchup",
      description:
        "Calculate a statistical prediction between two teams. MUST be used for win predictions, win probabilities, projected scores, and questions asking who is more likely to win.",
      parameters: {
        type: "object",
        properties: {
          team_a_name: {
            type: "string",
            description: "First team in the matchup.",
          },
          team_b_name: {
            type: "string",
            description: "Second team in the matchup.",
          },
          season_name: {
            type: "string",
            description:
              "Optional season name or year. If omitted, the newest season is used.",
          },
        },
        required: ["team_a_name", "team_b_name"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "search_photos",
      description:
        "Find OBS photo albums and sample photos by team name, optionally restricted to a game. Use for requests to show/find photos.",
      parameters: {
        type: "object",
        properties: {
          team_name: { type: "string" },
          game_id: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 12 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_highlights",
      description:
        "Find OBS YouTube highlight/game videos by team name or game ID.",
      parameters: {
        type: "object",
        properties: {
          team_name: { type: "string" },
          game_id: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 12 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_game_media",
      description:
        "Return OBS photos and YouTube videos associated with a known game ID.",
      parameters: {
        type: "object",
        properties: {
          game_id: { type: "string" },
          photo_limit: { type: "integer", minimum: 1, maximum: 12 },
          video_limit: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: ["game_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "inspect_photo",
      description:
        "Use multimodal vision to inspect one OBS photo previously returned by search_photos/get_game_media.",
      parameters: {
        type: "object",
        properties: {
          photo_id: { type: "string" },
          question: { type: "string" },
        },
        required: ["photo_id", "question"],
        additionalProperties: false,
      },
    },
  },

];

export async function POST(request: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Messages must be provided." },
        { status: 400 }
      );
    }

    const media: AIMedia[] = [];
    const latestUserMessage = [...body.messages]
      .reverse()
      .find(
        (message: unknown) =>
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          message.role === "user"
      ) as { content?: unknown } | undefined;
    const userUsedChinese = /[\u3400-\u4dbf\u4e00-\u9fff]/u.test(
      String(latestUserMessage?.content ?? "")
    );
    const answerInCantonese = body.language === "zh-HK" || userUsedChinese;
    const languageInstruction =
      answerInCantonese
        ? "You MUST answer entirely in natural written Cantonese using Traditional Chinese characters, even when database or tool results are in English. Keep player names, team names, scores, and statistics unchanged."
        : "Answer in English.";

    const chatMessages: any[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nLANGUAGE: ${languageInstruction}`,
      },
      ...body.messages.slice(-14).map((message: any) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content ?? ""),
      })),
    ];

    for (let round = 0; round < 8; round++) {
      const completion = await openrouter.chat.completions.create({
        model: MODEL,
        messages: chatMessages,
        tools,
        tool_choice: "auto",
        temperature: 0.15,
        max_tokens: 1400,
      });

      const message = completion.choices[0]?.message;
      if (!message) throw new Error("No AI response received.");

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return NextResponse.json({
          answer: message.content ?? "I couldn't generate an answer.",
          media: dedupeMedia(media).slice(0, 18),
        });
      }

      chatMessages.push(message);

      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;

        let args: any = {};
        try {
          args = JSON.parse(call.function.arguments);
        } catch {
          args = {};
        }

        const result = await executeTool(call.function.name, args, media);

        chatMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return NextResponse.json(
      { error: "The assistant used too many tool calls." },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("AI ERROR:", error);
    return NextResponse.json(
      { error: error?.message ?? "AI request failed." },
      { status: 500 }
    );
  }
}

async function executeTool(name: string, args: any, media: AIMedia[]) {
  switch (name) {
    case "get_player_stats":
      return await getPlayerStats(args.player_name);
    case "get_team_stats":
      return await getTeamStats(args.team_name);
    case "get_league_leaders":
      return await getLeagueLeaders(args.metric, args.limit);
    case "get_recent_team_games":
      return await getRecentTeamGames(args.team_name, args.limit);
    case "get_game_boxscore":
      return await getGameBoxscore(args.game_id);
    case "get_games_by_status":
      return await getGamesByStatus(args.status, args.limit);
    case "predict_matchup":
      return await predictMatchup(
        supabase,
        args.team_a_name,
        args.team_b_name,
        args.season_name
      );
    case "search_photos":
      return await searchPhotos(args, media);
    case "search_highlights":
      return await searchHighlights(args, media);
    case "get_game_media":
      return await getGameMedia(args, media);
    case "inspect_photo":
      return await inspectPhoto(args.photo_id, args.question, media);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function getPlayerStats(playerName: unknown) {
  const search = cleanSearch(playerName);
  if (!search) return { error: "A player name is required." };

  const { data, error } = await supabase
    .from("v_player_season_stats")
    .select(`
      player_id,
      player_name,
      season_id,
      season_name,
      season_year,
      team_id,
      team_name,
      division,
      jersey_number,
      games_played,
      total_points,
      ppg,
      total_rebounds,
      rpg,
      total_assists,
      apg,
      total_steals,
      spg,
      total_blocks,
      bpg,
      total_turnovers,
      tpg,
      total_fouls,
      fpg,
      two_made,
      two_attempted,
      two_pct,
      three_made,
      three_attempted,
      three_pct,
      ft_made,
      ft_attempted,
      ft_pct,
      fg_pct,
      efficiency
    `)
    .ilike("player_name", `%${search}%`)
    .order("season_year", { ascending: false })
    .order("ppg", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { searched_name: search, matches: data ?? [] };
}

async function getTeamStats(teamName: unknown) {
  const search = cleanSearch(teamName);
  if (!search) return { error: "A team name is required." };

  const { data, error } = await supabase
    .from("v_team_standings")
    .select(`
      team_id,
      team_name,
      division,
      season_id,
      season_name,
      season_year,
      games_played,
      wins,
      losses,
      points_for,
      points_against,
      point_diff
    `)
    .ilike("team_name", `%${search}%`)
    .order("season_year", { ascending: false })
    .order("wins", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { searched_name: search, matches: data ?? [] };
}

async function getLeagueLeaders(metric: unknown, requestedLimit: unknown) {
  const allowed = [
    "ppg",
    "rpg",
    "apg",
    "spg",
    "bpg",
    "efficiency",
    "two_pct",
    "three_pct",
    "ft_pct",
    "fg_pct",
  ];

  const safeMetric = String(metric ?? "");
  if (!allowed.includes(safeMetric)) {
    return { error: "Invalid leaderboard metric." };
  }

  const limit = clampLimit(requestedLimit, 20, 5);

  const { data: seasons, error: seasonError } = await supabase
    .from("seasons")
    .select("id,name,season_year")
    .order("season_year", { ascending: false })
    .limit(1);

  if (seasonError) return { error: seasonError.message };
  const newestSeason = seasons?.[0];
  if (!newestSeason) return { error: "No season found." };

  const { data, error } = await supabase
    .from("v_player_season_stats")
    .select(`
      player_id,
      player_name,
      team_name,
      season_name,
      games_played,
      ppg,
      rpg,
      apg,
      spg,
      bpg,
      two_pct,
      three_pct,
      ft_pct,
      fg_pct,
      efficiency
    `)
    .eq("season_id", newestSeason.id)
    .gt("games_played", 0)
    .order(safeMetric, { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) return { error: error.message };
  return {
    season: newestSeason.name,
    metric: safeMetric,
    leaders: data ?? [],
  };
}

async function getRecentTeamGames(teamName: unknown, requestedLimit: unknown) {
  const search = cleanSearch(teamName);
  if (!search) return { error: "A team name is required." };

  const limit = clampLimit(requestedLimit, 10, 5);

  const { data: teams, error: teamError } = await supabase
    .from("teams")
    .select("id,name")
    .ilike("name", `%${search}%`)
    .limit(5);

  if (teamError) return { error: teamError.message };
  if (!teams || teams.length === 0) {
    return { searched_name: search, teams: [], games: [] };
  }

  const results: any[] = [];

  for (const team of teams) {
    const { data, error } = await supabase
      .from("games")
      .select(`
        id,
        game_date,
        game_time,
        status,
        division,
        current_period,
        clock_seconds,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_team:teams!games_home_team_id_fkey(id,name),
        away_team:teams!games_away_team_id_fkey(id,name)
      `)
      .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
      .order("game_date", { ascending: false })
      .order("game_time", { ascending: false })
      .limit(limit);

    if (!error) results.push({ team, games: data ?? [] });
  }

  return { searched_name: search, results };
}

async function getGameBoxscore(gameId: unknown) {
  const id = String(gameId ?? "").trim();
  if (!id) return { error: "Game ID is required." };

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(`
      id,
      game_date,
      game_time,
      venue,
      status,
      division,
      current_period,
      clock_seconds,
      clock_running,
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
      home_team:teams!games_home_team_id_fkey(id,name),
      away_team:teams!games_away_team_id_fkey(id,name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (gameError) return { error: gameError.message };
  if (!game) return { error: "Game not found." };

  const { data: playerStats, error: statError } = await supabase
    .from("player_game_stats")
    .select(`
      player_id,
      team_id,
      side,
      jersey_number,
      points,
      rebounds,
      assists,
      steals,
      blocks,
      turnovers,
      fouls,
      two_made,
      two_attempted,
      two_pct,
      three_made,
      three_attempted,
      three_pct,
      ft_made,
      ft_attempted,
      ft_pct,
      offensive_rebounds,
      defensive_rebounds,
      plus_minus,
      efficiency,
      player:players(id,name)
    `)
    .eq("game_id", id)
    .order("points", { ascending: false });

  if (statError) return { error: statError.message };
  return { game, player_stats: playerStats ?? [] };
}

async function getGamesByStatus(status: unknown, requestedLimit: unknown) {
  const safeStatus = String(status ?? "");
  if (!["live", "scheduled", "finished"].includes(safeStatus)) {
    return { error: "Invalid game status." };
  }

  const limit = clampLimit(requestedLimit, 20, 10);

  let query = supabase
    .from("games")
    .select(`
      id,
      season_id,
      game_date,
      game_time,
      venue,
      status,
      current_period,
      clock_seconds,
      clock_running,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(id,name),
      away_team:teams!games_away_team_id_fkey(id,name)
    `)
    .eq("status", safeStatus);

  query =
    safeStatus === "finished"
      ? query
          .order("game_date", { ascending: false })
          .order("game_time", { ascending: false })
      : query
          .order("game_date", { ascending: true })
          .order("game_time", { ascending: true });

  const { data, error } = await query.limit(limit);
  if (error) return { error: error.message };
  return { status: safeStatus, games: data ?? [] };
}


async function searchPhotos(args: any, media: AIMedia[]) {
  const limit = clampLimit(args.limit, 12, 8);
  const gameId = String(args.game_id ?? "").trim();
  const teamSearch = cleanSearch(args.team_name);

  let albumIds: string[] = [];

  if (gameId) {
    const { data, error } = await supabase
      .from("photo_albums")
      .select("id")
      .eq("game_id", gameId)
      .limit(20);
    if (error) return { error: error.message };
    albumIds = (data ?? []).map((row: any) => row.id);
  } else if (teamSearch) {
    const { data: teams, error: teamError } = await supabase
      .from("teams")
      .select("id,name")
      .ilike("name", `%${teamSearch}%`)
      .limit(5);
    if (teamError) return { error: teamError.message };
    const teamIds = (teams ?? []).map((row: any) => row.id);
    if (!teamIds.length) return { searched_team: teamSearch, albums: [], photos: [] };

    const { data: links, error: linkError } = await supabase
      .from("photo_album_teams")
      .select("album_id,team_id")
      .in("team_id", teamIds)
      .limit(100);
    if (linkError) return { error: linkError.message };
    albumIds = Array.from(new Set((links ?? []).map((row: any) => row.album_id)));
  } else {
    const { data, error } = await supabase
      .from("photo_albums")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(8);
    if (error) return { error: error.message };
    albumIds = (data ?? []).map((row: any) => row.id);
  }

  if (!albumIds.length) return { albums: [], photos: [] };

  const { data: albums, error: albumError } = await supabase
    .from("photo_albums")
    .select("id,title,drive_folder_url,game_id,season_id,updated_at")
    .in("id", albumIds)
    .order("updated_at", { ascending: false });
  if (albumError) return { error: albumError.message };

  const selectedAlbumIds = (albums ?? []).slice(0, 8).map((row: any) => row.id);
  const { data: photos, error: photoError } = await supabase
    .from("photos")
    .select("id,album_id,drive_file_id,name,sort_order")
    .in("album_id", selectedAlbumIds)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (photoError) return { error: photoError.message };

  for (const photo of photos ?? []) {
    const album = (albums ?? []).find((row: any) => row.id === photo.album_id);
    media.push(photoMedia(photo, album));
  }

  return {
    searched_team: teamSearch || null,
    albums: albums ?? [],
    sample_photos: (photos ?? []).map((photo: any) => ({
      id: photo.id,
      name: photo.name,
      album_id: photo.album_id,
      drive_file_id: photo.drive_file_id,
    })),
    note: "Sample photos are attached to the response. Ask to inspect a returned photo for visual analysis.",
  };
}

async function searchHighlights(args: any, media: AIMedia[]) {
  const limit = clampLimit(args.limit, 12, 6);
  const gameId = String(args.game_id ?? "").trim();
  const teamSearch = cleanSearch(args.team_name);

  let highlightIds: string[] | null = null;

  if (teamSearch) {
    const { data: teams, error: teamError } = await supabase
      .from("teams")
      .select("id,name")
      .ilike("name", `%${teamSearch}%`)
      .limit(5);
    if (teamError) return { error: teamError.message };
    const teamIds = (teams ?? []).map((row: any) => row.id);
    if (!teamIds.length) return { searched_team: teamSearch, highlights: [] };

    const { data: links, error: linkError } = await supabase
      .from("highlight_teams")
      .select("highlight_id,team_id")
      .in("team_id", teamIds)
      .limit(200);
    if (linkError) return { error: linkError.message };
    highlightIds = Array.from(new Set((links ?? []).map((row: any) => row.highlight_id)));
    if (!highlightIds.length) return { searched_team: teamSearch, highlights: [] };
  }

  let query = supabase
    .from("highlights")
    .select("id,youtube_video_id,youtube_url,title,season_id,game_id,playlist_id,created_at")
    .order("created_at", { ascending: false });

  if (gameId) query = query.eq("game_id", gameId);
  if (highlightIds) query = query.in("id", highlightIds);

  const { data, error } = await query.limit(limit);
  if (error) return { error: error.message };

  for (const row of data ?? []) media.push(videoMedia(row));

  return {
    searched_team: teamSearch || null,
    highlights: data ?? [],
    note: "Video cards are attached to the response. Free OBS AI video analysis is disabled because the current OpenRouter video-input path requires paid balance.",
  };
}

async function getGameMedia(args: any, media: AIMedia[]) {
  const gameId = String(args.game_id ?? "").trim();
  if (!gameId) return { error: "Game ID is required." };

  const photoLimit = clampLimit(args.photo_limit, 12, 8);
  const videoLimit = clampLimit(args.video_limit, 10, 6);

  const [photoResult, videoResult] = await Promise.all([
    searchPhotos({ game_id: gameId, limit: photoLimit }, media),
    searchHighlights({ game_id: gameId, limit: videoLimit }, media),
  ]);

  return { game_id: gameId, photos: photoResult, videos: videoResult };
}

async function inspectPhoto(photoId: unknown, question: unknown, media: AIMedia[]) {
  const id = String(photoId ?? "").trim();
  const prompt = String(question ?? "").trim() || "Describe the basketball action in this image.";
  if (!id) return { error: "Photo ID is required." };

  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .select("id,album_id,drive_file_id,name,mime_type,sort_order")
    .eq("id", id)
    .maybeSingle();
  if (photoError) return { error: photoError.message };
  if (!photo) return { error: "Photo not found." };

  const { data: album } = await supabase
    .from("photo_albums")
    .select("id,title,game_id,season_id,drive_folder_url")
    .eq("id", photo.album_id)
    .maybeSingle();

  media.push(photoMedia(photo, album));

  const cached = await readPhotoCache(id, prompt);
  if (cached) return { photo, album, analysis: cached, cached: true };

  const imageResponse = await fetch(
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(photo.drive_file_id)}&sz=w2000`,
    { cache: "no-store" }
  );
  if (!imageResponse.ok) {
    return { error: "Google Drive photo could not be loaded for AI inspection." };
  }

  const mimeType = imageResponse.headers.get("content-type") || photo.mime_type || "image/jpeg";
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64 = buffer.toString("base64");

  const analysis = await openRouterImageAnalysis(base64, mimeType, `
You are the film-analysis assistant for Observation Basketball (OBS).
Analyze this basketball photo. Answer the user's question: ${prompt}

Rules:
- Do not identify anyone by face.
- You may mention visible jersey numbers, uniforms, court positioning, ball location, and apparent basketball action.
- If a detail is not visually clear, say it is uncertain.
- Do not invent the official score or statistics.
- Keep the answer focused and useful.
`);

  await writePhotoCache(id, prompt, analysis);
  return { photo, album, analysis, cached: false };
}


async function openRouterImageAnalysis(base64: string, mimeType: string, prompt: string) {
  requireOpenRouterKey();

  // openrouter/free explicitly supports text + image input and has $0 token pricing.
  return await openRouterMediaCompletion(
    process.env.OPENROUTER_IMAGE_MODEL || "openrouter/free",
    [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
        },
      },
    ],
    1200
  );
}

async function openRouterMediaCompletion(
  model: string,
  content: any[],
  maxTokens: number
) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "Observation Basketball",
    },
    cache: "no-store",
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.15,
      max_tokens: maxTokens,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      payload?.error?.message ??
      payload?.message ??
      "OpenRouter media analysis failed.";

    if (String(detail).toLowerCase().includes("video")) {
      throw new Error(
        `${detail} The free OBS video model supports short clips only, and direct video-URL support can vary by provider.`
      );
    }

    throw new Error(detail);
  }

  const message = payload?.choices?.[0]?.message?.content;
  const text =
    typeof message === "string"
      ? message.trim()
      : Array.isArray(message)
      ? message.map((part: any) => part?.text ?? "").join("").trim()
      : "";

  if (!text) throw new Error("OpenRouter returned no media analysis.");
  return text;
}

function requireOpenRouterKey() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured. Add it to .env.local and restart Next.js."
    );
  }
}

function parseMediaJson(text: string): MediaVideoAnalysis | { raw: string } {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {}
    }
    return { raw: text };
  }
}

function photoMedia(photo: any, album: any): AIMedia {
  const driveId = String(photo.drive_file_id);
  return {
    type: "photo",
    id: String(photo.id),
    title: album?.title ? `${album.title} · ${photo.name ?? "Photo"}` : photo.name ?? "OBS Photo",
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w900`,
    fullUrl: `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w2200`,
    albumId: photo.album_id ?? null,
    gameId: album?.game_id ?? null,
  };
}

function videoMedia(highlight: any, timestampSeconds?: number | null, timestampLabel?: string | null): AIMedia {
  const videoId = String(highlight.youtube_video_id);
  return {
    type: "video",
    id: timestampSeconds != null ? `${highlight.id}-${timestampSeconds}` : String(highlight.id),
    title: String(highlight.title ?? "OBS Video"),
    youtubeVideoId: videoId,
    youtubeUrl: String(highlight.youtube_url),
    thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
    gameId: highlight.game_id ?? null,
    timestampSeconds: timestampSeconds ?? null,
    timestampLabel: timestampLabel ?? null,
  };
}

function dedupeMedia(items: AIMedia[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key =
      item.type === "video"
        ? `video:${item.youtubeVideoId}:${item.timestampSeconds ?? ""}`
        : `photo:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizedQuestion(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 500);
}

async function readPhotoCache(photoId: string, question: string) {
  try {
    const { data } = await supabase
      .from("ai_photo_analyses")
      .select("analysis_text")
      .eq("photo_id", photoId)
      .eq("question_key", normalizedQuestion(question))
      .maybeSingle();
    return data?.analysis_text ?? null;
  } catch {
    return null;
  }
}

async function writePhotoCache(photoId: string, question: string, analysis: string) {
  if (!serverSupabase) return;
  await serverSupabase.from("ai_photo_analyses").upsert(
    {
      photo_id: photoId,
      question_key: normalizedQuestion(question),
      question,
      analysis_text: analysis,
      model: process.env.OPENROUTER_IMAGE_MODEL || "openrouter/free",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "photo_id,question_key" }
  );
}

function cleanSearch(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[%_,]/g, "")
    .slice(0, 100);
}

function clampLimit(value: unknown, maximum: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(1, Math.floor(number)));
}
