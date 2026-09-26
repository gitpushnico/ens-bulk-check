import {
  createPublicClient,
  fallback,
  http,
  isAddress,
  labelhash,
  namehash,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import {
  ONE_YEAR_SECONDS,
  classifyName,
  graceEndsAt,
  premiumEndsAt,
  type NameStatus,
} from "./status";

const BASE_REGISTRAR = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85" as const;
const CONTROLLER = "0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547" as const;
const NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401" as const;

const registrarAbi = [
  {
    type: "function",
    name: "nameExpires",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const controllerAbi = [
  {
    type: "function",
    name: "available",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "rentPrice",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [
      {
        name: "price",
        type: "tuple",
        components: [
          { name: "base", type: "uint256" },
          { name: "premium", type: "uint256" },
        ],
      },
    ],
  },
] as const;

const wrapperAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },
] as const;

export type LookupRow = {
  input: string;
  name: string | null;
  status: NameStatus;
  detail: string | null;
  owner: Address | null;
  wrappedOwner: Address | null;
  expiresAt: number | null;
  graceEndsAt: number | null;
  premiumEndsAt: number | null;
  premiumWei: string | null;
  baseWei: string | null;
  appUrl: string | null;
};

type PreparedName =
  | { input: string; error: string }
  | { input: string; name: string; label: string; chars: number };

const MAX_NAMES = 40;

function readBigint(result: { status: string; result?: unknown } | undefined): bigint | null {
  if (result?.status === "success" && typeof result.result === "bigint") return result.result;
  return null;
}

function readBoolean(result: { status: string; result?: unknown } | undefined): boolean | null {
  if (result?.status === "success" && typeof result.result === "boolean") return result.result;
  return null;
}

function readPrice(
  result: { status: string; result?: unknown } | undefined,
): { base: bigint; premium: bigint } | null {
  if (result?.status !== "success" || !result.result || typeof result.result !== "object") return null;
  if (!("base" in result.result) || !("premium" in result.result)) return null;
  const price = result.result as { base: unknown; premium: unknown };
  if (typeof price.base !== "bigint" || typeof price.premium !== "bigint") return null;
  return { base: price.base, premium: price.premium };
}

function client() {
  const urls = [
    process.env.ETH_RPC_URL,
    "https://ethereum.publicnode.com",
    "https://eth.drpc.org",
    "https://1rpc.io/eth",
  ].filter((url): url is string => Boolean(url));

  return createPublicClient({
    chain: mainnet,
    transport: fallback(urls.map((url) => http(url, { timeout: 12_000 }))),
  });
}

function prepare(raw: string): PreparedName {
  const input = raw.trim();
  if (!input) return { input, error: "Empty line" };
  const withEth = input.toLowerCase().endsWith(".eth") ? input : `${input}.eth`;
  try {
    const name = normalize(withEth);
    const label = name.slice(0, -4);
    if (!label || label.includes(".")) {
      return { input, error: "Only .eth labels, not subnames" };
    }
    return { input, name, label, chars: Array.from(label).length };
  } catch {
    return { input, error: "Could not normalize that name" };
  }
}

function emptyRow(input: string, detail: string): LookupRow {
  return {
    input,
    name: null,
    status: "invalid",
    detail,
    owner: null,
    wrappedOwner: null,
    expiresAt: null,
    graceEndsAt: null,
    premiumEndsAt: null,
    premiumWei: null,
    baseWei: null,
    appUrl: null,
  };
}

export function splitNames(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const line of text.split(/[\s,]+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(trimmed);
    if (names.length >= MAX_NAMES) break;
  }
  return names;
}

export async function lookupNames(inputs: string[]): Promise<LookupRow[]> {
  const prepared = inputs.slice(0, MAX_NAMES).map(prepare);
  const ready = prepared.filter(
    (item): item is Extract<PreparedName, { name: string }> => "name" in item,
  );
  const publicClient = client();
  const now = Math.floor(Date.now() / 1000);

  const reads = ready.length
    ? await publicClient.multicall({
        allowFailure: true,
        contracts: ready.flatMap((item) => {
          const tokenId = BigInt(labelhash(item.label));
          return [
            {
              address: BASE_REGISTRAR,
              abi: registrarAbi,
              functionName: "nameExpires" as const,
              args: [tokenId] as const,
            },
            {
              address: CONTROLLER,
              abi: controllerAbi,
              functionName: "available" as const,
              args: [item.label] as const,
            },
            {
              address: CONTROLLER,
              abi: controllerAbi,
              functionName: "rentPrice" as const,
              args: [item.label, BigInt(ONE_YEAR_SECONDS)] as const,
            },
          ];
        }),
      })
    : [];

  const ownersNeeded: { index: number; tokenId: bigint }[] = [];
  const draft = prepared.map((item) => {
    if (!("name" in item)) return emptyRow(item.input, item.error);
    const index = ready.indexOf(item);
    const expires = readBigint(reads[index * 3]);
    const available = readBoolean(reads[index * 3 + 1]);
    const price = readPrice(reads[index * 3 + 2]);
    const readFailed = expires === null || available === null || (available && !price);
    const premiumWei = price?.premium ?? 0n;
    const baseWei = price?.base ?? 0n;
    const status = classifyName({
      expires: expires ?? 0n,
      available: available ?? false,
      premiumWei,
      labelChars: item.chars,
      now,
      readFailed,
    });
    if (status === "registered" || status === "grace") {
      ownersNeeded.push({ index, tokenId: BigInt(labelhash(item.label)) });
    }
    return {
      input: item.input,
      name: item.name,
      status,
      detail: readFailed
        ? "The registrar did not answer for this name"
        : status === "invalid"
          ? "Shorter than 3 characters, so it cannot be registered"
          : null,
      owner: null as Address | null,
      wrappedOwner: null as Address | null,
      expiresAt: expires !== null && expires > 0n ? Number(expires) : null,
      graceEndsAt: expires !== null && expires > 0n ? graceEndsAt(expires) : null,
      premiumEndsAt: status === "premium" && expires !== null ? premiumEndsAt(expires) : null,
      premiumWei: price ? premiumWei.toString() : null,
      baseWei: price ? baseWei.toString() : null,
      appUrl: `https://app.ens.domains/${item.name}`,
    };
  });

  if (ownersNeeded.length) {
    const ownerReads = await publicClient.multicall({
      allowFailure: true,
      contracts: ownersNeeded.map((item) => ({
        address: BASE_REGISTRAR,
        abi: registrarAbi,
        functionName: "ownerOf" as const,
        args: [item.tokenId] as const,
      })),
    });
    const wrapped: { rowIndex: number; id: bigint }[] = [];
    ownersNeeded.forEach((item, offset) => {
      const result = ownerReads[offset];
      const row = draft[prepared.indexOf(ready[item.index])];
      if (!row || !("owner" in row) || result?.status !== "success" || !isAddress(result.result)) {
        return;
      }
      row.owner = result.result;
      if (result.result.toLowerCase() === NAME_WRAPPER.toLowerCase()) {
        wrapped.push({
          rowIndex: prepared.indexOf(ready[item.index]),
          id: BigInt(namehash(ready[item.index].name)),
        });
      }
    });
    if (wrapped.length) {
      const wrappedReads = await publicClient.multicall({
        allowFailure: true,
        contracts: wrapped.map((item) => ({
          address: NAME_WRAPPER,
          abi: wrapperAbi,
          functionName: "ownerOf" as const,
          args: [item.id] as const,
        })),
      });
      wrapped.forEach((item, offset) => {
        const result = wrappedReads[offset];
        const row = draft[item.rowIndex];
        if (row && "wrappedOwner" in row && result?.status === "success" && isAddress(result.result)) {
          row.wrappedOwner = result.result;
        }
      });
    }
  }

  return draft;
}
