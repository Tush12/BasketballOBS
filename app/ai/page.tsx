"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLanguage } from "@/components/language-provider";

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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  media?: AIMedia[];
};

const STARTERS = [
  "Who leads the league in scoring?",
  "Show me photos from VISION's latest game",
  "Find videos from OBS Zero's most recent game",
  "Show me REBOUND KING photos and highlights",
  "What games are coming up?",
  "Predict VISION vs OBS Zero",
];

const CAPABILITIES = [
  "Players",
  "Teams",
  "Standings",
  "Photos",
  "Videos",
  "Photo Analysis",
  "Predictions",
];

export default function OBSAIPage() {
  const { language } = useLanguage();
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /*
   * Keep the AI route as an app-like screen:
   * no document/body scrolling. Only the message
   * history panel can scroll internally.
   */
  useEffect(() => {
    const htmlOverflow =
      document.documentElement
        .style.overflow;

    const bodyOverflow =
      document.body.style
        .overflow;

    document.documentElement
      .style.overflow =
      "hidden";

    document.body.style.overflow =
      "hidden";

    return () => {
      document.documentElement
        .style.overflow =
        htmlOverflow;

      document.body.style.overflow =
        bodyOverflow;
    };
  }, []);


  useEffect(() => {
    messagesEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
  }, [
    messages,
    loading,
  ]);


  async function ask(
    prompt: string
  ) {
    const clean =
      prompt.trim();

    if (
      !clean ||
      loading
    ) {
      return;
    }

    const userMessage:
      ChatMessage = {
      role: "user",
      content: clean,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(
      nextMessages
    );

    setInput("");
    setError("");
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/ai",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                messages:
                  nextMessages,
                language,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ??
            "OBS AI could not answer that request."
        );
      }

      setMessages(
        (
          current
        ) => [
          ...current,
          {
            role:
              "assistant",
            content:
              String(
                data?.answer ??
                  "I couldn't generate an answer."
              ),
            media:
              Array.isArray(data?.media)
                ? data.media
                : [],
          },
        ]
      );
    } catch (
      requestError: any
    ) {
      setError(
        requestError?.message ??
          "OBS AI is temporarily unavailable."
      );
    } finally {
      setLoading(
        false
      );
    }
  }


  function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();
    ask(input);
  }


  function handleKeyDown(
    e:
      KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      e.key ===
        "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      ask(input);
    }
  }


  function newChat() {
    if (
      loading
    ) {
      return;
    }

    setMessages([]);
    setInput("");
    setError("");
  }


  return (
    <main
      className="overflow-hidden"
      style={{
        height:
          "calc(100dvh - 72px)",
        background:
          "var(--background)",
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl min-h-0 gap-4 px-3 py-3 sm:px-5 sm:py-4 lg:gap-5">

        {/* ============================================
            DESKTOP SIDEBAR
            ============================================ */}

        <aside
          className="hidden w-[285px] shrink-0 flex-col overflow-hidden rounded-[1.6rem] border lg:flex"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
          }}
        >
          <div className="border-b p-5"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black text-white"
              style={{
                background:
                  "var(--primary)",
              }}
            >
              AI
            </div>

            <p
              className="mt-4 text-xs font-black uppercase tracking-[0.2em]"
              style={{
                color:
                  "var(--primary)",
              }}
            >
              Observation Basketball
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight">
              OBS AI
            </h1>

            <p
              className="mt-2 text-sm leading-6"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              Ask about live league data, photos, highlights, and AI photo analysis.
            </p>
          </div>


          <div className="min-h-0 flex-1 overflow-y-auto p-4">

            <p
              className="px-1 text-xs font-black uppercase tracking-[0.16em]"
              style={{
                color:
                  "var(--muted-foreground)",
              }}
            >
              Try asking
            </p>

            <div className="mt-3 space-y-2">
              {STARTERS.map(
                (
                  starter
                ) => (
                  <button
                    key={
                      starter
                    }
                    type="button"
                    disabled={
                      loading
                    }
                    onClick={() =>
                      ask(
                        starter
                      )
                    }
                    className="w-full rounded-xl border px-3 py-3 text-left text-sm font-bold leading-5 transition hover:-translate-y-0.5 disabled:opacity-40"
                    style={{
                      borderColor:
                        "var(--border)",
                      background:
                        "var(--surface)",
                    }}
                  >
                    {starter}
                  </button>
                )
              )}
            </div>

          </div>


          <div
            className="border-t p-4"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <button
              type="button"
              disabled={
                loading
              }
              onClick={
                newChat
              }
              className="w-full rounded-xl border px-4 py-3 text-sm font-black transition disabled:opacity-40"
              style={{
                borderColor:
                  "var(--border)",
                background:
                  "var(--surface)",
              }}
            >
              + New Chat
            </button>
          </div>
        </aside>


        {/* ============================================
            CHAT
            ============================================ */}

        <section
          className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] border"
          style={{
            borderColor:
              "var(--border)",
            background:
              "var(--card)",
            boxShadow:
              "var(--shadow-card)",
          }}
        >

          {/* HEADER */}

          <div
            className="shrink-0 border-b px-4 py-3 sm:px-5"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{
                      background:
                        "var(--primary)",
                    }}
                  />

                  <p className="truncate text-base font-black sm:text-lg">
                    OBS AI
                  </p>

                </div>

                <p
                  className="mt-0.5 hidden text-xs sm:block"
                  style={{
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  League data · photos · highlights · photo intelligence
                </p>

              </div>


              <button
                type="button"
                onClick={
                  newChat
                }
                disabled={
                  loading
                }
                className="shrink-0 rounded-xl border px-3 py-2 text-xs font-black lg:hidden"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--surface)",
                }}
              >
                New Chat
              </button>

            </div>


            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {CAPABILITIES.map(
                (
                  item
                ) => (
                  <span
                    key={
                      item
                    }
                    className="shrink-0 rounded-full border px-3 py-1 text-[11px] font-black"
                    style={{
                      borderColor:
                        "var(--border)",
                      background:
                        "var(--surface)",
                      color:
                        "var(--muted-foreground)",
                    }}
                  >
                    {item}
                  </span>
                )
              )}
            </div>

          </div>


          {/* MESSAGE HISTORY — THIS IS THE ONLY VERTICAL SCROLLER */}

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
            style={{
              scrollbarGutter:
                "stable",
            }}
          >

            {messages.length ===
            0 ? (

              <EmptyState
                onAsk={
                  ask
                }
                loading={
                  loading
                }
              />

            ) : (

              <div className="mx-auto w-full max-w-3xl space-y-4">

                {messages.map(
                  (
                    message,
                    index
                  ) => (
                    <MessageBubble
                      key={`${message.role}-${index}`}
                      message={
                        message
                      }
                    />
                  )
                )}


                {loading && (
                  <div className="flex justify-start">

                    <div
                      className="rounded-2xl rounded-bl-md border px-4 py-3"
                      style={{
                        borderColor:
                          "var(--border)",
                        background:
                          "var(--surface)",
                      }}
                    >
                      <div className="flex items-center gap-2">

                        <ThinkingDot />
                        <ThinkingDot delay="120ms" />
                        <ThinkingDot delay="240ms" />

                        <span
                          className="ml-1 text-xs font-bold"
                          style={{
                            color:
                              "var(--muted-foreground)",
                          }}
                        >
                          Checking OBS data & media…
                        </span>

                      </div>
                    </div>

                  </div>
                )}


                <div
                  ref={
                    messagesEndRef
                  }
                />

              </div>

            )}

          </div>


          {/* ERROR */}

          {error && (
            <div className="shrink-0 px-3 pb-2 sm:px-5">
              <div
                className="rounded-xl border px-4 py-2 text-sm font-bold"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--danger) 40%, var(--border))",
                  background:
                    "color-mix(in srgb, var(--danger) 8%, var(--card))",
                  color:
                    "var(--danger)",
                }}
              >
                {error}
              </div>
            </div>
          )}


          {/* COMPOSER */}

          <div
            className="shrink-0 border-t p-3 sm:p-4"
            style={{
              borderColor:
                "var(--border)",
              background:
                "color-mix(in srgb, var(--card) 94%, transparent)",
            }}
          >
            <form
              onSubmit={
                handleSubmit
              }
              className="mx-auto flex max-w-3xl items-end gap-2"
            >

              <div
                className="min-w-0 flex-1 rounded-2xl border px-4 py-2"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--surface)",
                }}
              >
                <textarea
                  value={
                    input
                  }
                  onChange={(e) =>
                    setInput(
                      e.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  disabled={
                    loading
                  }
                  rows={1}
                  placeholder="Ask about stats, photos, highlights, a player, team, or game…"
                  className="max-h-24 min-h-[28px] w-full resize-none bg-transparent py-1 text-sm outline-none placeholder:opacity-60 sm:text-base"
                />

                <div
                  className="mt-1 flex items-center justify-between gap-3 text-[10px] sm:text-[11px]"
                  style={{
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  <span>
                    Enter to send · Shift+Enter for new line
                  </span>

                  <span className="hidden sm:inline">
                    Uses OBS data + media
                  </span>
                </div>

              </div>


              <button
                type="submit"
                disabled={
                  loading ||
                  !input.trim()
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-white transition hover:scale-[1.03] disabled:opacity-40"
                style={{
                  background:
                    "var(--primary)",
                }}
                aria-label="Send message"
                title="Send"
              >
                {loading
                  ? "…"
                  : "↑"}
              </button>

            </form>
          </div>

        </section>

      </div>
    </main>
  );
}


function EmptyState({
  onAsk,
  loading,
}: {
  onAsk:
    (
      prompt: string
    ) => void;
  loading: boolean;
}) {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center">

      <div className="w-full max-w-2xl text-center">

        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] text-2xl font-black text-white"
          style={{
            background:
              "linear-gradient(145deg, var(--primary), color-mix(in srgb, var(--primary) 72%, black))",
          }}
        >
          AI
        </div>

        <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
          Ask Observation Basketball.
        </h2>

        <p
          className="mx-auto mt-2 max-w-xl text-sm leading-6 sm:text-base"
          style={{
            color:
              "var(--muted-foreground)",
          }}
        >
          Explore players, team form, standings, photos, highlights, AI photo/short-clip film analysis and data-driven matchup predictions.
        </p>


        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:hidden">

          {STARTERS.slice(
            0,
            4
          ).map(
            (
              starter
            ) => (
              <button
                key={
                  starter
                }
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  onAsk(
                    starter
                  )
                }
                className="rounded-xl border px-4 py-3 text-left text-sm font-bold transition active:scale-[0.99]"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--surface)",
                }}
              >
                {starter}
              </button>
            )
          )}

        </div>


        <div className="mt-6 hidden flex-wrap justify-center gap-2 lg:flex">

          {CAPABILITIES.map(
            (
              capability
            ) => (
              <span
                key={
                  capability
                }
                className="rounded-full border px-3 py-1.5 text-xs font-black"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--surface)",
                  color:
                    "var(--muted-foreground)",
                }}
              >
                {capability}
              </span>
            )
          )}

        </div>

      </div>

    </div>
  );
}


