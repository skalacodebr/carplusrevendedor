"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search, SlidersHorizontal, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { AddProductModal } from "@/components/add-product-modal"
import { AdjustStockModal } from "@/components/adjust-stock-modal"
import { EditProductModal } from "@/components/edit-product-modal"
import { DeleteProductDialog } from "@/components/delete-product-dialog"

interface EstoqueItem {
  id: number
  produto: string
  quantidade: number
  status: string
  preco: number
  cor?: string
}

export default function EstoquePage() {
  const [estoque, setEstoque] = useState<EstoqueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false)
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<EstoqueItem | null>(null)
  const router = useRouter()

  const fetchEstoque = async () => {
    try {
      setIsLoading(true)
      // Get the revendedor ID from localStorage
      const userId = localStorage.getItem("userId")

      if (!userId) {
        console.error("User ID not found in localStorage")
        router.push("/")
        return
      }

      // First, get the revendedor_id from the revendedores table
      const { data: revendedorData, error: revendedorError } = await supabase
        .from("revendedores")
        .select("id")
        .eq("usuario_id", userId)
        .single()

      if (revendedorError || !revendedorData) {
        console.error("Error fetching revendedor data:", revendedorError)
        return
      }

      const revendedorId = revendedorData.id

      // Now fetch the estoque data for this revendedor
      const { data: estoqueData, error } = await supabase
        .from("revendedor_estoque")
        .select("*")
        .eq("revendedor_id", revendedorId)

      if (error) {
        console.error("Error fetching estoque:", error)
        return
      }

      // For each product in estoque, get the color from pacotes table
      const estoqueWithColors = await Promise.all(
        (estoqueData || []).map(async (item) => {
          // Get the color for this product from pacotes table
          const { data: pacoteData } = await supabase
            .from("pacotes")
            .select("cor")
            .eq("descricao", item.produto)
            .limit(1)
            .single()

          return {
            ...item,
            cor: pacoteData?.cor || "#000000", // Default to black if no color found
          }
        }),
      )

      setEstoque(estoqueWithColors)
    } catch (error) {
      console.error("Error in fetchEstoque:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEstoque()
  }, [router])

  // Filter estoque based on search term
  const filteredEstoque = estoque.filter((item) => {
    // If search term is empty, show all products
    if (!searchTerm) return true

    // Check if search term matches product name
    if (item.produto.toLowerCase().includes(searchTerm.toLowerCase())) return true

    // Check if search term matches status
    if (item.status && item.status.toLowerCase().includes(searchTerm.toLowerCase())) return true

    return false
  })

  // Determine status display
  const getStatusDisplay = (status: string, quantidade: number) => {
    if (status) return status

    // Fallback to quantity-based status if status field is empty
    if (quantidade <= 0) return "Sem estoque"
    if (quantidade <= 20) return "Estoque baixo"
    return "Em estoque"
  }

  // Determine badge variant based on status
  const getStatusVariant = (status: string, quantidade: number) => {
    if (status) {
      if (status.toLowerCase().includes("sem")) return "destructive"
      if (status.toLowerCase().includes("baixo")) return "warning"
      return "default"
    }

    // Fallback to quantity-based variant if status field is empty
    if (quantidade <= 0) return "destructive"
    if (quantidade <= 20) return "warning"
    return "default"
  }

  const handleAddProduct = () => {
    setIsAddModalOpen(true)
  }

  const handleAdjustStock = (product: EstoqueItem) => {
    setSelectedProduct(product)
    setIsAdjustStockModalOpen(true)
  }

  const handleEditProduct = (product: EstoqueItem) => {
    setSelectedProduct(product)
    setIsEditProductModalOpen(true)
  }

  const handleDeleteProduct = (product: EstoqueItem) => {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Estoque</h2>
        <Button onClick={handleAddProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Produto
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar produtos..."
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
              <DropdownMenuItem onClick={() => setSearchTerm("")}>Todos os produtos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("Em estoque")}>Em estoque</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("Estoque baixo")}>Estoque baixo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("Sem estoque")}>Sem estoque</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando estoque...</p>
        </div>
      ) : estoque.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-full bg-background p-3 mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sem estoque disponível no momento</h3>
            <CardDescription className="mb-6">
              Adicione seus produtos para começar a gerenciar seu estoque
            </CardDescription>
            <Button onClick={handleAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Produto</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstoque.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded-full mr-3 flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: item.cor || "#000000" }}
                        >
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <span>{item.produto}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">R$ {item.preco.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(item.status, item.quantidade)}>
                        {getStatusDisplay(item.status, item.quantidade)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditProduct(item)}>Editar produto</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAdjustStock(item)}>Ajustar estoque</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProduct(item)}>
                            Excluir produto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end space-x-2 py-4">
            <Button variant="outline" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button variant="outline" size="sm">
              Próximo
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Modals */}
      <AddProductModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} onProductAdded={fetchEstoque} />

      <AdjustStockModal
        open={isAdjustStockModalOpen}
        onOpenChange={setIsAdjustStockModalOpen}
        onStockAdjusted={fetchEstoque}
        product={selectedProduct}
      />

      <EditProductModal
        open={isEditProductModalOpen}
        onOpenChange={setIsEditProductModalOpen}
        onProductEdited={fetchEstoque}
        product={selectedProduct}
      />

      <DeleteProductDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onProductDeleted={fetchEstoque}
        product={selectedProduct}
      />
    </div>
  )
}
