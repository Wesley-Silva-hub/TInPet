import { RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router'
import { Logo } from '../components/Logo'
import { Spinner } from '../components/ui/States'
import { isChunkLoadError, reloadForNewVersion } from '../lib/versionReload'

/** Tela para erros inesperados de rota; versão desatualizada do site se resolve sozinha. */
export function RouteError() {
  const error = useRouteError()
  const outdated = isChunkLoadError(error)
  const reloading = outdated && typeof window !== 'undefined'

  useEffect(() => {
    if (outdated) reloadForNewVersion()
  }, [outdated])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      {reloading ? (
        <>
          <Spinner className="size-8 text-brand-500" />
          <h1 className="text-2xl font-semibold">Atualizando para a versão mais nova…</h1>
          <p className="text-muted">O TinPet foi atualizado enquanto esta aba estava aberta.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Ops! Algo deu errado.</h1>
          <p className="text-muted">
            Tente recarregar a página. Se continuar, volte ao início e tente de novo em instantes.
          </p>
        </>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-500 px-5 font-semibold text-white"
        >
          <RefreshCw className="size-4" aria-hidden /> Recarregar
        </button>
        <Link
          to="/"
          reloadDocument
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-semibold"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
