// src/lib/utils.ts
// Utility para mesclar classes Tailwind sem conflitos de prioridade.

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
