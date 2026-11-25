import { expect, type Page, test } from "@playwright/test";
import { readLanding } from "./landing-fixture";

async function readMobile(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 700 });
  await page.addInitScript((): void => {
    Object.defineProperty(navigator, "userAgentData", { value: { mobile: true } });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 80);
  await page.clock.runFor(16);
}

test("L16: a phone centers two lines with a break after the first period", async ({
  page,
}): Promise<void> => {
  await readMobile(page, 320);
  const main = page.getByRole("main");
  const time = main.getByText("80 ms", { exact: true });
  const share = main.getByRole("link", { name: "99%" });
  const first = await time.boundingBox();
  const second = await share.boundingBox();
  expect(second?.y ?? 0).toBeGreaterThan(first ? first.y + first.height : Infinity);
  await expect(time).toHaveCSS("text-align", "center");
  const block = await main.boundingBox();
  expect(block ? block.y + block.height / 2 : 0).toBeCloseTo(350, 0);
  expect(await main.evaluate((line): boolean => line.scrollWidth === line.clientWidth)).toBe(true);
});

test("L7 and L17: mobile uses the mobile histogram and labels it even in a wide window", async ({
  page,
}): Promise<void> => {
  await readMobile(page, 1200);
  await expect(page.getByRole("main")).toHaveText(
    "This site loaded in 80 ms. That’s 12× faster than at least 99% of mobile sites.",
    { useInnerText: true },
  );
  await expect(page.getByRole("link", { name: "99%" })).toHaveAttribute(
    "title",
    "HTTP Archive · October 2026 · mobile",
  );
});
