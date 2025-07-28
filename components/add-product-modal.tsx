"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

interface Pacote {
  id: number
  descricao: string
  preco: number
  cor: string
  imagem: string | null
}

interface AddProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductAdded: () => void
}

export function AddProductModal({ open, onOpenChange, onProductAdded }: AddProductModalProps) {
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPacote, setSelectedPacote] = useState<Pacote | null>(null)
  const [quantidade, setQuantidade] = useState("1")
  const [preco, setPreco] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revendedorId, setRevendedorId] = useState<number | null>(null)
  const { toast } = useToast()

  // Fetch revendedor ID on component mount
  useEffect(() => {
    async function fetchRevendedorId() {
      try {
        const userId = localStorage.getItem("userId")
        if (!userId) {
          console.error("User ID not found in localStorage")
          return
        }

        const { data, error } = await supabase.from("revendedores").select("id").eq("usuario_id", userId).single()

        if (error) {
          console.error("Error fetching revendedor ID:", error)
          return
        }

        if (data) {
          console.log("Revendedor ID fetched:", data.id)
          setRevendedorId(data.id)
        }
      } catch (error) {
        console.error("Error in fetchRevendedorId:", error)
      }
    }

    fetchRevendedorId()
  }, [])

  useEffect(() => {
    async function fetchPacotes() {
      try {
        // Fetch distinct package descriptions first
        const { data: distinctDescriptions, error: distinctError } = await supabase
          .from("pacotes")
          .select("descricao")
          .order("descricao")
          .limit(1000)

        if (distinctError) throw distinctError

        // Create a Set to store unique package descriptions
        const uniqueDescriptions = new Set<string>()
        distinctDescriptions?.forEach((item) => uniqueDescriptions.add(item.descricao))

        // For each unique description, get the first package with that description
        const uniquePacotes: Pacote[] = []
        for (const descricao of uniqueDescriptions) {
          const { data, error } = await supabase.from("pacotes").select("*").eq("descricao", descricao).limit(1).single()

          if (!error && data) {
            uniquePacotes.push(data)
          }
        }

        setPacotes(uniquePacotes)
      } catch (error) {
        console.error("Error fetching pacotes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (open) {
      fetchPacotes()
      // Reset form when opening
      setSelectedPacote(null)
      setQuantidade("1")
      setPreco("")
    }
  }, [open])

  // Update price when package is selected
  useEffect(() => {
    if (selectedPacote) {
      setPreco(selectedPacote.preco.toString())
    } else {
      setPreco("")
    }
  }, [selectedPacote])

  const handleSelectPacote = (pacoteId: string) => {
    const pacote = pacotes.find((p) => p.id.toString() === pacoteId)
    setSelectedPacote(pacote || null)
  }

  const handleSubmit = async () => {
    if (!selectedPacote || !revendedorId) {
      toast({
        title: "Erro",
        description: !selectedPacote
          ? "Selecione um pacote"
          : "ID do revendedor não encontrado. Tente fazer login novamente.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      console.log("Submitting with revendedor_id:", revendedorId)

      // Parse values to ensure correct types
      const quantidadeNum = Number.parseInt(quantidade, 10)
      const precoNum = Number.parseFloat(preco)

      // Validate parsed values
      if (isNaN(quantidadeNum) || quantidadeNum < 0) {
        toast({
          title: "Erro",
          description: "Quantidade deve ser um número válido e maior ou igual a 0",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (isNaN(precoNum) || precoNum <= 0) {
        toast({
          title: "Erro",
          description: "Preço deve ser um número válido e maior que 0",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Validate minimum price
      if (selectedPacote && precoNum < selectedPacote.preco) {
        toast({
          title: "Erro",
          description: `O preço deve ser no mínimo R$ ${selectedPacote.preco.toFixed(2)}`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      console.log("Validation passed:", {
        revendedorId,
        selectedPacote: selectedPacote?.descricao,
        quantidadeNum,
        precoNum
      })

      // Check if product already exists in estoque
      const { data: existingProduct, error: checkError } = await supabase
        .from("revendedor_estoque")
        .select("id")
        .eq("revendedor_id", revendedorId)
        .eq("pacote_id", selectedPacote.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") { // PGRST116 = no rows returned
        console.error("Error checking existing product:", checkError)
        throw checkError
      }

      if (existingProduct) {
        toast({
          title: "Produto já existe",
          description: "Este produto já está no seu estoque. Use a opção 'Ajustar Estoque' para modificar a quantidade.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Log the data being inserted for debugging
      const insertData = {
        revendedor_id: revendedorId,
        pacote_id: selectedPacote.id,
        produto: selectedPacote.descricao,
        quantidade: quantidadeNum,
        preco: precoNum,
        status: quantidadeNum > 0 ? "Em estoque" : "Sem estoque",
      }
      
      console.log("Inserting data:", insertData)

      // Insert the product into revendedor_estoque
      const { data, error } = await supabase
        .from("revendedor_estoque")
        .insert(insertData)
        .select()

      console.log("Insert result:", { data, error })

      if (error) {
        console.error("Insert error details:", error)
        console.error("Error message:", error.message)
        console.error("Error code:", error.code)
        console.error("Error details:", error.details)
        throw error
      }

      console.log("Product added successfully:", data)

      // Close modal and refresh data
      toast({
        title: "Sucesso",
        description: "Produto adicionado ao estoque com sucesso!",
      })

      onOpenChange(false)
      onProductAdded()
    } catch (error) {
      console.error("Error adding product:", error)
      toast({
        title: "Erro ao adicionar produto",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao adicionar o produto.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center">
          <Package className="h-6 w-6 mr-2" />
          <div>
            <DialogTitle>Novo Produto</DialogTitle>
            <DialogDescription>Adicione um novo produto ao seu estoque</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="pacote">Nome do Pacote</Label>
            <Select onValueChange={handleSelectPacote}>
              <SelectTrigger id="pacote" className="w-full">
                <SelectValue placeholder="Selecione um pacote">
                  {selectedPacote && (
                    <div className="flex items-center">
                      <div
                        className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
                        style={{ backgroundColor: selectedPacote.cor || "#000000" }}
                      >
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <span>{selectedPacote.descricao}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Carregando pacotes...
                  </SelectItem>
                ) : pacotes.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Nenhum pacote disponível
                  </SelectItem>
                ) : (
                  pacotes.map((pacote) => (
                    <SelectItem key={pacote.id} value={pacote.id.toString()}>
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
                          style={{ backgroundColor: pacote.cor || "#000000" }}
                        >
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <span>{pacote.descricao}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPacote && (
            <>
              <div>
                <Label htmlFor="preco">Preço (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">R$</span>
                  <Input
                    id="preco"
                    type="number"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    min={selectedPacote?.preco || 0}
                    step="0.01"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Preço mínimo: R$ {selectedPacote.preco.toFixed(2)}</p>
              </div>

              <div>
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  min="0"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedPacote}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