function MessageBubble({
  message,
}: {
  message:
    ChatMessage;
}) {
  const isUser =
    message.role ===
    "user";

  return (
    <div
      className={`flex ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-6 sm:text-[15px] ${
          isUser
            ? "max-w-[88%] rounded-br-md sm:max-w-[82%]"
            : "max-w-[98%] rounded-bl-md border sm:max-w-[96%]"
        }`}
        style={
          isUser
            ? {
                background:
                  "var(--primary)",
                color:
                  "white",
              }
            : {
                borderColor:
                  "var(--border)",
                background:
                  "var(--surface)",
                color:
                  "var(--foreground)",
              }
        }
      >
        {!isUser && (
          <p
            className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]"
            style={{
              color:
                "var(--primary)",
            }}
          >
            OBS AI
          </p>
        )}

        {isUser ? (
          <div className="whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <>
            <AssistantMessageContent
              content={
                message.content
              }
            />
            {message.media && message.media.length > 0 && (
              <MediaGallery media={message.media} />
            )}
          </>
        )}
      </div>
    </div>
  );
}



function MediaGallery({ media }: { media: AIMedia[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const photos = media.filter((item): item is Extract<AIMedia, { type: "photo" }> => item.type === "photo");
  const videos = media.filter((item): item is Extract<AIMedia, { type: "video" }> => item.type === "video");

  return (
    <div className="mt-4 space-y-4">
      {photos.length > 0 && (
        <div>
          <p
            className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            OBS Photos
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.slice(0, 9).map((photo) => (
              <a
                key={photo.id}
                href={photo.fullUrl}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl border"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.title}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                />
                <div className="p-2">
                  <p className="line-clamp-2 text-[11px] font-bold leading-4">{photo.title}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <p
            className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            OBS Videos & Key Moments
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {videos.slice(0, 10).map((video) => {
              const start = Math.max(0, Number(video.timestampSeconds ?? 0));
              const playerKey = `${video.youtubeVideoId}-${start}`;
              const embedUrl = `https://www.youtube.com/embed/${video.youtubeVideoId}?rel=0&start=${start}`;
              const watchUrl = `${video.youtubeUrl}${video.youtubeUrl.includes("?") ? "&" : "?"}t=${start}s`;

              return (
                <div
                  key={video.id}
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: "var(--border)", background: "var(--card)" }}
                >
                  {playing === playerKey ? (
                    <div className="aspect-video w-full bg-black">
                      <iframe
                        src={embedUrl}
                        title={video.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlaying(playerKey)}
                      className="group relative block aspect-video w-full overflow-hidden bg-black text-left"
                    >
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        loading="lazy"
                        className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.02]"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="rounded-full px-4 py-2 text-sm font-black text-white shadow-lg"
                          style={{ background: "var(--primary)" }}
                        >
                          ▶ Watch here
                        </span>
                      </span>
                    </button>
                  )}

                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-xs font-black leading-5">{video.title}</p>
                      {video.timestampLabel && (
                        <span
                          className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black"
                          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                        >
                          {video.timestampLabel}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPlaying(playerKey)}
                        className="rounded-lg border px-2.5 py-1.5 text-[11px] font-black"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Watch here
                      </button>
                      <a
                        href={watchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border px-2.5 py-1.5 text-[11px] font-black"
                        style={{ borderColor: "var(--border)", color: "var(--primary)" }}
                      >
                        YouTube ↗
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function AssistantMessageContent({
  content,
}: {
  content: string;
}) {
  const lines =
    content.replace(
      /\r\n/g,
      "\n"
    ).split("\n");

  const blocks:
    React.ReactNode[] =
    [];

  let i = 0;

  while (
    i <
    lines.length
  ) {
    const line =
      lines[i];

    const trimmed =
      line.trim();

    if (
      !trimmed
    ) {
      i += 1;
      continue;
    }

    /*
     * MARKDOWN TABLE
     * Header row followed by | --- | --- |
     */
    if (
      line.includes("|") &&
      i + 1 <
        lines.length &&
      isTableSeparator(
        lines[i + 1]
      )
    ) {
      const headers =
        splitTableRow(
          line
        );

      i += 2;

      const rows:
        string[][] =
        [];

      while (
        i <
          lines.length &&
        lines[i].includes(
          "|"
        ) &&
        lines[i].trim()
      ) {
        rows.push(
          splitTableRow(
            lines[i]
          )
        );

        i += 1;
      }

      blocks.push(
        <MarkdownTable
          key={`table-${i}`}
          headers={
            headers
          }
          rows={
            rows
          }
        />
      );

      continue;
    }

    /*
     * HEADINGS
     */
    const heading =
      trimmed.match(
        /^(#{1,4})\s+(.+)$/
      );

    if (
      heading
    ) {
      blocks.push(
        <div
          key={`heading-${i}`}
          className={
            heading[1].length <=
            2
              ? "mb-2 mt-3 text-base font-black sm:text-lg"
              : "mb-1 mt-3 font-black"
          }
        >
          {renderInline(
            heading[2]
          )}
        </div>
      );

      i += 1;
      continue;
    }

    /*
     * BULLET LIST
     */
    if (
      /^[-*]\s+/.test(
        trimmed
      )
    ) {
      const items:
        string[] =
        [];

      while (
        i <
          lines.length &&
        /^[-*]\s+/.test(
          lines[i].trim()
        )
      ) {
        items.push(
          lines[i]
            .trim()
            .replace(
              /^[-*]\s+/,
              ""
            )
        );

        i += 1;
      }

      blocks.push(
        <ul
          key={`ul-${i}`}
          className="my-2 space-y-1.5 pl-5"
        >
          {items.map(
            (
              item,
              index
            ) => (
              <li
                key={
                  index
                }
                className="list-disc"
              >
                {renderInline(
                  item
                )}
              </li>
            )
          )}
        </ul>
      );

      continue;
    }

    /*
     * NUMBERED LIST
     */
    if (
      /^\d+\.\s+/.test(
        trimmed
      )
    ) {
      const items:
        string[] =
        [];

      while (
        i <
          lines.length &&
        /^\d+\.\s+/.test(
          lines[i].trim()
        )
      ) {
        items.push(
          lines[i]
            .trim()
            .replace(
              /^\d+\.\s+/,
              ""
            )
        );

        i += 1;
      }

      blocks.push(
        <ol
          key={`ol-${i}`}
          className="my-2 space-y-1.5 pl-5"
        >
          {items.map(
            (
              item,
              index
            ) => (
              <li
                key={
                  index
                }
                className="list-decimal"
              >
                {renderInline(
                  item
                )}
              </li>
            )
          )}
        </ol>
      );

      continue;
    }

    /*
     * NORMAL PARAGRAPH.
     * Collect consecutive non-special lines so replies do not
     * become one paragraph per source line.
     */
    const paragraphLines =
      [trimmed];

    i += 1;

    while (
      i <
      lines.length
    ) {
      const next =
        lines[i].trim();

      if (
        !next ||
        /^#{1,4}\s+/.test(
          next
        ) ||
        /^[-*]\s+/.test(
          next
        ) ||
        /^\d+\.\s+/.test(
          next
        ) ||
        (
          lines[i].includes(
            "|"
          ) &&
          i + 1 <
            lines.length &&
          isTableSeparator(
            lines[i + 1]
          )
        )
      ) {
        break;
      }

      paragraphLines.push(
        next
      );

      i += 1;
    }

    blocks.push(
      <p
        key={`p-${i}`}
        className="my-2"
      >
        {renderInline(
          paragraphLines.join(
            " "
          )
        )}
      </p>
    );
  }

  return (
    <div className="min-w-0">
      {blocks}
    </div>
  );
}


function MarkdownTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="my-3 max-w-full overflow-x-auto rounded-xl border"
      style={{
        borderColor:
          "var(--border)",
      }}
    >
      <table className="w-full min-w-max border-collapse text-left text-xs sm:text-sm">

        <thead
          style={{
            background:
              "var(--card)",
          }}
        >
          <tr>
            {headers.map(
              (
                header,
                index
              ) => (
                <th
                  key={
                    index
                  }
                  className="whitespace-nowrap border-b px-3 py-2.5 font-black"
                  style={{
                    borderColor:
                      "var(--border)",
                    color:
                      "var(--muted-foreground)",
                  }}
                >
                  {renderInline(
                    header
                  )}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (
              row,
              rowIndex
            ) => (
              <tr
                key={
                  rowIndex
                }
                style={{
                  background:
                    rowIndex %
                      2 ===
                    0
                      ? "transparent"
                      : "color-mix(in srgb, var(--card) 45%, transparent)",
                }}
              >
                {headers.map(
                  (
                    _,
                    columnIndex
                  ) => (
                    <td
                      key={
                        columnIndex
                      }
                      className="whitespace-nowrap border-b px-3 py-2.5 last:border-b"
                      style={{
                        borderColor:
                          "var(--border)",
                      }}
                    >
                      {renderInline(
                        row[
                          columnIndex
                        ] ??
                          ""
                      )}
                    </td>
                  )
                )}
              </tr>
            )
          )}
        </tbody>

      </table>
    </div>
  );
}


function splitTableRow(
  line: string
) {
  return line
    .trim()
    .replace(
      /^\|/,
      ""
    )
    .replace(
      /\|$/,
      ""
    )
    .split("|")
    .map(
      (
        cell
      ) =>
        cell.trim()
    );
}


function isTableSeparator(
  line: string
) {
  if (
    !line.includes(
      "|"
    )
  ) {
    return false;
  }

  const cells =
    splitTableRow(
      line
    );

  return (
    cells.length >
      0 &&
    cells.every(
      (
        cell
      ) =>
        /^:?-{3,}:?$/.test(
          cell
        )
    )
  );
}


function renderInline(
  text: string
): React.ReactNode[] {
  const parts =
    text.split(
      /(\*\*[^*]+\*\*|`[^`]+`)/
    );

  return parts.map(
    (
      part,
      index
    ) => {
      if (
        part.startsWith(
          "**"
        ) &&
        part.endsWith(
          "**"
        )
      ) {
        return (
          <strong
            key={
              index
            }
            className="font-black"
          >
            {part.slice(
              2,
              -2
            )}
          </strong>
        );
      }

      if (
        part.startsWith(
          "`"
        ) &&
        part.endsWith(
          "`"
        )
      ) {
        return (
          <code
            key={
              index
            }
            className="rounded px-1.5 py-0.5 font-mono text-[0.9em]"
            style={{
              background:
                "var(--card)",
            }}
          >
            {part.slice(
              1,
              -1
            )}
          </code>
        );
      }

      return part;
    }
  );
}


function ThinkingDot({
  delay = "0ms",
}: {
  delay?: string;
}) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse rounded-full"
      style={{
        background:
          "var(--primary)",
        animationDelay:
          delay,
      }}
    />
  );
}
