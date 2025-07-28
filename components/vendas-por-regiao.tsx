"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  {
    name: "Sudeste",
    valor: 25430.5,
  },
  {
    name: "Sul",
    valor: 12780.3,
  },
  {
    name: "Nordeste",
    valor: 8950.2,
  },
  {
    name: "Centro-Oeste",
    valor: 6540.8,
  },
  {
    name: "Norte",
    valor: 3890.4,
  },
]

export function VendasPorRegiao() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" />
          <Tooltip formatter={(value) => [`R$ ${value.toFixed(2)}`, "Valor"]} />
          <Legend />
          <Bar dataKey="valor" name="Valor de Vendas" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
