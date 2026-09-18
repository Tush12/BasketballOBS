"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "./theme-provider";
import { useLanguage } from "./language-provider";

export default function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const logoSrc =
    theme === "dark"
      ? "/obs-logo-dark.png"
      : "/obs-logo-light.png";

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
      setSettingsOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function closeSettings(event: PointerEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeSettings);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", closeSettings);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    function syncFullscreenState() {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };

      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
            doc.webkitFullscreenElement
        )
      );
    }

    document.addEventListener(
      "fullscreenchange",
      syncFullscreenState
    );

    document.addEventListener(
      "webkitfullscreenchange",
      syncFullscreenState as EventListener
    );

    syncFullscreenState();

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        syncFullscreenState
      );

      document.removeEventListener(
        "webkitfullscreenchange",
        syncFullscreenState as EventListener
      );
    };
  }, []);


  async function toggleFullscreen() {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    const currentlyFullscreen =
      Boolean(
        document.fullscreenElement ||
          doc.webkitFullscreenElement
      );

    try {
      if (currentlyFullscreen) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (
          doc.webkitExitFullscreen
        ) {
          await doc.webkitExitFullscreen();
        }
      } else {
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if (
          root.webkitRequestFullscreen
        ) {
          await root.webkitRequestFullscreen();
        }
      }
    } catch (error) {
      console.error(
        "Fullscreen request failed:",
        error
      );
    }
  }


  /*
   * The live scorer uses the full viewport on phones/iPad.
   * Keep the normal header on /scorer dashboard, but hide it
   * on an individual /scorer/[gameId] route.
   */
  if (
    pathname?.startsWith("/scorer/") &&
    pathname !== "/scorer/"
  ) {
    return null;
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{
        borderColor: "var(--border)",
        background:
          "color-mix(in srgb, var(--card) 92%, transparent)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[72px] items-center justify-between gap-3">
          <Link
            href="/"
            onClick={() => {
              setMenuOpen(false);
              setSettingsOpen(false);
            }}
            className="flex min-w-0 items-center gap-3"
          >
            <Image
              src={logoSrc}
              alt="Observation Basketball"
              width={52}
              height={52}
              priority
              className="h-11 w-11 shrink-0 object-contain sm:h-13 sm:w-13"
            />
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            <NavLink href="/" label="Home" />
            <NavLink href="/games" label="Games" />
            <NavLink href="/standings" label="Standings" />
            <NavLink href="/teams" label="Teams" />
            <NavLink href="/players" label="Players" />
            <NavLink href="/highlights" label="Highlights" />
            <NavLink href="/photos" label="Photos" />
            <NavLink href="/ai" label="OBS AI" />
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <SocialIconLink
                href="https://www.instagram.com/observationbasketball/"
                label="Observation Basketball on Instagram"
              >
                <InstagramIcon />
              </SocialIconLink>

              <SocialIconLink
                href="https://www.facebook.com/ObservationBasketball/"
                label="Observation Basketball on Facebook"
              >
                <FacebookIcon />
              </SocialIconLink>
            </div>

            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen((current) => !current);
                  setMenuOpen(false);
                }}
                aria-label="Settings"
                title="Settings"
                aria-expanded={settingsOpen}
                aria-haspopup="menu"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition hover:scale-105"
                style={{
                  borderColor: "var(--border)",
                  background: settingsOpen ? "var(--primary-soft)" : "var(--card)",
                  color: settingsOpen ? "var(--primary)" : "var(--foreground)",
                }}
              >
                <SettingsIcon />
              </button>

              {settingsOpen && (
                <SettingsMenu
                  language={language}
                  setLanguage={setLanguage}
                  theme={theme}
                  toggleTheme={toggleTheme}
                  isFullscreen={isFullscreen}
                  toggleFullscreen={toggleFullscreen}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setMenuOpen((current) => !current);
                setSettingsOpen(false);
              }}
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full border lg:hidden"
              style={{
                borderColor: "var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            className="border-t pb-4 pt-3 lg:hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <nav className="grid gap-2">
              {[
                ["/", "Home"],
                ["/games", "Games"],
                ["/standings", "Standings"],
                ["/teams", "Teams"],
                ["/players", "Players"],
                ["/highlights", "Highlights"],
                ["/photos", "Photos"],
                ["/ai", "OBS AI"],
              ].map(([href, label]) => (
                <MobileNavLink
                  key={href}
                  href={href}
                  label={label}
                  onClick={() => setMenuOpen(false)}
                />
              ))}
            </nav>

            <div
              className="mt-3 flex items-center gap-2 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <SocialIconLink
                href="https://www.instagram.com/observationbasketball/"
                label="Observation Basketball on Instagram"
              >
                <InstagramIcon />
              </SocialIconLink>

              <SocialIconLink
                href="https://www.facebook.com/ObservationBasketball/"
                label="Observation Basketball on Facebook"
              >
                <FacebookIcon />
              </SocialIconLink>

              <span
                className="ml-1 text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                Follow Observation Basketball
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-semibold transition hover:opacity-70"
    >
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-xl px-4 py-3 text-base font-bold transition"
      style={{
        background: "var(--surface)",
        color: "var(--foreground)",
      }}
    >
      {label}
    </Link>
  );
}

function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition hover:scale-105 hover:opacity-80"
      style={{
        borderColor: "var(--border)",
        background: "var(--card)",
        color: "var(--foreground)",
      }}
    >
      {children}
    </a>
  );
}


function SettingsMenu({
  language,
  setLanguage,
  theme,
  toggleTheme,
  isFullscreen,
  toggleFullscreen,
}: {
  language: "en" | "zh-HK";
  setLanguage: (language: "en" | "zh-HK") => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Settings"
      className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(18rem,calc(100vw-2rem))] rounded-lg border p-3 shadow-xl"
      style={{
        borderColor: "var(--border)",
        background: "var(--card)",
        color: "var(--foreground)",
      }}
    >
      <p className="px-1 pb-2 text-sm font-black">Settings</p>

      <div className="border-t py-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 px-1 text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
          Language
        </p>
        <div
          className="grid grid-cols-2 rounded-lg p-1"
          role="group"
          aria-label="Language"
          style={{ background: "var(--surface)" }}
        >
          {(["en", "zh-HK"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLanguage(option)}
              aria-pressed={language === option}
              className="h-9 min-h-0 rounded-md px-3 text-sm font-black transition"
              style={{
                background: language === option ? "var(--primary)" : "transparent",
                color:
                  language === option
                    ? "var(--primary-foreground)"
                    : "var(--muted-foreground)",
              }}
            >
              {option === "en" ? "English" : "粵語"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          role="menuitem"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold transition hover:opacity-75"
          style={{ background: "var(--surface)" }}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={toggleFullscreen}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold transition hover:opacity-75"
          style={{ background: "var(--surface)" }}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          <span>{isFullscreen ? "Exit full screen" : "Enter full screen"}</span>
        </button>
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}


function FacebookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.6 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.4V14h2.8v8h3.4z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.09.39.3.74.6 1 .3.27.7.41 1.1.4h.09v4h-.09a1.7 1.7 0 0 0-1.7.6Z" />
    </svg>
  );
}


function FullscreenIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}


function ExitFullscreenIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 8H3V3" />
      <path d="M16 8h5V3" />
      <path d="M8 16H3v5" />
      <path d="M16 16h5v5" />
    </svg>
  );
}


function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}
