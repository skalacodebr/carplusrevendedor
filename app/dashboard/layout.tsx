"use client"

import type React from "react"
import { useEffect, useState } from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Package, ShoppingCart, LayoutDashboard, LogOut, Truck, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { EditProfileModal } from "@/components/edit-profile-modal"

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
  isActive: boolean
}

function NavItem({ href, label, icon, isActive }: NavItemProps) {
  return (
    <Link href={href}>
      <Button 
        variant={isActive ? "default" : "ghost"} 
        className={`w-full justify-start gap-2 py-1.5 ${
          isActive 
            ? "bg-carplus text-black hover:bg-carplus-dark" 
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
        size="sm"
      >
        {icon}
        {label}
      </Button>
    </Link>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileRefreshTrigger, setProfileRefreshTrigger] = useState(0)

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")

    // Redirect to login page
    router.push("/")
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: "/dashboard/estoque",
      label: "Estoque",
      icon: <Package className="h-5 w-5" />,
    },
    {
      href: "/dashboard/pedidos",
      label: "Novos Pedidos",
      icon: <ShoppingCart className="h-5 w-5" />,
    },
    {
      href: "/dashboard/em-andamento",
      label: "Em Andamento",
      icon: <Truck className="h-5 w-5" />,
    },
    {
      href: "/dashboard/finalizados",
      label: "Finalizados",
      icon: <CheckCircle className="h-5 w-5" />,
    },
  ]

  function UserProfileSection() {
    const [revendedorData, setRevendedorData] = useState<{
      email: string
      foto: string | null
      loja: string
    } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    async function fetchRevendedorData() {
      try {
        // Get the user ID from localStorage
        const userId = localStorage.getItem("userId")

        if (!userId) {
          console.error("No user ID found in localStorage")
          router.push("/") // Redirect to login if no user ID found
          return
        }

        // Get user email and photo from usuarios table
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("email, foto")
          .eq("id", userId)
          .single()

        if (userError) {
          console.error("Error fetching user data:", userError)
          return
        }

        // Get store name (loja) from revendedores table
        const { data: revendedorInfo, error: revendedorError } = await supabase
          .from("revendedores")
          .select("loja")
          .eq("usuario_id", userId)
          .single()

        if (revendedorError) {
          console.error("Error fetching revendedor data:", revendedorError)
          return
        }

        // Combine the data
        setRevendedorData({
          email: userData.email,
          foto: userData.foto,
          loja: revendedorInfo.loja || "Loja sem nome",
        })
      } catch (error) {
        console.error("Error fetching revendedor data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    useEffect(() => {
      fetchRevendedorData()
    }, [profileRefreshTrigger])

    // Get initials for avatar fallback from store name
    const getInitials = () => {
      if (!revendedorData?.loja) return "??"

      // Split the store name by spaces and get the first letter of each word (up to 2)
      const words = revendedorData.loja.split(" ")
      if (words.length === 1) {
        // If only one word, take the first two letters
        return words[0].substring(0, 2).toUpperCase()
      } else {
        // Otherwise take the first letter of the first two words
        return (words[0][0] + words[Math.min(1, words.length - 1)][0]).toUpperCase()
      }
    }

    if (isLoading) {
      return (
        <div className="flex items-center gap-3 mb-4 px-2 py-1">
          <Avatar>
            <AvatarFallback>...</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Carregando...</span>
            <span className="text-xs text-muted-foreground">...</span>
          </div>
        </div>
      )
    }

    return (
      <div 
        className="flex items-center gap-3 mb-4 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
        onClick={() => setIsProfileModalOpen(true)}
        title="Clique para editar perfil"
      >
        <Avatar>
          {revendedorData?.foto ? (
            <AvatarImage src={revendedorData.foto || "/placeholder.svg"} alt={`Logo de ${revendedorData.loja}`} />
          ) : (
            <AvatarFallback>{getInitials()}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{revendedorData?.loja || "Loja sem nome"}</span>
          <span className="text-xs text-muted-foreground">{revendedorData?.email || "sem email"}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar fixa para todos os dispositivos */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-20 items-center justify-center border-b border-sidebar-border bg-sidebar-accent">
          <Link href="/dashboard" className="flex items-center justify-center">
            <img src="/images/car-plus-logo.png" alt="Car+ Balanceamento Automático" className="h-12 w-auto" />
          </Link>
        </div>
        <nav className="grid gap-0 p-2 mt-2">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <UserProfileSection />
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" 
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1">{children}</main>

      {/* Modal de Perfil */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdate={() => {
          setProfileRefreshTrigger(prev => prev + 1)
        }}
      />
    </div>
  )
}
