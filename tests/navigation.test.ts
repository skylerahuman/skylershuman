import { expect, test } from "@playwright/test";

test("L2 and L5: a real page visit reports its timing without an unverified benchmark", async ({
  page,
}): Promise<void> => {
  await page.goto("/");
  const milliseconds = await page.evaluate((): number => {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entry ? Math.round(entry.loadEventEnd - entry.startTime) : 0;
  });
  expect(milliseconds).toBeGreaterThan(0);
  await expect(page.getByRole("main")).toHaveText(`This site loaded in ${milliseconds} ms.`, {
    useInnerText: true,
  });
});
