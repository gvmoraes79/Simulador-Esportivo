import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { SimulationResult } from '../types';

interface StatsChartsProps {
  data: SimulationResult;
}

export const ComparisonRadar: React.FC<StatsChartsProps> = ({ data }) => {
  const chartData = [
    { subject: 'Ataque', A: data.homeTeam.attackRating, B: data.awayTeam.attackRating, fullMark: 100 },
    { subject: 'Defesa', A: data.homeTeam.defenseRating, B: data.awayTeam.defenseRating, fullMark: 100 },
    { subject: 'Posse', A: data.homeTeam.possessionEst, B: data.awayTeam.possessionEst, fullMark: 100 },
    { subject: 'Momento', A: data.homeTeam.winProbability, B: data.awayTeam.winProbability, fullMark: 100 },
    { subject: 'Tática', A: Math.min(100, data.homeTeam.attackRating * 1.1), B: Math.min(100, data.awayTeam.attackRating * 1.1), fullMark: 100 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={data.homeTeam.name}
            dataKey="A"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.3}
          />
          <Radar
            name={data.awayTeam.name}
            dataKey="B"
            stroke="#ef4444"
            strokeWidth={2}
            fill="#ef4444"
            fillOpacity={0.3}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ProbabilityPie: React.FC<StatsChartsProps> = ({ data }) => {
  const chartData = [
    { name: `Vitória ${data.homeTeam.name}`, value: data.homeTeam.winProbability },
    { name: 'Empate', value: data.drawProbability },
    { name: `Vitória ${data.awayTeam.name}`, value: data.awayTeam.winProbability },
  ];

  const COLORS = ['#2563eb', '#64748b', '#dc2626'];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
             formatter={(value: number) => [`${value}%`, 'Probabilidade']}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ScoreProbabilitiesChart: React.FC<StatsChartsProps> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.exactScores}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="score" 
            type="category" 
            tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' }} 
            width={40}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{fill: '#1e293b', opacity: 0.5}}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
            formatter={(value: number) => [`${value}%`, 'Chance']}
          />
          <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={16}>
             {
                data.exactScores.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#4f46e5'} />
                ))
             }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};