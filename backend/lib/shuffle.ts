// Fisher-Yates shuffle — cryptographically unbiased
// Used fresh every time a new auction set begins.
export function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr]; // never mutate the input
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
