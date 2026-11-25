import { expect, test } from "@playwright/test";

test("L6 and L8: a real visit reports its load-event start and a sourced comparison", async ({
  page,
}): Promise<void> => {
  await page.goto("/");
  const milliseconds = await page.evaluate((): number => {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entry ? Math.round(entry.loadEventStart - entry.startTime) : 0;
  });
  expect(milliseconds).toBeGreaterThan(0);
  await expect(page.getByText(`This site loaded in ${milliseconds} ms.`)).toBeVisible();
  await expect(page.getByText(/That’s faster than at least \d+% of desktop pages\./)).toBeVisible();
  await expect(page.getByRole("link", { name: "HTTP Archive · October 2026" })).toBeVisible();
});
