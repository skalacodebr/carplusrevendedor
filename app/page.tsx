import { redirect } from "next/navigation"
import LoginForm from "@/components/login-form"

export default function Home() {
  // Na implementação real, verificaria se o usuário está autenticado
  // e redirecionaria para o dashboard se estivesse
  const isAuthenticated = false

  if (isAuthenticated) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <LoginForm />
      </div>
    </div>
  )
}
