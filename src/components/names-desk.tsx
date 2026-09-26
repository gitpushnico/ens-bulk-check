"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/retroui/Badge";
import { Button } from "@/components/retroui/Button";
import { Text } from "@/components/retroui/Text";
import { Textarea } from "@/components/retroui/Textarea";
import type { LookupRow } from "@/lib/ens/lookup";
import type { NameStatus } from "@/lib/ens/status";
import { formatEth, formatTimestamp, shortAddress } from "@/lib/format";

const order: NameStatus[] = ["available", "premium", "grace", "registered", "invalid"];

const labels: Record<NameStatus, string> = {
  available: "Available",
  premium: "Premium",
  grace: "Grace",
  registered: "Registered",
  invalid: "Invalid",
};

type Filter = "all" | NameStatus;

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "premium", label: "Premium" },
  { key: "grace", label: "Grace" },
  { key: "registered", label: "Registered" },
  { key: "invalid", label: "Invalid" },
];

const counted: NameStatus[] = ["available", "premium", "grace", "registered"];

const tones: Record<NameStatus, string> = {
  available: "bg-[#c4f5b0]",
  grace: "bg-[#ffe98a]",
  premium: "bg-[#ffc98a]",
  registered: "bg-[#ffa8a8]",
  invalid: "bg-[#e7e7e7]",
};

const activeFilterTones: Record<NameStatus, string> = {
  available: "bg-[#c4f5b0] hover:bg-[#c4f5b0]",
  grace: "bg-[#ffe98a] hover:bg-[#ffe98a]",
  premium: "bg-[#ffc98a] hover:bg-[#ffc98a]",
  registered: "bg-[#ffa8a8] hover:bg-[#ffa8a8]",
  invalid: "bg-[#e7e7e7] hover:bg-[#e7e7e7]",
};

const examples = "vitalik\nagent\nnico";

