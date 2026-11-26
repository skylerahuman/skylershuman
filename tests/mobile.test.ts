import { expect, test } from "@playwright/test";
import { readLanding } from "./landing-fixture";

test("L16: a narrow viewport centers the timing above the comparison without overflow", async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 6);
  await page.clock.runFor(16);
  const main = page.getByRole("main");
  const time = main.getByText("6 ms", { exact: true });
  const share = main.getByRole("link", { name: "99%" });
  await expect(main).toHaveText(
    "This site loaded in 6 ms. That’s 166× faster than at least 99% of mobile sites.",
    { useInnerText: true },
  );
  const first = await time.boundingBox();
  const second = await share.boundingBox();
  expect(second?.y ?? 0).toBeGreaterThan(first ? first.y + first.height : Infinity);
  await expect(time).toHaveCSS("text-align", "center");
  const block = await main.boundingBox();
  expect(block ? block.y + block.height / 2 : 0).toBeCloseTo(350, 0);
  expect(await main.evaluate((line): boolean => line.scrollWidth === line.clientWidth)).toBe(true);
});

for (const [width, mobileSignal, percentage, client, audience] of [
  [600, false, "99%", "mobile", "mobile sites."],
  [601, true, "97%", "desktop", "sites."],
] as const) {
  test(`L7 and L17: ${width}px uses the ${client} benchmark regardless of device signal`, async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize({ width, height: 700 });
    await page.addInitScript((mobile): void => {
      Object.defineProperty(navigator, "userAgentData", { value: { mobile } });
    }, mobileSignal);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await readLanding(page, 80);
    await page.clock.runFor(16);
    await expect(page.getByRole("main")).toHaveText(
      `This site loaded in 80 ms. That’s 12× faster than at least ${percentage} of ${audience}`,
      { useInnerText: true },
    );
    await expect(page.getByRole("link", { name: percentage })).toHaveAttribute(
      "title",
      `HTTP Archive · October 2026 · ${client}`,
    );
  });
}
