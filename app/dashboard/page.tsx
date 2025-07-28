"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DollarSign, Package, ShoppingCart, Users, ArrowRight } from "lucide-react"
import { Overview } from "@/components/overview"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

// Add this new function to fetch inventory data
async function getInventoryStats() {
  try {
    // Get the user ID from localStorage (client-side only)
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId")

      if (!userId) {
        console.error("User ID not found in localStorage")
        return { totalItems: 0, lowStockItems: 0 }
      }

      // First, get the revendedor_id from the revendedores table
      const { data: revendedorData, error: revendedorError } = await supabase
        .from("revendedores")
        .select("id")
        .eq("usuario_id", userId)
        .single()

      if (revendedorError || !revendedorData) {
        console.error("Error fetching revendedor data:", revendedorError)
        return { totalItems: 0, lowStockItems: 0 }
      }

      const revendedorId = revendedorData.id

      // Now fetch the estoque data for this revendedor
      const { data: estoqueData, error } = await supabase
        .from("revendedor_estoque")
        .select("quantidade, status")
        .eq("revendedor_id", revendedorId)

      if (error) {
        console.error("Error fetching estoque:", error)
        return { totalItems: 0, lowStockItems: 0 }
      }

      // Calculate total items and low stock items
      let totalItems = 0
      let lowStockItems = 0

      estoqueData?.forEach((item) => {
        totalItems += item.quantidade
        // Check if status contains "baixo" (low stock) instead of checking quantity
        if (item.status && item.status.toLowerCase().includes("baixo")) {
          lowStockItems++
        }
      })

      return {
        totalItems,
        lowStockItems,
        productCount: estoqueData?.length || 0,
      }
    }

    return { totalItems: 0, lowStockItems: 0, productCount: 0 }
  } catch (error) {
    console.error("Error getting inventory stats:", error)
    return { totalItems: 0, lowStockItems: 0, productCount: 0 }
  }
}

async function getClientesStats() {
  try {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId")
      if (!userId) return { totalClientes: 0 }

      // Buscar o ID do revendedor
      const { data: revendedorData, error: revendedorError } = await supabase
        .from("revendedores")
        .select("id")
        .eq("usuario_id", userId)
        .single()

      if (revendedorError || !revendedorData) {
        console.error("Error fetching revendedor data:", revendedorError)
        return { totalClientes: 0 }
      }

      // Buscar o número de clientes do revendedor
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id")
        .eq("revendedor_id", revendedorData.id)

      if (clientesError) {
        console.error("Error fetching clientes:", clientesError)
        return { totalClientes: 0 }
      }

      return {
        totalClientes: clientesData?.length || 0,
      }
    }
    return { totalClientes: 0 }
  } catch (error) {
    console.error("Error getting clientes stats:", error)
    return { totalClientes: 0 }
  }
}

async function getPedidosStats() {
  try {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId")
      if (!userId) return { totalPedidos: 0 }

      // Buscar o número total de pedidos do revendedor usando userId diretamente
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select("id")
        .eq("revendedor_id", Number.parseInt(userId))

      if (pedidosError) {
        console.error("Error fetching pedidos:", pedidosError)
        return { totalPedidos: 0 }
      }

      return {
        totalPedidos: pedidosData?.length || 0,
      }
    }
    return { totalPedidos: 0 }
  } catch (error) {
    console.error("Error getting pedidos stats:", error)
    return { totalPedidos: 0 }
  }
}

async function getReceitaTotal() {
  try {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId")
      if (!userId) return { receitaTotal: 0 }

      // Buscar pedidos finalizados (entregue ou retirado) e somar o valor total usando userId diretamente
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select("valor_total")
        .eq("revendedor_id", Number.parseInt(userId))
        .in("status_detalhado", ["entregue", "retirado"])

      if (pedidosError) {
        console.error("Error fetching pedidos for receita:", pedidosError)
        return { receitaTotal: 0 }
      }

      // Calcular a receita total
      const receitaTotal = pedidosData?.reduce((total, pedido) => total + pedido.valor_total, 0) || 0

      return {
        receitaTotal,
      }
    }
    return { receitaTotal: 0 }
  } catch (error) {
    console.error("Error getting receita total:", error)
    return { receitaTotal: 0 }
  }
}

