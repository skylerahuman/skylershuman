type Benchmark = {
  label: string;
  url: string;
  milliseconds: number[];
};

const duration = 120;

function measure(): number | undefined {
  const entry = performance.getEntriesByType?.("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const milliseconds = entry ? entry.loadEventEnd - entry.startTime : 0;
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : undefined;
}

function parseBenchmark(): Benchmark | null {
  const data = document.getElementById("benchmark-data")?.textContent;
  const benchmark = JSON.parse(data || "null") as Benchmark | null;
  return Array.isArray(benchmark?.milliseconds) && benchmark.milliseconds.length ? benchmark : null;
}

function compare(milliseconds: number, benchmark: Benchmark): number {
  const slower = benchmark.milliseconds.filter((sample): boolean => sample > milliseconds).length;
  return (100 * slower) / benchmark.milliseconds.length;
}

function reveal(milliseconds: number, benchmark: Benchmark): void {
  const comparison = document.getElementById("comparison");
  const percentile = document.getElementById("percentile");
  if (!(comparison && percentile)) {
    return;
  }
  percentile.textContent = `${Math.floor(compare(milliseconds, benchmark))}%`;
  const source = document.createElement("a");
  source.textContent = benchmark.label;
  source.href = benchmark.url;
  comparison.after(source);
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
      roll(digits, Math.round(from + (to - from) * progress));
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

  const benchmark = parseBenchmark();
  if (!benchmark) {
    return;
  }
  reveal(milliseconds, benchmark);
  const total = benchmark.milliseconds.reduce((sum, sample): number => sum + sample, 0);
  const mean = Math.round(total / benchmark.milliseconds.length);
  if (mean > rounded && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    count(digits, mean, rounded);
  }
}
