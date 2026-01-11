// /mnt/data/donut_chart.jsx
import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// Adjusted colors to be slightly more vibrant and match a common sentiment theme
const COLORS = ['#10b981', '#f59e0b', '#ef4444'] // Green, Amber, Red

export default function DonutChart({ positive = 0, neutral = 0, negative = 0 }) {
  // Ensure data points are not negative
  const safePositive = Math.max(0, Number(positive) || 0);
  const safeNeutral = Math.max(0, Number(neutral) || 0);
  const safeNegative = Math.max(0, Number(negative) || 0);

  const data = [
    { name: 'Positive', value: safePositive },
    { name: 'Neutral', value: safeNeutral },
    { name: 'Negative', value: safeNegative }
  ];

  // Total is now the sum of real counts
  const total = safePositive + safeNeutral + safeNegative;

  // Calculate percentages for the legend
  const percentage = (value) => {
    // Handle division by zero for an empty chart
    if (total === 0) return '0%';
    return Math.round((value / total) * 100) + '%';
  };

  // Renders content for the center of the donut chart
  const renderCenterLabel = ({ cx, cy }) => (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#fff"
    >
      <tspan x={cx} dy="-0.5em" style={{ fontSize: 12, fill: '#9ca3af' }}>Total Count</tspan>
      <tspan x={cx} dy="1.5em" style={{ fontSize: 20, fontWeight: 700 }}>{total.toLocaleString()}</tspan>
    </text>
  );

  // Custom Tooltip lives inside the component so it can access `total` reliably
  const CustomTooltip = ({ active, payload }) => {
    if (!(active && payload && payload.length && total >= 0)) return null;

    const p = payload[0];
    // value from payload (number)
    const value = Number(p.value || 0);

    // Recharts may or may not supply percent. If not, fall back to manual calc.
    const rawPercent = typeof p.percent === 'number' ? p.percent : null;
    const safePercent =
      rawPercent !== null && !isNaN(rawPercent)
        ? (rawPercent * 100).toFixed(1)
        : (total > 0 ? ((value / total) * 100).toFixed(1) : '0.0');

    return (
      <div className="bg-gray-800/95 border border-white/10 p-2 rounded shadow-lg text-white text-sm">
        <p className="font-semibold text-base" style={{ color: p.color || '#fff' }}>
          {p.name}
        </p>
        <p className="text-gray-300">Count: <span className="font-bold">{value.toLocaleString()}</span></p>
        <p className="text-gray-300">Share: <span className="font-bold">{safePercent}%</span></p>
      </div>
    );
  };

  // To ensure tooltip data has the name/value and color, we pass dataWithTotal to Pie (no need to attach total to each slice).
  const dataWithNames = data.map((d) => ({ ...d }));

  return (
    <div className="bg-cp-panel text-white rounded-xl p-4 sm:p-6 shadow-lg border border-white/5 h-auto sm:h-64 flex flex-col">
      <h4 className="text-base sm:text-lg font-semibold mb-3">Sentiment Distribution</h4>

      <div className="flex-1 flex items-center justify-center min-h-[200px] sm:min-h-0">
        {total === 0 ? (
          <p className="text-gray-400 text-sm">No sentiment data available for the selected coin.</p>
        ) : (
          <>
            {/* Chart Section */}
            <div className="w-full sm:w-1/2 h-[180px] sm:h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Tooltip Integration (Now safely computing percent) */}
                  <Tooltip content={<CustomTooltip />} />

                  <Pie
                    data={dataWithNames}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    label={renderCenterLabel}
                    labelLine={false}
                  >
                    {dataWithNames.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Section */}
            <div className="hidden sm:block w-1/2 p-2 space-y-2">
              {data.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-gray-200">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-white">
                    {percentage(entry.value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile Legend (Below Chart) */}
            <div className="sm:hidden w-full mt-4 space-y-2">
              {data.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-gray-200">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-white">
                    {percentage(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
