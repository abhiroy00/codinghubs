import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Metric } from "./types";
export default function PerformanceChart({data}: {data: (Metric & {day: string})[]}) { return (                <ResponsiveContainer>
                  <ComposedChart
                    data={data}
                    margin={{ top: 10, right: 0, bottom: 2, left: -17 }}
                  >
                    <defs>
                      <linearGradient
                        id="impressionFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#49b7a1"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#49b7a1"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf2f5" vertical={false} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#617586" }}
                      minTickGap={30}
                    />
                    <YAxis
                      yAxisId="impressions"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#617586" }}
                    />
                    <YAxis
                      yAxisId="clicks"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#617586" }}
                      width={26}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e1e9ed",
                        fontSize: 11,
                      }}
                    />
                    <Area
                      yAxisId="impressions"
                      type="monotone"
                      name="Impressions"
                      dataKey="impressions"
                      stroke="#49b7a1"
                      fill="url(#impressionFill)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="clicks"
                      name="Clicks"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#2a5d7a"
                      dot={false}
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>); }
