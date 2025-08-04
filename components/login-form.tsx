"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase, hashPassword } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Hash the password with SHA-256
      const hashedPassword = await hashPassword(password)

      // First, check if user exists with this email and is a revendedor
      const { data: usuarios, error: userError } = await supabase
        .from("usuarios")
        .select("id, email, senha, tipo")
        .eq("email", email)
        .eq("tipo", "revendedor")
        .single()

      if (userError || !usuarios) {
        throw new Error("Usuário não encontrado ou não é um revendedor")
      }

      // Verify password
      if (usuarios.senha !== hashedPassword) {
        throw new Error("Credenciais inválidas")
      }

      // Check if revendedor status is active
      const { data: revendedor, error: revendedorError } = await supabase
        .from("revendedores")
        .select("status")
        .eq("usuario_id", usuarios.id)
        .single()

      if (revendedorError || !revendedor) {
        throw new Error("Perfil de revendedor não encontrado")
      }

      if (!revendedor.status) {
        throw new Error("Sua conta de revendedor está inativa. Entre em contato com o suporte.")
      }

      // Store user email in localStorage
      localStorage.setItem("userEmail", email)
      localStorage.setItem("userId", usuarios.id)

      // If all checks pass, redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Erro no login:", error)
      setError(error instanceof Error ? error.message : "Erro ao fazer login. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-6">
          <img src="/images/car-plus-logo.png" alt="Car+ Balanceamento Automático" className="h-16 w-auto" />
        </div>
        <CardTitle className="text-2xl text-center">Login de Revendedor</CardTitle>
        <CardDescription className="text-center">Entre com suas credenciais para acessar o painel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end mt-1">
            <a href="#" className="text-sm text-primary hover:underline">
              Esqueceu a senha?
            </a>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-gray-500">
          <span>Não tem uma conta? </span>
          <a href="#" className="text-primary hover:underline">
            Entre em contato com o suporte
          </a>
        </div>
      </CardFooter>
    </Card>
  )
}
