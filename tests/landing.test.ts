import { expect, type Page, test } from "@playwright/test";

const sample = {
  label: "Benchmark fixture · October 2026",
  url: "https://example.com/benchmark",
  milliseconds: [50, 123.4, 250, 576.6],
};
const epoch = Date.UTC(2026, 0, 1);

async function readLanding(
  page: Page,
  milliseconds: number | null,
  benchmark: typeof sample | null = sample,
): Promise<void> {
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(epoch + 1000);
  await page.addInitScript((end: number | null): void => {
    const entries = performance.getEntriesByType.bind(performance);
    let completed = false;
    window.addEventListener("load", (): void => {
      window.setTimeout((): void => {
        completed = true;
      }, 0);
    });
    const navigation = {
      startTime: 0,
      get loadEventEnd(): number {
        return completed ? (end ?? 0) : 0;
      },
    };
    const timings = (end === null ? [] : [navigation]) as PerformanceEntryList;
    performance.getEntriesByType = (type: string): PerformanceEntryList =>
      type === "navigation" ? timings : entries(type);
  }, milliseconds);
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
  await page.goto("/");
}

test("L1: the narrow landing shows two readable sentences and a dated benchmark link", async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 320, height: 620 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 123.4);
  await page.clock.runFor(16);
  const main = page.getByRole("main");
  await expect(main).toHaveText(
    /^(This site loaded in 123 ms\.\s*That’s faster than 50% of the web\.\s*Benchmark fixture · October 2026)$/,
    { useInnerText: true },
  );
  await expect(main.getByRole("link")).toHaveAttribute("href", sample.url);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(51, 65, 85)");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(255, 244, 216)");
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth === innerWidth),
  ).toBe(true);
});

test("L2: completed navigation timing is rounded to the nearest millisecond", async ({
  page,
}): Promise<void> => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 123.4);
  await page.clock.runFor(16);
  await expect(page.getByText("This site loaded in 123 ms.")).toBeVisible();
});

test("L3: strictly slower observations are counted against the unrounded reading", async ({
  page,
}): Promise<void> => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 123.4);
  await page.clock.runFor(16);
  await expect(page.getByText("That’s faster than 50% of the web.")).toBeVisible();
});

test("L4: the displayed number counts down from the mean and settles within 120 ms", async ({
  page,
}): Promise<void> => {
  await readLanding(page, 123.4);
  const digits = page.getByTestId("milliseconds");
  await page.clock.runFor(1);
  await expect(digits).toHaveText("250");
  await page.clock.runFor(47);
  const midpoint = Number(await digits.textContent());
  expect(midpoint).toBeLessThan(250);
  expect(midpoint).toBeGreaterThan(123);
  await expect(digits.locator("span")).toHaveCount(3);
  await page.clock.runFor(72);
  await expect(digits).toHaveText("123");
});

test("L4: reduced motion skips the countdown", async ({ page }): Promise<void> => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 123.4);
  await page.clock.runFor(16);
  await expect(page.getByTestId("milliseconds")).toHaveText("123");
});

test("L4: a reading above the mean skips the countdown", async ({ page }): Promise<void> => {
  await readLanding(page, 400);
  await page.clock.runFor(16);
  await expect(page.getByTestId("milliseconds")).toHaveText("400");
});

test("L5: missing timing displays a fallback without a comparison", async ({
  page,
}): Promise<void> => {
  await readLanding(page, null);
  await page.clock.runFor(16);
  await expect(page.getByText("Load time is unavailable.")).toBeVisible();
  await expect(page.getByText(/faster than/)).not.toBeVisible();
});

test("L5: missing benchmark displays only the measured time", async ({ page }): Promise<void> => {
  await readLanding(page, 123.4, null);
  await page.clock.runFor(16);
  await expect(page.getByText("This site loaded in 123 ms.")).toBeVisible();
  await expect(page.getByText(/faster than/)).not.toBeVisible();
  await expect(page.getByRole("link")).not.toBeVisible();
});
