import { expect, test } from "@playwright/test";
import { readLanding, sample } from "./landing-fixture";

const archive = "https://httparchive.org/reports/loading-speed?start=2026_10_01#ol";

test("L1, L7, L11: a narrow desktop window scrolls one readable comparison line", async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 320, height: 620 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 500);
  await page.clock.runFor(16);
  const main = page.getByRole("main");
  await expect(main).toHaveText(
    "This site loaded in 500 ms. That’s faster than at least 97% of sites.",
    { useInnerText: true },
  );
  const source = main.getByRole("link", { name: "97%" });
  await expect(source).toHaveAttribute("href", archive);
  await expect(source).toHaveAttribute("title", "HTTP Archive · October 2026 · desktop");
  await expect(main).toHaveCSS("font-size", "12px");
  await expect(main).toHaveCSS("white-space", "nowrap");
  expect(
    await main.evaluate((line): number => {
      line.scrollLeft = line.scrollWidth;
      return line.scrollLeft;
    }),
  ).toBeGreaterThan(0);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(51, 65, 85)");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(255, 244, 216)");
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth === innerWidth),
  ).toBe(true);
});

test("L11, L13, L15: separate lines mark the time and bold multiplier only", async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1024, height: 680 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 80);
  await page.clock.runFor(16);
  const main = page.getByRole("main");
  await expect(main).toHaveText(
    "This site loaded in 80 ms. That’s 12× faster than at least 97% of sites.",
    { useInnerText: true },
  );
  await expect(main).toHaveCSS("font-size", "16px");
  const time = main.getByText("80 ms", { exact: true });
  const share = main.getByRole("link", { name: "97%" });
  const multiplier = main.getByText("12×", { exact: true });
  await expect(multiplier).toHaveCSS("font-weight", "700");
  for (const item of [time, multiplier]) {
    await expect(item).toHaveCSS("text-decoration-line", "none");
    expect(
      await item.evaluate((mark): string => getComputedStyle(mark, "::after").borderBottomStyle),
    ).toBe("solid");
  }
  await expect(share).toHaveCSS("text-decoration-line", "none");
  await expect(share).toHaveCSS("font-weight", "700");
  await expect(share).toHaveAttribute("href", archive);
  expect(
    await share.evaluate((link): string => getComputedStyle(link, "::after").borderBottomStyle),
  ).toBe("none");
  expect((await time.boundingBox())?.y).toBe((await share.boundingBox())?.y);
  expect(await main.evaluate((line): boolean => line.scrollWidth === line.clientWidth)).toBe(true);
});

test("L14: the time mark and the comparison stay still as the digit count shrinks", async ({
  page,
}): Promise<void> => {
  await readLanding(page, 80);
  const digits = page.getByTestId("milliseconds");
  const time = page.getByText(/^\d+ ms$/);
  const share = page.getByRole("link", { name: "97%" });
  await page.clock.runFor(1);
  await expect(digits).toHaveText("4650");
  const initialTime = await time.boundingBox();
  const initialShare = await share.boundingBox();
  expect(initialTime).not.toBeNull();
  expect(initialShare).not.toBeNull();
  await page.clock.runFor(96);
  await expect(digits).toHaveText(/^\d{3}$/);
  expect(await time.boundingBox()).toEqual(initialTime);
  expect(await share.boundingBox()).toEqual(initialShare);
  await page.clock.runFor(23);
  await expect(digits).toHaveText("80");
  expect(await time.boundingBox()).toEqual(initialTime);
  expect(await share.boundingBox()).toEqual(initialShare);
});

test("L15: the bold multiplier reserves two digits and grows when needed", async ({
  context,
}): Promise<void> => {
  const positions: number[] = [];
  for (const [bucket, multiplier] of [
    [1, "9×"],
    [2, "19×"],
    [11, "109×"],
  ] as const) {
    const page = await context.newPage();
    const counts = Array<number>(bucket + 1).fill(0);
    counts[0] = 2;
    counts[bucket] = 8;
    await page.emulateMedia({ reducedMotion: "reduce" });
    await readLanding(page, 100, { ...sample, desktop: { ...sample.desktop, counts } });
    await page.clock.runFor(16);
    await expect(page.getByText(multiplier, { exact: true })).toBeVisible();
    const share = await page.getByRole("link", { name: "80%" }).boundingBox();
    expect(share).not.toBeNull();
    positions.push(share?.x ?? 0);
    await page.close();
  }
  const [one = 0, two = 0, three = 0] = positions;
  expect(one).toBe(two);
  expect(three).toBeGreaterThan(two);
});

for (const [reading, phrase] of [
  [499.6, "2× faster"],
  [500, "faster"],
] as const) {
  test(`L12: ${reading} ms supports only the multiplier proven by the same buckets`, async ({
    page,
  }): Promise<void> => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await readLanding(page, reading, sample);
    await page.clock.runFor(16);
    await expect(page.getByRole("main")).toHaveText(
      `This site loaded in 500 ms. That’s ${phrase} than at least 80% of sites.`,
      { useInnerText: true },
    );
  });
}

