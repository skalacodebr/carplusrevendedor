"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

interface RecusarPedidoModalProps {
  isOpen: boolean
  onClose: () => void
  onPedidoRecusado: () => void
  pedido: {
    id: number
    numero: string
    cliente?: {
      nome: string
      sobrenome: string
    }
  } | null
}

export function RecusarPedidoModal({ isOpen, onClose, onPedidoRecusado, pedido }: RecusarPedidoModalProps) {
  const [motivo, setMotivo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pedido) return

    setIsLoading(true)

    try {
      // Atualizar o pedido no banco
      const { error } = await supabase
        .from("pedidos")
        .update({
          status_detalhado: "cancelado",
          observacoes_revendedor: motivo || "Pedido recusado pelo revendedor",
        })
        .eq("id", pedido.id)

      if (error) throw error

      toast({
        title: "Pedido recusado",
        description: `Pedido ${pedido.numero} foi recusado.`,
      })

      onClose()
      onPedidoRecusado()
      setMotivo("")
    } catch (error) {
      console.error("Erro ao recusar pedido:", error)
      toast({
        title: "Erro ao recusar pedido",
        description: error instanceof Error ? error.message : "Erro inesperado ao recusar o pedido.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!pedido) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Recusar Pedido
          </DialogTitle>
          <DialogDescription>
            Recusar pedido {pedido.numero} de{" "}
            {pedido.cliente ? `${pedido.cliente.nome} ${pedido.cliente.sobrenome}` : "Cliente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Recusa (Opcional)</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva o motivo da recusa do pedido..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Este motivo será registrado no sistema para referência futura.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading}>
              {isLoading ? "Recusando..." : "Recusar Pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
