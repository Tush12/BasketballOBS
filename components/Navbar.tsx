import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold text-white">
          Basketball League
        </Link>

        <nav className="flex gap-6 text-sm text-zinc-300">
          <Link href="/" className="hover:text-white">
            Home
          </Link>

          <Link href="/games" className="hover:text-white">
            Games
          </Link>

          <Link href="/standings" className="hover:text-white">
            Standings
          </Link>

          <Link href="/teams" className="hover:text-white">
            Teams
          </Link>

          <Link href="/players" className="hover:text-white">
            Players
          </Link>

          <Link href="/ai" className="hover:text-white">
            AI Assistant
          </Link>
        </nav>
      </div>
    </header>
  );
}