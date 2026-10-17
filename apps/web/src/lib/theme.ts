export type ThemePreference = 'system' | 'light' | 'dark'

const KEY = 'tinpet:tema'

/** Preferência salva neste navegador (padrão: seguir o sistema). */
export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/** Aplica na hora (atributo data-theme no <html>) e lembra para as próximas visitas. */
export function setThemePreference(preference: ThemePreference) {
  const root = document.documentElement
  if (preference === 'system') delete root.dataset.theme
  else root.dataset.theme = preference
  try {
    if (preference === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, preference)
  } catch {
    // Sem armazenamento: vale só para esta visita
  }
}
