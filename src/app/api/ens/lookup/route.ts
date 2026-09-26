import { lookupNames, splitNames } from "@/lib/ens/lookup";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body with names." }, { status: 400 });
  }

  const text =
    body && typeof body === "object" && "names" in body && typeof body.names === "string"
      ? body.names
      : "";
  const names = splitNames(text);
  if (!names.length) {
    return Response.json({ error: "Paste at least one name." }, { status: 400 });
  }

  try {
    const rows = await lookupNames(names);
    return Response.json({
      rows,
      truncated: text.split(/[\s,]+/).filter(Boolean).length > names.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return Response.json(
      { error: `Ethereum RPC failed. ${message}` },
      { status: 502 },
    );
  }
}
