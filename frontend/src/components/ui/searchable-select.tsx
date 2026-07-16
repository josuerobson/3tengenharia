// src/components/ui/searchable-select.tsx
// Select com campo de busca embutido — para listas longas (dezenas de opções)
// onde um <select> nativo fica difícil de navegar. Sem dependência externa.

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
}

export interface SearchableSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado.',
  required,
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Fecha com Esc, foca a busca ao abrir
  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus()
      return
    }
    setSearch('')
  }, [open])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input escondido só para validação HTML nativa (required) */}
      {required && (
        <input tabIndex={-1} value={value} onChange={() => {}} required
          className="absolute w-0 h-0 opacity-0 pointer-events-none" aria-hidden="true" />
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex items-center justify-between w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-left',
          'focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150',
          disabled && 'opacity-60 cursor-not-allowed bg-gray-50',
          className,
        )}
      >
        <span className={cn('truncate', selected ? 'text-gray-900' : 'text-gray-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={cn('text-gray-400 flex-shrink-0 ml-2 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-gray-200 shadow-dropdown overflow-hidden animate-slide-down">
          <div className="relative p-2 border-b border-gray-100">
            <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
              placeholder={searchPlaceholder}
              className="w-full h-9 pl-8 pr-7 text-sm rounded-lg border border-gray-200 bg-white outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto scrollbar-thin py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3.5 py-3 text-sm text-gray-400 text-center">{emptyMessage}</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex items-center w-full px-3.5 py-2.5 text-sm text-left transition-colors',
                    option.value === value
                      ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
