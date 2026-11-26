import type { Page } from "@playwright/test";

export const sample = {
  label: "Benchmark fixture · October 2026",
  url: "https://example.com/benchmark",
  desktop: { median: 1600, counts: [2, 3, 5] },
};
const epoch = Date.UTC(2026, 0, 1);

export async function readLanding(
  page: Page,
  milliseconds: number | null,
  benchmark?: typeof sample | null,
): Promise<void> {
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(epoch + 1000);
  await page.addInitScript((start: number | null): void => {
    const entries = performance.getEntriesByType.bind(performance);
    const navigation = {
      startTime: 0,
      loadEventEnd: 8500,
      get loadEventStart(): number {
        return document.readyState === "complete" ? (start ?? 0) : 0;
      },
    };
    const timings = (start === null ? [] : [navigation]) as PerformanceEntryList;
    performance.getEntriesByType = (type: string): PerformanceEntryList =>
      type === "navigation" ? timings : entries(type);
  }, milliseconds);
  if (benchmark !== undefined) {
    await page.route("/", async (route): Promise<void> => {
      const response = await route.fetch();
      const html = await response.text();
      await route.fulfill({
        response,
        body: html.replace(
          /(<script[^>]*id="benchmark-data"[^>]*>)[\s\S]*?(<\/script>)/,
          `$1${JSON.stringify(benchmark)}$2`,
        ),
      });
    });
  }
  await page.goto("/");
}
