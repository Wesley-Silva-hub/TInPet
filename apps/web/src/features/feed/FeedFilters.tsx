import { type PetSize, petSizes, sizeLabels } from '@tinpet/shared'
import { SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui/Button'

export interface FeedFilters {
  maxDistanceKm: number
  sizes: PetSize[]
  minAge: number | null
  maxAge: number | null
}

export const DEFAULT_FILTERS: FeedFilters = {
  maxDistanceKm: 50,
  sizes: [],
  minAge: null,
  maxAge: null,
}

const storageKey = (petId: string) => `tinpet:filtros:${petId}`

/** Filtros lembrados por pet (preferência local; segue sem eles se o armazenamento falhar). */
export function loadFilters(petId: string): FeedFilters {
  try {
    const saved = JSON.parse(
      localStorage.getItem(storageKey(petId)) ?? 'null',
    ) as Partial<FeedFilters> | null
    return { ...DEFAULT_FILTERS, ...saved }
  } catch {
    return DEFAULT_FILTERS
  }
}

export function saveFilters(petId: string, filters: FeedFilters) {
  try {
    localStorage.setItem(storageKey(petId), JSON.stringify(filters))
  } catch {
    // Preferência opcional
  }
}

/** Quantos filtros diferem do padrão (para o contador do botão). */
export function activeFilterCount(filters: FeedFilters) {
  return (
    Number(filters.maxDistanceKm !== DEFAULT_FILTERS.maxDistanceKm) +
    Number(filters.sizes.length > 0) +
    Number(filters.minAge !== null || filters.maxAge !== null)
  )
}

/** Converte para os parâmetros da API do feed. */
export function filtersToQuery(filters: FeedFilters) {
  return {
    maxDistanceKm: filters.maxDistanceKm,
    sizes: filters.sizes.length > 0 ? filters.sizes.join(',') : undefined,
    minAge: filters.minAge ?? undefined,
    maxAge: filters.maxAge ?? undefined,
  }
}

const distances = [5, 10, 25, 50, 100, 200]
const ages = Array.from({ length: 16 }, (_, index) => index)

interface FiltersSheetProps {
  open: boolean
  value: FeedFilters
  onClose: () => void
  onApply: (filters: FeedFilters) => void
}

export function FiltersSheet({ open, value, onClose, onApply }: FiltersSheetProps) {
  const [draft, setDraft] = useState(value)
  const titleId = useId()
  const minId = useId()
  const maxId = useId()

  useEffect(() => {
    if (!open) return
    setDraft(value)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, value, onClose])

  const toggleSize = (size: PetSize) =>
    setDraft((current) => ({
      ...current,
      sizes: current.sizes.includes(size)
        ? current.sizes.filter((item) => item !== size)
        : [...current.sizes, size],
    }))

  const ageSelect = (id: string, label: string, field: 'minAge' | 'maxAge') => (
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={draft[field] ?? ''}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            [field]: event.target.value === '' ? null : Number(event.target.value),
          }))
        }
        className="rounded-2xl border border-line bg-surface px-4 py-3"
      >
        <option value="">Qualquer</option>
        {ages.map((age) => (
          <option key={age} value={age}>
            {age === 0 ? 'Menos de 1 ano' : `${age} ${age === 1 ? 'ano' : 'anos'}`}
          </option>
        ))}
      </select>
    </div>
  )

  const invalidAge = draft.minAge !== null && draft.maxAge !== null && draft.minAge > draft.maxAge

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex w-full max-w-lg flex-col gap-6 rounded-t-[2rem] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[2rem]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between">
              <h2 id={titleId} className="text-xl font-semibold">
                Filtros
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-full p-2 hover:bg-surface-2"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold">Distância máxima</legend>
              <div className="flex flex-wrap gap-2">
                {distances.map((km) => (
                  <button
                    key={km}
                    type="button"
                    aria-pressed={draft.maxDistanceKm === km}
                    onClick={() => setDraft((current) => ({ ...current, maxDistanceKm: km }))}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      draft.maxDistanceKm === km
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-2 hover:bg-brand-100'
                    }`}
                  >
                    até {km} km
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold">Porte (vazio = todos)</legend>
              <div className="flex flex-wrap gap-2">
                {petSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={draft.sizes.includes(size)}
                    onClick={() => toggleSize(size)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      draft.sizes.includes(size)
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-2 hover:bg-brand-100'
                    }`}
                  >
                    {sizeLabels[size]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                {ageSelect(minId, 'Idade mínima', 'minAge')}
                {ageSelect(maxId, 'Idade máxima', 'maxAge')}
              </div>
              {invalidAge && (
                <p className="text-sm text-brand-700" role="alert">
                  A idade mínima precisa ser menor que a máxima.
                </p>
              )}
              <p className="text-xs text-muted">
                Pets sem data de nascimento não aparecem quando há filtro de idade.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setDraft(DEFAULT_FILTERS)}>
                Limpar
              </Button>
              <Button
                className="flex-1"
                disabled={invalidAge}
                onClick={() => {
                  onApply(draft)
                  onClose()
                }}
              >
                Aplicar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function FiltersButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-sm hover:bg-surface-2"
    >
      <SlidersHorizontal className="size-4" aria-hidden /> Filtros
      {count > 0 && (
        <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
          {count}
          <span className="sr-only"> ativos</span>
        </span>
      )}
    </button>
  )
}
