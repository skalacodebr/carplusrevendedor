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

interface EditProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductEdited: () => void
  product: {
    id: number
    produto: string
    preco: number
    cor?: string
  } | null
}

export function EditProductModal({ open, onOpenChange, onProductEdited, product }: EditProductModalProps) {
  const [preco, setPreco] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Update price when product changes
  useState(() => {
    if (product && open) {
      setPreco(product.preco.toString())
    }
  }, [product, open])

  const handleSubmit = async () => {
    if (!product) return

    setIsSubmitting(true)
    try {
      const precoNum = Number.parseFloat(preco)

      if (precoNum <= 0) {
        toast({
          title: "Erro",
          description: "O preço deve ser maior que zero",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Update the price in revendedor_estoque
      const { error } = await supabase.from("revendedor_estoque").update({ preco: precoNum }).eq("id", product.id)

      if (error) {
        console.error("Update error:", error)
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Preço atualizado com sucesso!",
      })

      onOpenChange(false)
      onProductEdited()
    } catch (error) {
      console.error("Error editing product:", error)
      toast({
        title: "Erro ao editar produto",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao editar o produto.",
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
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>{product.produto}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="preco">Preço (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">R$</span>
              <Input
                id="preco"
                type="number"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                min="0.01"
                step="0.01"
                className="pl-10"
                placeholder="Digite o novo preço"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Preço atual: R$ {product.preco.toFixed(2)}</p>
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
