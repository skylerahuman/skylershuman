type Client = "desktop" | "mobile";

type Histogram = {
  median: number;
  counts: number[];
};

type Benchmark = Partial<Record<Client, Histogram>> & {
  label: string;
  url: string;
};

type Comparison = { percentage: number; multiplier: number };

const duration = 120;
const tail = 2 ** -6;

function measure(): number | undefined {
  const entry = performance.getEntriesByType?.("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const milliseconds = entry ? entry.loadEventStart - entry.startTime : 0;
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : undefined;
}

function identifyClient(): Client {
  const browser = navigator as Navigator & { userAgentData?: { mobile: boolean } };
  const mobile =
    browser.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(browser.userAgent);
  return mobile ? "mobile" : "desktop";
}

function parseBenchmark(): Benchmark | null {
  const data = document.getElementById("benchmark-data")?.textContent;
  return JSON.parse(data || "null") as Benchmark | null;
}

function compare(milliseconds: number, histogram: Histogram): Comparison | undefined {
  let total = 0;
  let slower = 0;
  let lowerBound: number | undefined;
  for (const [second, count] of histogram.counts.entries()) {
    total += count;
    const boundary = second * 1000;
    if (count > 0 && boundary > milliseconds) {
      lowerBound ??= boundary;
      slower += count;
    }
  }
  if (total === 0) {
    return undefined;
  }
  return {
    percentage: Math.floor((100 * slower) / total),
    multiplier: lowerBound === undefined ? 0 : Math.ceil(lowerBound / milliseconds) - 1,
  };
}

function reveal(result: Comparison, client: Client, benchmark: Benchmark): void {
  const comparison = document.getElementById("comparison");
  const source = document.querySelector<HTMLAnchorElement>("#percentile");
  const pace = document.getElementById("pace");
  if (!(comparison && source && pace)) {
    return;
  }
  pace.textContent = result.multiplier >= 2 ? `${result.multiplier}× ` : "";
  source.textContent = `${result.percentage}%`;
  source.href = benchmark.url;
  source.title = `${benchmark.label} · ${client}`;
  comparison.hidden = false;
}

function roll(digits: HTMLElement, value: number): void {
  const text = String(value);
  if (digits.children.length !== text.length) {
    digits.replaceChildren(
      ...Array.from(text, (): HTMLSpanElement => document.createElement("span")),
    );
  }
  for (const [index, digit] of Array.from(digits.children).entries()) {
    if (digit.textContent !== text[index]) {
      digit.textContent = text[index] ?? "";
      digit.animate([{ transform: "translateY(-0.18em)" }, { transform: "translateY(0)" }], 16);
    }
  }
}

function count(digits: HTMLElement, from: number, to: number): void {
  const start = performance.now();
  let frame = 0;
  digits.textContent = String(from);

  function tick(now: number): void {
    const progress = Math.max(0, (now - start) / duration);
    if (progress < 1) {
      const remaining = (2 ** (-6 * progress) - tail) / (1 - tail);
      roll(digits, Math.round(to + (from - to) * remaining));
      frame = requestAnimationFrame(tick);
    }
  }

  frame = requestAnimationFrame(tick);
  window.setTimeout((): void => {
    cancelAnimationFrame(frame);
    digits.textContent = String(to);
  }, duration);
}

export function present(): void {
  const milliseconds = measure();
  if (milliseconds === undefined) {
    document.getElementById("unavailable")?.removeAttribute("hidden");
    return;
  }
  const digits = document.getElementById("digits");
  const measurement = document.getElementById("measurement");
  if (!(digits && measurement)) {
    return;
  }
  const rounded = Math.round(milliseconds);
  digits.textContent = String(rounded);
  measurement.hidden = false;

  const client = identifyClient();
  const benchmark = parseBenchmark();
  const histogram = benchmark?.[client];
  if (!(benchmark && histogram)) {
    return;
  }
  const result = compare(milliseconds, histogram);
  if (!result) {
    return;
  }
  reveal(result, client, benchmark);
  if (histogram.median > rounded && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    count(digits, histogram.median, rounded);
  }
}
