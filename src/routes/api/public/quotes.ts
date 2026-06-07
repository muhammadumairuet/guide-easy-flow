// Server route: fetches real daily price history from Stooq (free, no API key)
// and returns normalized { date, close }[]. Used for the "Live market data" option.

import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYMBOL_RE = /^[A-Za-z.]{1,8}$/;

export const Route = createFileRoute("/api/public/quotes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const symbol = (url.searchParams.get("symbol") || "").trim();

        if (!SYMBOL_RE.test(symbol)) {
          return new Response(JSON.stringify({ error: "Invalid symbol" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        try {
          const stooqSym = symbol.toLowerCase().includes(".")
            ? symbol.toLowerCase()
            : `${symbol.toLowerCase()}.us`;
          const res = await fetch(`https://stooq.com/q/d/l/?s=${stooqSym}&i=d`, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (!res.ok) throw new Error(`Upstream ${res.status}`);
          const csv = await res.text();
          const lines = csv.trim().split("\n");
          if (lines.length < 2 || !lines[0].toLowerCase().startsWith("date")) {
            throw new Error("No data");
          }
          const points = lines
            .slice(1)
            .map((line) => {
              const cols = line.split(",");
              const date = cols[0];
              const close = parseFloat(cols[4]);
              return { date, close };
            })
            .filter((p) => p.date && Number.isFinite(p.close));

          const recent = points.slice(-400);
          if (recent.length < 60) throw new Error("Not enough data");

          return new Response(JSON.stringify({ symbol, points: recent }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: (e as Error).message || "Fetch failed" }),
            { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      },
    },
  },
});
