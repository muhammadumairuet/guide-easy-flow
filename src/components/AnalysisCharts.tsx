import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalysisResult } from "@/lib/predictor";

const axisStyle = { fontSize: 11, fill: "var(--color-muted-foreground)" };

function ChartShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-56 w-full">{children}</div>
    </div>
  );
}

export function AnalysisCharts({ result }: { result: AnalysisResult }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartShell title={`${result.symbol} — recent price (last 90 days)`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={result.priceSeries} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tick={axisStyle} tickFormatter={(d) => String(d).slice(5)} minTickGap={28} />
            <YAxis tick={axisStyle} domain={["auto", "auto"]} width={48} />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                color: "var(--color-foreground)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#priceFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Simulated $10k: strategy vs buy & hold">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={result.equityCurve} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tick={axisStyle} tickFormatter={(d) => String(d).slice(5)} minTickGap={28} />
            <YAxis tick={axisStyle} width={48} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                color: "var(--color-foreground)",
                fontSize: 12,
              }}
              formatter={(v: number, n) => [`${v}%`, n === "strategy" ? "Strategy" : "Buy & hold"]}
            />
            <Line type="monotone" dataKey="strategy" stroke="var(--color-success)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="buyHold" stroke="var(--color-muted-foreground)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}
