export function toMbps(bytesPerSecond: number) {
  return (bytesPerSecond * 8) / 1_000_000
}
