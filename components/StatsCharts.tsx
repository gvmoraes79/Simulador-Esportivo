
import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { SimulationResult } from '../types';

export const ComparisonRadar: React.FC<{ data: SimulationResult }> = ({ data }) => {
  const chartData = [
    { subject: 'Ataque', A: data.homeTeam.attackRating, B: data.awayTeam.attackRating },
    { subject: 'Defesa', A: data.homeTeam.defenseRating, B: data.awayTeam.defenseRating },
    { subject: 'Posse', A: data.homeTeam.possessionEst, B: data.awayTeam.possessionEst },
    { subject: 'Momento', A: data.homeTeam.winProbability, B: data.awayTeam.winProbability },
    { subject: 'Tática', A: 75, B: 70 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Radar name={data.homeTeam.name} dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
          <Radar name={data.awayTeam.name} dataKey="B" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ProbabilityPie: React.FC<{ data: SimulationResult }> = ({ data }) => {
  const chartData = [
    { name: 'Casa', value: data.homeTeam.winProbability },
    { name: 'Empate', value: data.drawProbability },
    { name: 'Fora', value: data.awayTeam.winProbability },
  ];
  const COLORS = ['#10b981', '#334155', '#ef4444'];

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ScoreProbabilitiesChart: React.FC<{ data: SimulationResult }> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.exactScores} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="score" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={50} />
          <Bar dataKey="probability" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
