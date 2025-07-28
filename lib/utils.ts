import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para capitalizar a primeira letra de cada palavra
export function capitalize(str: string): string {
  if (!str) return str
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Modificar a função capitalizeStatus para substituir underscores por espaços
export function capitalizeStatus(status: string): string {
  if (!status) return status

  // Substituir underscores por espaços
  const formattedStatus = status.replace(/_/g, " ")

  // Casos especiais
  const specialCases: { [key: string]: string } = {
    pix: "PIX",
    cpf: "CPF",
    cnpj: "CNPJ",
    rg: "RG",
  }

  const lowercaseStatus = formattedStatus.toLowerCase()
  if (specialCases[lowercaseStatus]) {
    return specialCases[lowercaseStatus]
  }

  return capitalize(formattedStatus)
}
