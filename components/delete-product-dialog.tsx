"use client"

import { useState } from "react"
import { Package, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface DeleteProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductDeleted: () => void
  product: {
    id: number
    produto: string
    cor?: string
  } | null
}

export function DeleteProductDialog({ open, onOpenChange, onProductDeleted, product }: DeleteProductDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!product) return

    setIsDeleting(true)
    try {
      // Delete the product from revendedor_estoque
      const { error } = await supabase.from("revendedor_estoque").delete().eq("id", product.id)

      if (error) {
        console.error("Delete error:", error)
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      })

      onOpenChange(false)
      onProductDeleted()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Erro ao excluir produto",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir o produto.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="flex flex-row items-center">
          <div className="w-8 h-8 rounded-full mr-3 flex items-center justify-center bg-red-500">
            <Trash2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <DialogTitle>Excluir Produto</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center mb-4">
            <div
              className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
              style={{ backgroundColor: product.cor || "#000000" }}
            >
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="font-medium">{product.produto}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este produto do seu estoque? Esta ação não pode ser desfeita.
          </p>
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
