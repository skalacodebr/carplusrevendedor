"use client"

import { useState } from "react"
import { Package } from "lucide-react"
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
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

interface AdjustStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStockAdjusted: () => void
  product: {
    id: number
    produto: string
    quantidade: number
    cor?: string
  } | null
}

export function AdjustStockModal({ open, onOpenChange, onStockAdjusted, product }: AdjustStockModalProps) {
  const [quantidade, setQuantidade] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Update quantity when product changes
  useState(() => {
    if (product && open) {
      setQuantidade(product.quantidade.toString())
    }
  }, [product, open])

  const handleSubmit = async () => {
    if (!product) return

    setIsSubmitting(true)
    try {
      const quantidadeNum = Number.parseInt(quantidade, 10)

      if (quantidadeNum < 0) {
        toast({
          title: "Erro",
          description: "A quantidade não pode ser negativa",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Update the stock in revendedor_estoque
      const { error } = await supabase
        .from("revendedor_estoque")
        .update({
          quantidade: quantidadeNum,
          status: quantidadeNum > 0 ? (quantidadeNum <= 20 ? "Estoque baixo" : "Em estoque") : "Sem estoque",
        })
        .eq("id", product.id)

      if (error) {
        console.error("Update error:", error)
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Estoque ajustado com sucesso!",
      })

      onOpenChange(false)
      onStockAdjusted()
    } catch (error) {
      console.error("Error adjusting stock:", error)
      toast({
        title: "Erro ao ajustar estoque",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao ajustar o estoque.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="flex flex-row items-center">
          <div
            className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
            style={{ backgroundColor: product.cor || "#000000" }}
          >
            <Package className="h-4 w-4 text-white" />
          </div>
          <div>
            <DialogTitle>Ajustar Estoque</DialogTitle>
            <DialogDescription>{product.produto}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="quantidade">Nova Quantidade</Label>
            <Input
              id="quantidade"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              min="0"
              placeholder="Digite a nova quantidade"
            />
            <p className="text-xs text-muted-foreground mt-1">Quantidade atual: {product.quantidade}</p>
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
