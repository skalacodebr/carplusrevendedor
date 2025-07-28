import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function RecentSales() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg" alt="Avatar" />
          <AvatarFallback>JM</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">João Martins</p>
          <p className="text-sm text-muted-foreground">joao.martins@example.com</p>
        </div>
        <div className="ml-auto font-medium">+R$1.999,00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="flex h-9 w-9 items-center justify-center space-y-0 border">
          <AvatarImage src="/placeholder.svg" alt="Avatar" />
          <AvatarFallback>AS</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Ana Silva</p>
          <p className="text-sm text-muted-foreground">ana.silva@example.com</p>
        </div>
        <div className="ml-auto font-medium">+R$3.499,00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg" alt="Avatar" />
          <AvatarFallback>RP</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Roberto Pereira</p>
          <p className="text-sm text-muted-foreground">roberto.pereira@example.com</p>
        </div>
        <div className="ml-auto font-medium">+R$2.499,00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg" alt="Avatar" />
          <AvatarFallback>CL</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Carla Lima</p>
          <p className="text-sm text-muted-foreground">carla.lima@example.com</p>
        </div>
        <div className="ml-auto font-medium">+R$899,00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg" alt="Avatar" />
          <AvatarFallback>MO</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Marcos Oliveira</p>
          <p className="text-sm text-muted-foreground">marcos.oliveira@example.com</p>
        </div>
        <div className="ml-auto font-medium">+R$1.299,00</div>
      </div>
    </div>
  )
}
