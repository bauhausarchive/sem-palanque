'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { GastoResumido, GastosPorMes } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const BAUHAUS_COLORS = [
  '#FF2020',
  '#1A6BFF',
  '#FFE500',
  '#FF2020cc',
  '#1A6BFFcc',
  '#FFE500cc',
  '#ffffff40',
]

interface GastoBarChartProps {
  data: GastosPorMes[]
}

export function GastoBarChart({ data }: GastoBarChartProps) {
  const formatted = data.map((d) => ({
    name: `${MES_LABELS[d.mes - 1]}/${String(d.ano).slice(2)}`,
    total: d.total,
  }))

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4">
      <div className="h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#ffffff40', fontWeight: 700, fontFamily: "'Space Grotesk', 'DM Sans', sans-serif" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#ffffff40', fontWeight: 700, fontFamily: "'Space Grotesk', 'DM Sans', sans-serif" }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Total']}
            contentStyle={{
              borderRadius: 0,
              border: '1px solid #333',
              background: '#0a0a0a',
              color: '#fff',
              fontSize: 12,
              fontFamily: "'Space Grotesk', 'DM Sans', sans-serif",
            }}
          />
          <Bar dataKey="total" fill="#FF2020" radius={0} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}

interface GastoPieChartProps {
  data: GastoResumido[]
}

export function GastoPieChart({ data }: GastoPieChartProps) {
  const top = [...data].sort((a, b) => b.total - a.total).slice(0, 7)

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4">
      <ResponsiveContainer width="100%" height={380}>
        <PieChart margin={{ bottom: 20 }}>
          <Pie
            data={top}
            cx="50%"
            cy="45%"
            outerRadius={100}
            dataKey="total"
            nameKey="tipoDespesa"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {top.map((_, i) => (
              <Cell key={i} fill={BAUHAUS_COLORS[i % BAUHAUS_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            contentStyle={{
              borderRadius: 0,
              border: '1px solid #333',
              background: '#0a0a0a',
              color: '#fff',
              fontSize: 12,
              fontFamily: "'Space Grotesk', 'DM Sans', sans-serif",
            }}
          />
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 16, lineHeight: '1.6', width: '100%', whiteSpace: 'normal', color: '#ffffff80', fontFamily: "'Space Grotesk', 'DM Sans', sans-serif" }}
            formatter={(value) => value}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