test("L10: equal countdown intervals drop faster early and still settle at 120 ms", async ({
  page,
}): Promise<void> => {
  await readLanding(page, 1234);
  const digits = page.getByTestId("milliseconds");
  await page.clock.runFor(1);
  await expect(digits).toHaveText("4650");
  await page.clock.runFor(32);
  const early = Number(await digits.textContent());
  await page.clock.runFor(32);
  const middle = Number(await digits.textContent());
  await page.clock.runFor(32);
  const late = Number(await digits.textContent());
  expect(4650 - early).toBeGreaterThan(2 * (middle - late));
  expect(middle).toBeGreaterThan(late);
  expect(late).toBeGreaterThan(1234);
  await page.clock.runFor(23);
  await expect(digits).toHaveText("1234");
});

test("L6: the displayed time rounds the start of the load event, not its end", async ({
  page,
}): Promise<void> => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 123.4);
  await page.clock.runFor(16);
  await expect(page.getByText("This site loaded in 123 ms.")).toBeVisible();
});

test("L7: the mobile device signal selects the mobile comparison even in a wide window", async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1200, height: 700 });
  await page.addInitScript((): void => {
    Object.defineProperty(navigator, "userAgentData", { value: { mobile: true } });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 80);
  await page.clock.runFor(16);
  await expect(page.getByRole("main")).toHaveText(
    "This site loaded in 80 ms. That’s 12× faster than at least 99% of sites.",
    { useInnerText: true },
  );
  await expect(page.getByRole("link", { name: "99%" })).toHaveAttribute(
    "title",
    "HTTP Archive · October 2026 · mobile",
  );
});

for (const [reading, percentage] of [
  [999.6, 80],
  [1000, 50],
] as const) {
  test(`L8: ${reading} ms counts only buckets strictly slower than the unrounded reading`, async ({
    page,
  }): Promise<void> => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await readLanding(page, reading, sample);
    await page.clock.runFor(16);
    await expect(page.getByText("This site loaded in 1000 ms.")).toBeVisible();
    await expect(page.getByRole("main")).toHaveText(
      `This site loaded in 1000 ms. That’s faster than at least ${percentage}% of sites.`,
      { useInnerText: true },
    );
    await expect(page.getByRole("link")).toHaveAttribute("href", sample.url);
  });
}

for (const [device, median] of [
  ["desktop", 4650],
  ["mobile", 7770],
] as const) {
  test(`L9: the ${device} countdown starts at the published median and settles by 120 ms`, async ({
    page,
  }): Promise<void> => {
    if (device === "mobile") {
      await page.addInitScript((): void => {
        Object.defineProperty(navigator, "userAgentData", { value: undefined });
        Object.defineProperty(navigator, "userAgent", {
          value: "Mozilla/5.0 (iPhone; CPU iPhone OS)",
        });
      });
    }
    await readLanding(page, 1234);
    const digits = page.getByTestId("milliseconds");
    await page.clock.runFor(1);
    await expect(digits).toHaveText(String(median));
    await page.clock.runFor(47);
    const midpoint = Number(await digits.textContent());
    expect(midpoint).toBeLessThan(median);
    expect(midpoint).toBeGreaterThan(1234);
    await expect(digits.locator("span")).toHaveCount(4);
    await page.clock.runFor(72);
    await expect(digits).toHaveText("1234");
  });
}

test("L9: reduced motion skips the countdown", async ({ page }): Promise<void> => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await readLanding(page, 123.4);
  await page.clock.runFor(1);
  await expect(page.getByTestId("milliseconds")).toHaveText("123");
});

test("L9: a reading above the desktop median skips the countdown", async ({
  page,
}): Promise<void> => {
  await readLanding(page, 4700);
  await page.clock.runFor(1);
  await expect(page.getByTestId("milliseconds")).toHaveText("4700");
});

test("L5: missing timing displays a fallback without a comparison", async ({
  page,
}): Promise<void> => {
  await readLanding(page, null);
  await page.clock.runFor(16);
  await expect(page.getByText("Load time is unavailable.")).toBeVisible();
  await expect(page.getByText(/faster than/)).not.toBeVisible();
});

test("L9: a missing mobile benchmark displays only the measured time", async ({
  page,
}): Promise<void> => {
  await page.addInitScript((): void => {
    Object.defineProperty(navigator, "userAgentData", { value: { mobile: true } });
  });
  await readLanding(page, 123.4, sample);
  await page.clock.runFor(1);
  await expect(page.getByText("This site loaded in 123 ms.")).toBeVisible();
  await expect(page.getByText(/faster than/)).not.toBeVisible();
  await expect(page.getByRole("link")).not.toBeVisible();
});
