"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const activityData =[
  { day: "Mon", audits: 120 }, { day: "Tue", audits: 210 }, { day: "Wed", audits: 180 },
  { day: "Thu", audits: 320 }, { day: "Fri", audits: 290 }, { day: "Sat", audits: 150 },
  { day: "Sun", audits: 380 },
];

export function ActivityChart() {
  return (
    <div className="lg:col-span-2 bg-surface border border-white/5 rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">System Load</h3>
          <p className="text-xs text-zinc-500">Daily verification requests</p>
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAudits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="day" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#10b981' }} />
            <Area type="monotone" dataKey="audits" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAudits)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
