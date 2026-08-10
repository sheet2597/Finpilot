import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export function TrendChart({
  data, dataKey = "value", xKey = "period", style = "line", height = 240, color = "#6366f1",
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No data available yet.
      </div>
    );
  }

  const common = {
    grid: <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />,
    x: <XAxis dataKey={xKey} fontSize={11} tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />,
    y: <YAxis fontSize={11} width={60} tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />,
    tt: <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: 12 }} />,
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {style === "bar" ? (
          <BarChart data={data}>
            {common.grid}{common.x}{common.y}{common.tt}
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : style === "area" ? (
          <AreaChart data={data}>
            {common.grid}{common.x}{common.y}{common.tt}
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            {common.grid}{common.x}{common.y}{common.tt}
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