async function getVendasRecentes() {
  try {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId")
      if (!userId) return []

      // Buscar pedidos finalizados recentes usando userId diretamente
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(`
          valor_total,
          cliente_id,
          created_at,
          data_entrega_real
        `)
        .eq("revendedor_id", Number.parseInt(userId))
        .in("status_detalhado", ["entregue", "retirado"])
        .order("data_entrega_real", { ascending: false, nullsLast: true })
        .limit(5)

      if (pedidosError) {
        console.error("Erro ao buscar pedidos:", pedidosError)
        return []
      }

      if (!pedidosData || pedidosData.length === 0) {
        console.log("Nenhum pedido finalizado encontrado")
        return []
      }

      // Buscar dados dos clientes separadamente
      const clienteIds = [...new Set(pedidosData.map((p) => p.cliente_id))]
      const { data: clientesData, error: clientesError } = await supabase
        .from("usuarios")
        .select("id, nome, sobrenome")
        .in("id", clienteIds)

      if (clientesError) {
        console.error("Erro ao buscar clientes:", clientesError)
        return []
      }

      return pedidosData.map((pedido) => {
        const cliente = clientesData?.find((c) => c.id === pedido.cliente_id)
        return {
          cliente_nome: cliente ? cliente.nome : "Cliente não encontrado",
          valor_total: pedido.valor_total,
        }
      })
    }
    return []
  } catch (error) {
    console.error("Error getting vendas recentes:", error)
    return []
  }
}

async function getVendasPorMes() {
  try {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId")
      if (!userId) return []

      // Buscar pedidos finalizados do ano atual usando userId diretamente
      const anoAtual = new Date().getFullYear()
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select("valor_total, data_entrega_real")
        .eq("revendedor_id", Number.parseInt(userId))
        .in("status_detalhado", ["entregue", "retirado"])
        .gte("data_entrega_real", `${anoAtual}-01-01`)
        .lte("data_entrega_real", `${anoAtual}-12-31`)

      if (pedidosError) {
        console.error("Erro ao buscar pedidos por mês:", pedidosError)
        return []
      }

      // Agrupar vendas por mês
      const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

      const vendasPorMes = meses.map((mes, index) => {
        const mesNumero = index + 1
        const vendasDoMes =
          pedidosData?.filter((pedido) => {
            if (!pedido.data_entrega_real) return false
            const dataPedido = new Date(pedido.data_entrega_real)
            return dataPedido.getMonth() + 1 === mesNumero
          }) || []

        const totalMes = vendasDoMes.reduce((total, pedido) => total + pedido.valor_total, 0)

        return {
          name: mes,
          total: Math.round(totalMes),
        }
      })

      return vendasPorMes
    }
    return []
  } catch (error) {
    console.error("Error getting vendas por mês:", error)
    return []
  }
}

// Make the default function client-side
export default function DashboardPage() {
  // Add state for inventory stats
  const [inventoryStats, setInventoryStats] = React.useState({
    totalItems: 0,
    lowStockItems: 0,
    productCount: 0,
  })

  const [clientesStats, setClientesStats] = React.useState({
    totalClientes: 0,
  })

  const [pedidosStats, setPedidosStats] = React.useState({
    totalPedidos: 0,
  })

  const [receitaStats, setReceitaStats] = React.useState({
    receitaTotal: 0,
  })

  const [vendasRecentes, setVendasRecentes] = React.useState<
    {
      cliente_nome: string
      valor_total: number
    }[]
  >([])

  const [overviewData, setOverviewData] = React.useState<
    Array<{
      name: string
      total: number
    }>
  >([])

  // Fetch inventory stats on component mount
  React.useEffect(() => {
    async function fetchData() {
      const [inventoryStats, vendas, clientes, pedidos, receita, overview] = await Promise.all([
        getInventoryStats(),
        getVendasRecentes(),
        getClientesStats(),
        getPedidosStats(),
        getReceitaTotal(),
        getVendasPorMes(),
      ])
      setInventoryStats(inventoryStats)
      setVendasRecentes(vendas)
      setClientesStats(clientes)
      setPedidosStats(pedidos)
      setReceitaStats(receita)
      setOverviewData(overview)
    }
    fetchData()
  }, [])

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Revendedor</h2>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R${" "}
                  {receitaStats.receitaTotal.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Vendas finalizadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pedidosStats.totalPedidos}</div>
                <p className="text-xs text-muted-foreground">
                  {pedidosStats.totalPedidos === 1 ? "pedido registrado" : "pedidos registrados"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientesStats.totalClientes}</div>
                <p className="text-xs text-muted-foreground">
                  {clientesStats.totalClientes === 1 ? "cliente cadastrado" : "clientes cadastrados"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estoque</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventoryStats.totalItems} itens</div>
                <p className="text-xs text-muted-foreground">
                  {inventoryStats.lowStockItems} produtos com estoque baixo
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Visão Geral</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview data={overviewData} />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vendas Recentes</CardTitle>
                  <CardDescription>Suas últimas {vendasRecentes.length} vendas finalizadas.</CardDescription>
                </div>
                <Link href="/dashboard/finalizados" className="text-sm text-primary flex items-center hover:underline">
                  Ver tudo
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {vendasRecentes.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">Nenhuma venda finalizada encontrada</div>
                  ) : (
                    vendasRecentes.map((venda, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{venda.cliente_nome}</p>
                          </div>
                        </div>
                        <div className="ml-auto font-medium">+R${venda.valor_total.toFixed(2)}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
