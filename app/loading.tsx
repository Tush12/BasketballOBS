export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="animate-pulse">

        <div
          className="h-5 w-32 rounded-full"
          style={{
            background:
              "var(--surface-2)",
          }}
        />

        <div
          className="mt-4 h-11 w-2/3 max-w-xl rounded-2xl"
          style={{
            background:
              "var(--surface-2)",
          }}
        />

        <div
          className="mt-3 h-5 w-full max-w-2xl rounded-full"
          style={{
            background:
              "var(--surface)",
          }}
        />

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="h-28 rounded-2xl border"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--card)",
                }}
              />
            )
          )}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[0, 1].map(
            (item) => (
              <div
                key={item}
                className="h-64 rounded-2xl border"
                style={{
                  borderColor:
                    "var(--border)",
                  background:
                    "var(--card)",
                }}
              />
            )
          )}
        </div>

      </div>
    </main>
  );
}