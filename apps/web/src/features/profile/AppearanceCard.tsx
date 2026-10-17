import { Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { getThemePreference, setThemePreference, type ThemePreference } from '../../lib/theme'

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
]

/** Tema claro/escuro, aplicado na hora e lembrado neste aparelho. */
export function AppearanceCard() {
  const [theme, setTheme] = useState(getThemePreference)

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">Aparência</h2>
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="sr-only">Tema</legend>
        {options.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-sm font-semibold transition has-focus-visible:outline-3 has-focus-visible:outline-brand-400 ${
              theme === value
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-line hover:bg-surface-2'
            }`}
          >
            <input
              type="radio"
              name="tema"
              value={value}
              checked={theme === value}
              onChange={() => {
                setTheme(value)
                setThemePreference(value)
              }}
              className="sr-only"
            />
            <Icon className="size-6" aria-hidden />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="text-sm text-muted">“Sistema” acompanha o modo claro/escuro do seu aparelho.</p>
    </section>
  )
}
