"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const telemetryData =[
  { name: "Verified (Clean)", value: 85, color: "#10b981" },
  { name: "Blocked (Hallucination)", value: 15, color: "#ef4444" },
];

export function TelemetryDonut() {
  return (
    <div className="bg-surface border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
      <div>
        <h3 className="text-lg font-bold text-white">Logic Breaches</h3>
        <p className="text-xs text-zinc-500">Hallucinations caught by Prosecutor</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={telemetryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
              {telemetryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-white">15%</span>
          <span className="text-[10px] text-red-500 font-mono uppercase tracking-widest">Blocked</span>
        </div>
      </div>
      <div className="space-y-3 mt-4">
         {telemetryData.map(item => (
           <div key={item.name} className="flex justify-between items-center text-sm">
             <div className="flex items-center gap-2 text-zinc-400">
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
               {item.name}
             </div>
             <span className="text-white font-bold">{item.value}%</span>
           </div>
         ))}
      </div>
    </div>
  );
}