export function NamesDesk() {
  const [text, setText] = useState(examples);
  const [rows, setRows] = useState<LookupRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  const sorted = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  }, [rows]);

  const counts = useMemo(() => {
    const tally = new Map<NameStatus, number>();
    for (const row of sorted) tally.set(row.status, (tally.get(row.status) ?? 0) + 1);
    return tally;
  }, [sorted]);

  const visibleFilters = filters.filter(
    (item) => item.key === "all" || (counts.get(item.key) ?? 0) > 0,
  );
  const filterIndex = Math.max(
    0,
    visibleFilters.findIndex((item) => item.key === filter),
  );
  const activeFilter = visibleFilters[filterIndex]?.key ?? "all";
  const visible = sorted.filter((row) => activeFilter === "all" || row.status === activeFilter);
  const availableNames = sorted
    .filter((row) => row.status === "available" && row.name)
    .map((row) => row.name as string);

  function selectFilter(next: Filter) {
    if (next !== activeFilter) setCopied("idle");
    setFilter(next);
  }

  async function checkNames() {
    setLoading(true);
    setError(null);
    setCopied("idle");
    try {
      const response = await fetch("/api/ens/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names: text }),
      });
      const payload = (await response.json()) as {
        rows?: LookupRow[];
        error?: string;
        truncated?: boolean;
      };
      if (!response.ok || !payload.rows) {
        setRows(null);
        setError(payload.error ?? "Lookup failed");
        return;
      }
      setRows(payload.rows);
      setTruncated(Boolean(payload.truncated));
      setFilter("all");
    } catch {
      setError("Could not reach the lookup.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAvailable() {
    const payload = availableNames.join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopied("copied");
      return;
    } catch {
      // Some browsers only allow the older copy path from a button click.
    }
    try {
      const area = document.createElement("textarea");
      area.value = payload;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      setCopied(ok ? "copied" : "failed");
    } catch {
      setCopied("failed");
    }
  }

  const copyLabel =
    copied === "copied"
      ? "Copied"
      : copied === "failed"
        ? "Couldn't copy"
        : availableNames.length === 1
          ? "Copy the free one"
          : `Copy the ${availableNames.length} free ones`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex max-w-2xl flex-col gap-4">
        <Text as="h1">Tired of manually checking names?</Text>
        <div className="flex flex-col gap-1 text-lg leading-relaxed">
          <p>Check up to 40 names at a time.</p>
          <p>Paste a list, or write them on each line.</p>
        </div>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void checkNames();
        }}
        className="flex flex-col items-start gap-4"
      >
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void checkNames();
            }
          }}
          rows={6}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="ENS names"
          placeholder="Names, one per line"
          className="min-h-36 font-mono text-sm leading-6"
        />
        <Button type="submit" size="lg" disabled={loading || !text.trim()}>
          {loading ? "Checking…" : "Check names"}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="border-2 border-black bg-[#ffa8a8] px-4 py-3 text-sm text-black shadow-md">
          {error}
        </p>
      ) : null}

      {rows ? (
        <section className="flex flex-col gap-5">
          <Text as="h2">Here&apos;s what we found.</Text>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {counted.map((status) => (
              <div
                key={status}
                className={`border-2 border-black px-4 py-3 text-black shadow-md ${tones[status]}`}
              >
                <p className="font-head text-3xl">{counts.get(status) ?? 0}</p>
                <p className="text-sm">{labels[status]}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter results">
              {visibleFilters.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  size="sm"
                  variant={item.key === activeFilter ? "default" : "outline"}
                  className={
                    item.key !== "all" && item.key === activeFilter
                      ? `${activeFilterTones[item.key]} text-black`
                      : undefined
                  }
                  onClick={() => selectFilter(item.key)}
                  aria-pressed={item.key === activeFilter}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            {availableNames.length ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void copyAvailable()}>
                {copyLabel}
              </Button>
            ) : null}
          </div>

          {truncated ? (
            <p className="text-sm text-muted-foreground">We stopped after the first 40.</p>
          ) : null}

          {visible.length ? (
            <ul className="border-2 border-black bg-card shadow-md">
              {visible.map((row) => (
                <li
                  key={`${row.input}-${row.name}`}
                  className="grid gap-2 border-b-2 border-black px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_8rem_minmax(0,1fr)_minmax(0,1fr)_7rem] md:items-center"
                >
                  <div className="min-w-0">
                    {row.name && row.appUrl ? (
                      <a href={row.appUrl} className="font-medium hover:underline" target="_blank" rel="noreferrer">
                        {row.name}
                      </a>
                    ) : (
                      <span className="font-medium">{row.input}</span>
                    )}
                    {row.detail ? <p className="text-xs text-muted-foreground">{row.detail}</p> : null}
                  </div>
                  <StatusBadge status={row.status} />
                  <PriceCell row={row} />
                  <TimingCell row={row} />
                  <OwnerCell row={row} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing in this set.</p>
          )}
        </section>
      ) : null}

      <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">
        Privacy
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: NameStatus }) {
  return (
    <Badge className={`border-2 border-black text-black shadow-sm ${tones[status]}`}>
      {labels[status]}
    </Badge>
  );
}

function PriceCell({ row }: { row: LookupRow }) {
  if (row.status === "premium" && row.premiumWei) {
    const base = row.baseWei ? ` + ${formatEth(BigInt(row.baseWei))} / yr` : "";
    return (
      <p className="font-mono text-sm">
        {formatEth(BigInt(row.premiumWei))} ETH{base}
      </p>
    );
  }
  if ((row.status === "available" || row.status === "registered" || row.status === "grace") && row.baseWei) {
    return <p className="font-mono text-sm">{formatEth(BigInt(row.baseWei))} ETH</p>;
  }
  return <p className="hidden text-sm text-muted-foreground md:block">—</p>;
}

function TimingCell({ row }: { row: LookupRow }) {
  if (row.status === "registered" && row.expiresAt) {
    return <p className="text-sm">{formatTimestamp(row.expiresAt)}</p>;
  }
  if (row.status === "grace" && row.graceEndsAt) {
    return <p className="text-sm">{formatTimestamp(row.graceEndsAt)}</p>;
  }
  if (row.status === "premium" && row.premiumEndsAt) {
    return <p className="text-sm">{formatTimestamp(row.premiumEndsAt)}</p>;
  }
  return <p className="hidden text-sm text-muted-foreground md:block">—</p>;
}

function OwnerCell({ row }: { row: LookupRow }) {
  const owner = row.wrappedOwner ?? row.owner;
  if (!owner) return <p className="hidden text-sm text-muted-foreground md:block">—</p>;
  return (
    <a
      href={`https://etherscan.io/address/${owner}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-sm hover:underline"
    >
      {shortAddress(owner)}
    </a>
  );
}
