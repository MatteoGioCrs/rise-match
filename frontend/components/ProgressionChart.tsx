"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  date: string;
  time: number;
  label: string;
}

interface ProgressionChartProps {
  history: DataPoint[];
  projection: DataPoint[];
  eventCode: string;
}

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(2).padStart(5, "0");
    return `${m}:${s}`;
  }
  return seconds.toFixed(2);
}

export default function ProgressionChart({
  history,
  projection,
  eventCode,
}: ProgressionChartProps) {
  // Merge data for the chart — history is solid, projection is dashed
  const historyDates = new Set(history.map((p) => p.date));
  const allData = [
    ...history.map((p) => ({ date: p.date, label: p.label, history: p.time })),
    ...projection
      .filter((p) => !historyDates.has(p.date))
      .map((p) => ({ date: p.date, label: p.label, projection: p.time })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Overlap point: last history point also starts the projection
  if (history.length > 0 && projection.length > 0) {
    const lastHistPoint = allData.find((p) => p.date === history[history.length - 1].date);
    if (lastHistPoint) {
      lastHistPoint.projection = lastHistPoint.history;
    }
  }

  // Y-axis domain: slightly padded around min/max
  const allTimes = [...history.map((p) => p.time), ...projection.map((p) => p.time)];
  const minTime = Math.min(...allTimes) - 2;
  const maxTime = Math.max(...allTimes) + 2;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={allData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
        />
        <YAxis
          domain={[minTime, maxTime]}
          reversed
          tickFormatter={formatTime}
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
          width={55}
        />
        <Tooltip
          contentStyle={{
            background: "#1B2A4A",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#fff",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [
            formatTime(value),
            name === "history" ? "Historique réel" : "Projection",
          ]}
        />
        {/* History line — solid blue */}
        <Line
          type="monotone"
          dataKey="history"
          stroke="#2E86C1"
          strokeWidth={2.5}
          dot={{ fill: "#2E86C1", r: 4, strokeWidth: 0 }}
          connectNulls={false}
          name="history"
        />
        {/* Projection line — dashed red */}
        <Line
          type="monotone"
          dataKey="projection"
          stroke="#C0392B"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ fill: "#C0392B", r: 3, strokeWidth: 0 }}
          connectNulls={false}
          name="projection"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
