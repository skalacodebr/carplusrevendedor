"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, Calendar, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { capitalizeStatus } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PedidoItem {
  id: number
  pedido_id: number
  pacote_id: number
  qtd: number
  valor_unitario: number
  pacote?: {
    descricao: string
  }
}

interface AceitarPedidoModalProps {
  isOpen: boolean
  onClose: () => void
  onPedidoAceito: () => void
  pedido: {
    id: number
    numero: string
    tipo_entrega: string
    cliente?: {
      id: number
      nome: string
      sobrenome: string
    }
  } | null
}

export function AceitarPedidoModal({ isOpen, onClose, onPedidoAceito, pedido }: AceitarPedidoModalProps) {
  const [dataEstimada, setDataEstimada] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pedidoItens, setPedidoItens] = useState<PedidoItem[]>([])
  const [estoqueInsuficiente, setEstoqueInsuficiente] = useState(false)
  const [itensComEstoqueInsuficiente, setItensComEstoqueInsuficiente] = useState<string[]>([])
  const [revendedorId, setRevendedorId] = useState<number | null>(null)
  const { toast } = useToast()

  // Buscar o ID do revendedor e os itens do pedido quando o modal abrir
  useEffect(() => {
    if (isOpen && pedido) {
      fetchRevendedorId()
      fetchPedidoItens()
    }
  }, [isOpen, pedido])

  // Buscar o ID do revendedor
  const fetchRevendedorId = async () => {
    try {
      const userId = localStorage.getItem("userId")
      if (!userId) return

      const { data, error } = await supabase
        .from("revendedores")
        .select("id")
        .eq("usuario_id", Number.parseInt(userId))
        .single()

      if (error) throw error
      if (data) setRevendedorId(data.id)
    } catch (error) {
      console.error("Erro ao buscar ID do revendedor:", error)
    }
  }

  // Buscar os itens do pedido
  const fetchPedidoItens = async () => {
    if (!pedido) return

    try {
      console.log("Buscando itens do pedido:", pedido.id)
      
      // Buscar os itens do pedido
      const { data: itens, error: itensError } = await supabase
        .from("pedido_itens")
        .select("*, pacote:pacote_id(descricao)")
        .eq("pedido_id", pedido.id)

      console.log("Resultado busca itens:", { itens, itensError })

      if (itensError) {
        console.error("Erro detalhado nos itens:", itensError)
        throw itensError
      }
      
      if (itens) {
        console.log("Itens encontrados:", itens)
        setPedidoItens(itens)
        
        // Verificar se há estoque suficiente
        await verificarEstoque(itens)
      } else {
        console.log("Nenhum item encontrado para o pedido")
      }
    } catch (error) {
      console.error("Erro ao buscar itens do pedido:", error)
    }
  }

  // Verificar se há estoque suficiente para todos os itens
  const verificarEstoque = async (itens: PedidoItem[]) => {
    try {
      const userId = localStorage.getItem("userId")
      if (!userId) return

      // Buscar o ID do revendedor
      const { data: revendedor, error: revendedorError } = await supabase
        .from("revendedores")
        .select("id")
        .eq("usuario_id", Number.parseInt(userId))
        .single()

      if (revendedorError) throw revendedorError
      if (!revendedor) return

      // Verificar estoque para cada item
      const itensInsuficientes: string[] = []

      for (const item of itens) {
        // Buscar o produto no estoque do revendedor
        const { data: estoque, error: estoqueError } = await supabase
          .from("revendedor_estoque")
          .select("quantidade, produto")
          .eq("revendedor_id", revendedor.id)
          .eq("produto", item.pacote?.descricao)
          .single()

        if (estoqueError && estoqueError.code !== "PGRST116") {
          // PGRST116 é o código para "nenhum resultado encontrado"
          throw estoqueError
        }

        // Se o produto não existe no estoque ou a quantidade é insuficiente
        if (!estoque || estoque.quantidade < item.qtd) {
          itensInsuficientes.push(item.pacote?.descricao || `Produto ID ${item.pacote_id}`)
        }
      }

      // Atualizar o estado com os resultados
      if (itensInsuficientes.length > 0) {
        setEstoqueInsuficiente(true)
        setItensComEstoqueInsuficiente(itensInsuficientes)
      } else {
        setEstoqueInsuficiente(false)
        setItensComEstoqueInsuficiente([])
      }
    } catch (error) {
      console.error("Erro ao verificar estoque:", error)
    }
  }

  // Atualizar o estoque após aceitar o pedido
  const atualizarEstoque = async () => {
    if (!revendedorId) return

    try {
      for (const item of pedidoItens) {
        // Buscar o produto no estoque
        const { data: estoque, error: estoqueError } = await supabase
          .from("revendedor_estoque")
          .select("*")
          .eq("revendedor_id", revendedorId)
          .eq("produto", item.pacote?.descricao)
          .single()

        if (estoqueError) {
          console.error("Erro ao buscar produto no estoque:", estoqueError)
          continue
        }

        if (estoque) {
          // Calcular nova quantidade
          const novaQuantidade = estoque.quantidade - item.qtd

          // Determinar o novo status baseado na quantidade
          let novoStatus = "Em estoque"
          if (novaQuantidade <= 0) {
            novoStatus = "Sem estoque"
          } else if (novaQuantidade <= 20) {
            novoStatus = "Estoque baixo"
          }

          // Atualizar o estoque
          const { error: updateError } = await supabase
            .from("revendedor_estoque")
            .update({
              quantidade: novaQuantidade,
              status: novoStatus,
            })
            .eq("id", estoque.id)

          if (updateError) {
            console.error("Erro ao atualizar estoque:", updateError)
          }
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar estoque:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pedido || !dataEstimada) return

    setIsLoading(true)

    try {
      // Verificar se há estoque suficiente
      if (estoqueInsuficiente) {
        toast({
          title: "Estoque insuficiente",
          description: "Não é possível aceitar o pedido devido à falta de estoque.",
          variant: "destructive",
        })
        return
      }

      // Adicionar cliente à tabela clientes se não existir
      if (revendedorId && pedido.cliente) {
        try {
          // Verificar se o cliente já existe para este revendedor
          const { data: clienteExistente, error: clienteError } = await supabase
            .from("clientes")
            .select("id")
            .eq("revendedor_id", revendedorId)
            .eq("usuario_id", pedido.cliente.id)
            .single()

          // Se o cliente não existe, criar um novo registro
          if (clienteError && clienteError.code === "PGRST116") {
            // Buscar o nome completo do cliente
            const { data: dadosCliente, error: dadosError } = await supabase
              .from("usuarios")
              .select("nome, sobrenome")
              .eq("id", pedido.cliente.id)
              .single()

            if (!dadosError && dadosCliente) {
              const nomeCompleto = `${dadosCliente.nome} ${dadosCliente.sobrenome}`.trim()

              const { error: insertError } = await supabase.from("clientes").insert({
                revendedor_id: revendedorId,
                usuario_id: pedido.cliente.id,
                nome: nomeCompleto,
              })

              if (insertError) {
                console.error("Erro ao adicionar cliente:", insertError)
              }
            }
          }
        } catch (error) {
          console.error("Erro ao verificar/adicionar cliente:", error)
        }
      }

      // Determinar o novo status baseado no tipo de entrega
      const novoStatus = pedido.tipo_entrega.toLowerCase() === "retirada" ? "preparando_pedido" : "aceito"

      // Atualizar o estoque
      await atualizarEstoque()

      // Atualizar o pedido no banco
      const { error } = await supabase
        .from("pedidos")
        .update({
          status_detalhado: novoStatus,
          data_estimada_entrega: dataEstimada,
        })
        .eq("id", pedido.id)

      if (error) throw error

      toast({
        title: "Pedido aceito com sucesso!",
        description: `Pedido ${pedido.numero} foi aceito e está ${
          novoStatus === "preparando_pedido" ? "sendo preparado" : "confirmado"
        }.`,
      })

      onClose()
      onPedidoAceito()
      setDataEstimada("")
    } catch (error) {
      console.error("Erro ao aceitar pedido:", error)
      toast({
        title: "Erro ao aceitar pedido",
        description: error instanceof Error ? error.message : "Erro inesperado ao aceitar o pedido.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calcular data mínima (hoje)
  const hoje = new Date().toISOString().split("T")[0]

  if (!pedido) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Aceitar Pedido
          </DialogTitle>
          <DialogDescription>
            Aceitar pedido {pedido.numero} de{" "}
            {pedido.cliente ? `${pedido.cliente.nome} ${pedido.cliente.sobrenome}` : "Cliente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {estoqueInsuficiente && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Estoque insuficiente para os seguintes produtos:
                  <ul className="list-disc pl-5 mt-2">
                    {itensComEstoqueInsuficiente.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="tipo-entrega">Tipo de Entrega</Label>
              <div className="p-2 bg-muted rounded-md">
                <span className="font-medium">{capitalizeStatus(pedido.tipo_entrega)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-estimada">
                {pedido.tipo_entrega.toLowerCase() === "retirada" ? "Data para Retirada" : "Data Estimada de Entrega"}
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="data-estimada"
                  type="date"
                  value={dataEstimada}
                  onChange={(e) => setDataEstimada(e.target.value)}
                  min={hoje}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {pedido.tipo_entrega.toLowerCase() === "retirada"
                  ? "Selecione quando o pedido estará pronto para retirada"
                  : "Selecione a data estimada para entrega"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || estoqueInsuficiente}>
              {isLoading ? "Aceitando..." : "Aceitar Pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
