import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import SiteHeader from "@/components/site-header";
import { LanguageProvider } from "@/components/language-provider";

export const metadata = {
  title: "OBS Basketball League",
  description: "Live basketball scores, fixtures, standings and statistics.",
  creator: "Made by Tushar Bhavnani",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <div className="obs-shell">
              <SiteHeader />
              {children}
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}