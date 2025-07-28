"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CheckCircle,
  XCircle,
  CreditCard,
  DollarSign,
  Eye,
  Search,
  SlidersHorizontal,
  Truck,
  Package,
} from "lucide-react"
import { EditFreteModal } from "@/components/edit-frete-modal"
import { AceitarPedidoModal } from "@/components/aceitar-pedido-modal"
import { RecusarPedidoModal } from "@/components/recusar-pedido-modal"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { capitalizeStatus } from "@/lib/utils"

interface PedidoItem {
  id: number
  pedido_id: number
  pacote_id: number
  qtd: number
  valor_unitario: number
  pacote?: {
    nome: string
    cor: string
  }
}

interface Cliente {
  nome: string
  sobrenome: string
}

interface Pedido {
  id: number
  numero: string
  cliente_id: number
  frete: number
  valor_total: number
  pagamento_tipo: string
  tipo_entrega: string
  status: string
  status_detalhado: string
  created_at: string
  data_estimada_entrega: string | null
  data_entrega_real: string | null
  observacoes_revendedor: string | null
  cliente?: Cliente
  pedido_itens: PedidoItem[]
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isFreteModalOpen, setIsFreteModalOpen] = useState(false)
  const [isAceitarModalOpen, setIsAceitarModalOpen] = useState(false)
  const [isRecusarModalOpen, setIsRecusarModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchPedidos()
  }, [])

  const fetchPedidos = async () => {
    try {
      setLoading(true)

      // Get user ID from localStorage
      const userId = localStorage.getItem("userId")
      if (!userId) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Faça login novamente.",
          variant: "destructive",
        })
        return
      }

      // First, fetch pedidos - apenas novos pedidos, usando userId diretamente
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select("*")
        .eq("revendedor_id", Number.parseInt(userId))
        .in("status_detalhado", ["aguardando_preparacao", "aguardando_aceite"])
        .order("created_at", { ascending: false })

      if (pedidosError) {
        console.error("Error fetching pedidos:", pedidosError)
        toast({
          title: "Erro",
          description: "Erro ao carregar pedidos.",
          variant: "destructive",
        })
        return
      }

      if (!pedidosData || pedidosData.length === 0) {
        setPedidos([])
        return
      }

      // Get all unique cliente_ids
      const clienteIds = [...new Set(pedidosData.map((p) => p.cliente_id))]

      // Fetch cliente data
      const { data: clientesData, error: clientesError } = await supabase
        .from("usuarios")
        .select("id, nome, sobrenome")
        .in("id", clienteIds)

      if (clientesError) {
        console.error("Error fetching clientes:", clientesError)
      }

      // Get all pedido IDs
      const pedidoIds = pedidosData.map((p) => p.id)

      // Fetch pedido_itens
      const { data: itensData, error: itensError } = await supabase
        .from("pedido_itens")
        .select("*")
        .in("pedido_id", pedidoIds)

      if (itensError) {
        console.error("Error fetching pedido_itens:", itensError)
      }

      // Get all unique pacote_ids
      const pacoteIds = [...new Set((itensData || []).map((item) => item.pacote_id))]

      // Fetch pacote data
      const { data: pacotesData, error: pacotesError } = await supabase
        .from("pacotes")
        .select("id, descricao, cor")
        .in("id", pacoteIds)

      if (pacotesError) {
        console.error("Error fetching pacotes:", pacotesError)
      }

      // Combine all data
      const pedidosWithDetails = pedidosData.map((pedido) => {
        const cliente = clientesData?.find((c) => c.id === pedido.cliente_id)
        const pedidoItens = (itensData || [])
          .filter((item) => item.pedido_id === pedido.id)
          .map((item) => ({
            ...item,
            pacote: pacotesData?.find((p) => p.id === item.pacote_id),
          }))

        return {
          ...pedido,
          cliente,
          pedido_itens: pedidoItens,
        }
      })

      setPedidos(pedidosWithDetails)
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar pedidos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerDetalhes = (pedido: Pedido) => {
    setSelectedPedido(pedido)
    setIsDialogOpen(true)
  }

  const handleAceitar = (pedido: Pedido) => {
    setSelectedPedido(pedido)
    setIsAceitarModalOpen(true)
  }

  const handleRecusar = (pedido: Pedido) => {
    setSelectedPedido(pedido)
    setIsRecusarModalOpen(true)
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "pago":
        return "default"
      case "pendente":
        return "secondary"
      case "cancelado":
        return "destructive"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getTotalItens = (pedidoItens: PedidoItem[]) => {
    return pedidoItens.reduce((total, item) => total + item.qtd, 0)
  }

  const filteredPedidos = pedidos.filter((pedido) => {
    const matchesSearch = `${pedido.cliente?.nome || ""} ${pedido.cliente?.sobrenome || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <p>Carregando pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Novos Pedidos</h2>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por cliente..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="sr-only">Filtrar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Todos os pedidos</DropdownMenuItem>
              <DropdownMenuItem>Últimos 7 dias</DropdownMenuItem>
              <DropdownMenuItem>Últimos 30 dias</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setIsFreteModalOpen(true)} className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Configurar Frete
          </Button>
        </div>
      </div>

      {filteredPedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
          <p className="text-muted-foreground">
            {pedidos.length === 0
              ? "Você não possui novos pedidos no momento."
              : "Nenhum novo pedido corresponde aos filtros aplicados."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {pedido.cliente
                          ? `${pedido.cliente.nome} ${pedido.cliente.sobrenome}`
                          : "Cliente não encontrado"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {capitalizeStatus(pedido.tipo_entrega)} • {getTotalItens(pedido.pedido_itens)} itens
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(pedido.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium">R$ {pedido.valor_total.toFixed(2)}</span>
                      <Badge variant={getStatusVariant(pedido.status)} className="text-xs">
                        {capitalizeStatus(pedido.status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAceitar(pedido)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aceitar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRecusar(pedido)}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Recusar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleVerDetalhes(pedido)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal de detalhes do pedido */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido {selectedPedido?.numero}</DialogTitle>
            <DialogDescription>
              Pedido realizado em {selectedPedido && formatDate(selectedPedido.created_at)} por{" "}
              {selectedPedido?.cliente
                ? `${selectedPedido.cliente.nome} ${selectedPedido.cliente.sobrenome}`
                : "Cliente não encontrado"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Status do Pagamento</h4>
                <Badge variant={selectedPedido ? getStatusVariant(selectedPedido.status) : "outline"}>
                  {selectedPedido ? capitalizeStatus(selectedPedido.status) : ""}
                </Badge>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Tipo de Entrega</h4>
                <span>{selectedPedido ? capitalizeStatus(selectedPedido.tipo_entrega) : ""}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Tipo de Pagamento</h4>
                <div className="flex items-center">
                  {selectedPedido?.pagamento_tipo === "Cartão de Crédito" && (
                    <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                  )}
                  {selectedPedido?.pagamento_tipo === "Boleto Bancário" && (
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  )}
                  {selectedPedido?.pagamento_tipo === "Pix" && (
                    <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                  )}
                  <span>{selectedPedido ? capitalizeStatus(selectedPedido.pagamento_tipo) : ""}</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Número do Pedido</h4>
                <span className="font-mono">{selectedPedido?.numero}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Itens do Pedido</h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPedido?.pedido_itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="flex items-center gap-2">
                          {item.pacote?.cor && (
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: item.pacote.cor }}
                            >
                              <Package className="w-2 h-2 text-white" />
                            </div>
                          )}
                          {item.pacote?.descricao || "Produto não encontrado"}
                        </TableCell>
                        <TableCell className="text-right">{item.qtd}</TableCell>
                        <TableCell className="text-right">R$ {item.valor_unitario.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(item.qtd * item.valor_unitario).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  R$ {selectedPedido ? (selectedPedido.valor_total - selectedPedido.frete).toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span>R$ {selectedPedido?.frete.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span>R$ {selectedPedido?.valor_total.toFixed(2)}</span>
              </div>
            </div>

            {selectedPedido?.observacoes_revendedor && (
              <div>
                <h4 className="text-sm font-medium mb-1">Observações</h4>
                <p className="text-sm text-muted-foreground">{selectedPedido.observacoes_revendedor}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <EditFreteModal isOpen={isFreteModalOpen} onClose={() => setIsFreteModalOpen(false)} />

      <AceitarPedidoModal
        isOpen={isAceitarModalOpen}
        onClose={() => setIsAceitarModalOpen(false)}
        onPedidoAceito={fetchPedidos}
        pedido={selectedPedido}
      />

      <RecusarPedidoModal
        isOpen={isRecusarModalOpen}
        onClose={() => setIsRecusarModalOpen(false)}
        onPedidoRecusado={fetchPedidos}
        pedido={selectedPedido}
      />
    </div>
  )
}
