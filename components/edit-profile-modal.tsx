"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2 } from "lucide-react"
import { supabase, hashPassword } from "@/lib/supabase"
import { toast } from "sonner"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onProfileUpdate: () => void
}

interface ProfileData {
  nome: string
  sobrenome: string
  email: string
  foto: string | null
  loja: string
  chave_pix: string
  chave_tipo: string
}

export function EditProfileModal({ isOpen, onClose, onProfileUpdate }: EditProfileModalProps) {
  const [profileData, setProfileData] = useState<ProfileData>({
    nome: "",
    sobrenome: "",
    email: "",
    foto: null,
    loja: "",
    chave_pix: "",
    chave_tipo: ""
  })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadProfileData()
    }
  }, [isOpen])

  const loadProfileData = async () => {
    try {
      setIsLoadingData(true)
      const userId = localStorage.getItem("userId")
      
      if (!userId) {
        toast.error("Usuário não encontrado")
        return
      }

      // Buscar dados do usuário
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("nome, sobrenome, email, foto")
        .eq("id", userId)
        .single()

      if (userError) {
        throw userError
      }

      // Buscar dados do revendedor
      const { data: revendedorData, error: revendedorError } = await supabase
        .from("revendedores")
        .select("loja, chave_pix, chave_tipo")
        .eq("usuario_id", userId)
        .single()

      if (revendedorError) {
        throw revendedorError
      }

      setProfileData({
        nome: userData.nome || "",
        sobrenome: userData.sobrenome || "",
        email: userData.email || "",
        foto: userData.foto,
        loja: revendedorData.loja || "",
        chave_pix: revendedorData.chave_pix || "",
        chave_tipo: revendedorData.chave_tipo || ""
      })
    } catch (error) {
      console.error("Erro ao carregar dados do perfil:", error)
      toast.error("Erro ao carregar dados do perfil")
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingImage(true)
      
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione apenas arquivos de imagem")
        return
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB")
        return
      }

      const userId = localStorage.getItem("userId")
      if (!userId) {
        toast.error("Usuário não encontrado")
        return
      }

      // Se já existe uma foto anterior no storage, remover
      if (profileData.foto && profileData.foto.includes('supabase')) {
        try {
          const oldUrl = new URL(profileData.foto)
          const oldPath = decodeURIComponent(oldUrl.pathname.split('/storage/v1/object/public/images/')[1])
          if (oldPath) {
            console.log("Removendo imagem anterior:", oldPath)
            await supabase.storage.from('images').remove([oldPath])
          }
        } catch (error) {
          console.log("Erro ao remover imagem anterior:", error)
        }
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}_${Date.now()}.${fileExt}`
      const filePath = `perfil_images/${fileName}`

      console.log("Iniciando upload:", { filePath, fileSize: file.size, fileType: file.type })

      // Primeiro, tentar criar um arquivo de teste para verificar permissões
      try {
        const testPath = `test_${Date.now()}.txt`
        const testFile = new Blob(['test'], { type: 'text/plain' })
        
        const { error: testError } = await supabase.storage
          .from('images')
          .upload(testPath, testFile)
          
        if (testError) {
          console.log("Teste de permissão falhou:", testError)
          throw new Error("Permissões insuficientes")
        }
        
        // Remover arquivo de teste
        await supabase.storage.from('images').remove([testPath])
        console.log("Teste de permissão passou!")
        
      } catch (testError) {
        console.log("Políticas RLS não configuradas corretamente. Usando fallback para base64.")
        
        // Fallback para base64
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64String = e.target?.result as string
          setProfileData(prev => ({
            ...prev,
            foto: base64String
          }))
          toast.success("Imagem carregada (usando armazenamento local)")
        }
        reader.readAsDataURL(file)
        return
      }

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      console.log("Resultado do upload:", { data, error })

      if (error) {
        console.error("Erro no upload:", error)
        
        // Se arquivo já existe, tentar com upsert
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log("Arquivo já existe, tentando com upsert...")
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from('images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            })
          
          if (retryError) {
            console.error("Erro no retry:", retryError)
            toast.error(`Erro no upload: ${retryError.message}`)
            return
          }
          
          console.log("Upload realizado com sucesso no retry")
        } else {
          // Fallback para base64 se o upload falhar
          console.log("Upload falhou, usando fallback base64")
          const reader = new FileReader()
          reader.onload = (e) => {
            const base64String = e.target?.result as string
            setProfileData(prev => ({
              ...prev,
              foto: base64String
            }))
            toast.success("Imagem carregada (modo alternativo)")
          }
          reader.readAsDataURL(file)
          return
        }
      }

      // Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      console.log("URL pública gerada:", publicUrl)

      // Atualizar estado com a nova URL
      setProfileData(prev => ({
        ...prev,
        foto: publicUrl
      }))

      toast.success("Imagem carregada com sucesso!")

    } catch (error) {
      console.error("Erro geral ao carregar imagem:", error)
      toast.error("Erro ao carregar imagem")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }

    if (newPassword && newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres")
      return
    }

    // Validar chave PIX se informada
    if (profileData.chave_pix && profileData.chave_tipo) {
      if (!validatePixKey(profileData.chave_tipo, profileData.chave_pix)) {
        toast.error("Chave PIX inválida para o tipo selecionado")
        return
      }
    }

    // Se informou chave PIX mas não selecionou o tipo
    if (profileData.chave_pix && !profileData.chave_tipo) {
      toast.error("Selecione o tipo da chave PIX")
      return
    }

    try {
      setIsLoading(true)
      const userId = localStorage.getItem("userId")
      
      if (!userId) {
        toast.error("Usuário não encontrado")
        return
      }

      // Atualizar dados do usuário
      const userUpdateData: any = {
        nome: profileData.nome,
        sobrenome: profileData.sobrenome,
        email: profileData.email,
        foto: profileData.foto
      }

      // Se há nova senha, incluir no update
      if (newPassword) {
        userUpdateData.senha = await hashPassword(newPassword)
      }

      const { error: userError } = await supabase
        .from("usuarios")
        .update(userUpdateData)
        .eq("id", userId)

      if (userError) {
        throw userError
      }

      // Atualizar dados do revendedor
      const { error: revendedorError } = await supabase
        .from("revendedores")
        .update({
          loja: profileData.loja,
          chave_pix: profileData.chave_pix,
          chave_tipo: profileData.chave_tipo
        })
        .eq("usuario_id", userId)

      if (revendedorError) {
        throw revendedorError
      }

      toast.success("Perfil atualizado com sucesso!")
      onProfileUpdate()
      onClose()
      
      // Limpar campos de senha
      setNewPassword("")
      setConfirmPassword("")
      
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      toast.error("Erro ao atualizar perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = () => {
    const nome = profileData.nome || ""
    const sobrenome = profileData.sobrenome || ""
    
    if (!nome && !sobrenome) return "??"
    
    return (nome.charAt(0) + sobrenome.charAt(0)).toUpperCase()
  }

  const validatePixKey = (tipo: string, chave: string): boolean => {
    if (!chave) return true // Campos opcionais
    
    switch (tipo) {
      case "cpf":
        // Remove formatação e valida CPF
        const cpf = chave.replace(/\D/g, "")
        return cpf.length === 11
      case "cnpj":
        // Remove formatação e valida CNPJ
        const cnpj = chave.replace(/\D/g, "")
        return cnpj.length === 14
      case "email":
        // Validação básica de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(chave)
      case "telefone":
        // Remove formatação e valida telefone
        const telefone = chave.replace(/\D/g, "")
        return telefone.length >= 10 && telefone.length <= 11
      case "aleatoria":
        // Chave aleatória deve ter 32 caracteres (formato UUID sem hífens) ou formato com hífens
        return chave.length === 32 || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)
      default:
        return true
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando dados...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Foto do Perfil */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {profileData.foto ? (
                    <AvatarImage src={profileData.foto} alt="Foto do perfil" />
                  ) : (
                    <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                  )}
                </Avatar>
                <label
                  htmlFor="photo-upload"
                  className={`absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors ${
                    isUploadingImage ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                </label>
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {isUploadingImage 
                  ? "Fazendo upload da imagem..." 
                  : "Clique no ícone da câmera para alterar a foto"
                }
              </p>
            </div>

            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados Pessoais</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={profileData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <Label htmlFor="sobrenome">Sobrenome</Label>
                  <Input
                    id="sobrenome"
                    value={profileData.sobrenome}
                    onChange={(e) => handleInputChange("sobrenome", e.target.value)}
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="loja">Nome da Loja</Label>
                <Input
                  id="loja"
                  value={profileData.loja}
                  onChange={(e) => handleInputChange("loja", e.target.value)}
                  placeholder="Nome da sua loja"
                />
              </div>
            </div>

            {/* Dados PIX */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados PIX</h3>
              
              <div>
                <Label htmlFor="chave_tipo">Tipo de Chave PIX</Label>
                <Select
                  value={profileData.chave_tipo}
                  onValueChange={(value) => handleInputChange("chave_tipo", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de chave PIX" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="chave_pix">Chave PIX</Label>
                <Input
                  id="chave_pix"
                  value={profileData.chave_pix}
                  onChange={(e) => handleInputChange("chave_pix", e.target.value)}
                  placeholder={
                    profileData.chave_tipo === "cpf" ? "000.000.000-00" :
                    profileData.chave_tipo === "cnpj" ? "00.000.000/0000-00" :
                    profileData.chave_tipo === "email" ? "seu@email.com" :
                    profileData.chave_tipo === "telefone" ? "(00) 00000-0000" :
                    profileData.chave_tipo === "aleatoria" ? "Chave aleatória gerada pelo banco" :
                    "Digite sua chave PIX"
                  }
                />
              </div>
            </div>


            {/* Alterar Senha */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Alterar Senha (Opcional)</h3>
              
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}