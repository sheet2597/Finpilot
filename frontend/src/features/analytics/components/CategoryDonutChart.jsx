import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16"];

export function CategoryDonutChart({ data, nameKey = "category_name", valueKey = "total" }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-slate-400">
        No data available yet.
      </div>
    );
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.slice(0, 8)}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.slice(0, 8).map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) =>
              new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(v)
            }
            contentStyle={{ border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
