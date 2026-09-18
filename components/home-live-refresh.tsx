"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LIVE_REFRESH_INTERVAL_MS = 10_000;

export default function HomeLiveRefresh({
  enabled,
}: {
  enabled: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, LIVE_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, router]);

  return null;
}