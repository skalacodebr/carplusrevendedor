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
import { Truck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

interface EditFreteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EditFreteModal({ isOpen, onClose }: EditFreteModalProps) {
  const [frete, setFrete] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [revendedorId, setRevendedorId] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchCurrentFrete()
    }
  }, [isOpen])

  const fetchCurrentFrete = async () => {
    try {
      const userId = localStorage.getItem("userId")
      if (!userId) return

      // Buscar o revendedor_id
      const { data: revendedorData, error: revendedorError } = await supabase
        .from("revendedores")
        .select("id, frete")
        .eq("usuario_id", Number.parseInt(userId))
        .single()

      if (revendedorError) throw revendedorError

      if (revendedorData) {
        setRevendedorId(revendedorData.id)
        setFrete(revendedorData.frete?.toString() || "0")
      }
    } catch (error) {
      console.error("Erro ao buscar frete:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar valor do frete",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revendedorId) return

    const freteValue = Number.parseFloat(frete)
    if (isNaN(freteValue) || freteValue < 0) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor válido para o frete",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.from("revendedores").update({ frete: freteValue }).eq("id", revendedorId)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Valor do frete atualizado com sucesso!",
      })

      onClose()
    } catch (error) {
      console.error("Erro ao atualizar frete:", error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar valor do frete",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Configurar Frete
          </DialogTitle>
          <DialogDescription>Defina o valor do frete para suas entregas.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="frete">Valor do Frete (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">R$</span>
                <Input
                  id="frete"
                  type="number"
                  step="0.01"
                  min="0"
                  value={frete}
                  onChange={(e) => setFrete(e.target.value)}
                  className="pl-8"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
