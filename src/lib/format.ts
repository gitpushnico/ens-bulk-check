import { formatEther } from "viem";

export function formatEth(wei: bigint): string {
  const [whole, fraction = ""] = formatEther(wei).split(".");
  const trimmed = fraction.slice(0, 5).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(unixSeconds * 1000));
}
