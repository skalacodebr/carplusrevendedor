"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface OverviewProps {
  data?: Array<{
    name: string
    total: number
  }>
}

export function Overview({ data }: OverviewProps) {
  // Use dados passados como props ou dados padrão se não houver dados
  const chartData =
    data && data.length > 0
      ? data
      : [
          { name: "Jan", total: 0 },
          { name: "Fev", total: 0 },
          { name: "Mar", total: 0 },
          { name: "Abr", total: 0 },
          { name: "Mai", total: 0 },
          { name: "Jun", total: 0 },
          { name: "Jul", total: 0 },
          { name: "Ago", total: 0 },
          { name: "Set", total: 0 },
          { name: "Out", total: 0 },
          { name: "Nov", total: 0 },
          { name: "Dez", total: 0 },
        ]

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `R$${value}`}
        />
        <Tooltip formatter={(value) => [`R$ ${value}`, "Total"]} labelFormatter={(label) => `Mês: ${label}`} />
        <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  )
}
