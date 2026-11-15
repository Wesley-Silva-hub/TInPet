import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type Me } from '@tinpet/shared'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { ApiError, errorMessage } from '../../lib/api'
import { homePathFor, useAuth } from '../../lib/auth'
import { AuthLayout } from './AuthLayout'

/** Segunda etapa: código do app autenticador ou um código de recuperação. */
function MfaStep({
  mfaToken,
  onDone,
  onBack,
}: {
  mfaToken: string
  onDone: (user: Me) => void
  onBack: () => void
}) {
  const { completeMfa } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [useRecovery, setUseRecovery] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      onDone(await completeMfa(mfaToken, code.trim()))
    } catch (cause) {
      // Token da 2ª etapa vencido (5 min): volta para a senha
      if (cause instanceof ApiError && cause.code === 'UNAUTHORIZED') {
        toast.error(cause.message)
        onBack()
        return
      }
      setError(errorMessage(cause))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Verificação em duas etapas"
      subtitle={
        useRecovery
          ? 'Digite um dos códigos de recuperação que você guardou.'
          : 'Abra o app autenticador e digite o código de 6 dígitos do TinPet.'
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field
          label={useRecovery ? 'Código de recuperação' : 'Código do app'}
          error={error ?? undefined}
        >
          {(props) => (
            <input
              {...props}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode={useRecovery ? 'text' : 'numeric'}
              maxLength={useRecovery ? 11 : 6}
              placeholder={useRecovery ? 'XXXXX-XXXXX' : '123456'}
              // biome-ignore lint/a11y/noAutofocus: a página só existe para digitar este código
              autoFocus
            />
          )}
        </Field>
        <Button type="submit" loading={loading} disabled={code.trim().length < 6}>
          <ShieldCheck className="size-4" aria-hidden /> Confirmar
        </Button>
      </form>
      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setUseRecovery(!useRecovery)
            setCode('')
            setError(null)
          }}
          className="font-semibold text-brand-600 underline"
        >
          {useRecovery ? 'Usar o código do app' : 'Perdi o celular: usar código de recuperação'}
        </button>
        <button type="button" onClick={onBack} className="text-muted underline">
          Voltar
        </button>
      </div>
    </AuthLayout>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState
  const enter = (user: Me) => navigate(from ?? homePathFor(user), { replace: true })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await login(values)
      if ('mfaToken' in result) setMfaToken(result.mfaToken)
      else enter(result.user)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  if (mfaToken) {
    return <MfaStep mfaToken={mfaToken} onDone={enter} onBack={() => setMfaToken(null)} />
  }

  return (
    <AuthLayout title="Que bom te ver!" subtitle="Entre para ver quem quer conhecer seu pet.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="E-mail" error={errors.email?.message}>
          {(props) => (
            <input type="email" autoComplete="email" {...props} {...form.register('email')} />
          )}
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          {(props) => (
            <input
              type="password"
              autoComplete="current-password"
              {...props}
              {...form.register('password')}
            />
          )}
        </Field>
        <Link
          to="/esqueci-senha"
          className="-mt-2 self-end text-sm font-semibold text-brand-600 underline"
        >
          Esqueci minha senha
        </Link>
        <Button type="submit" loading={isSubmitting} className="mt-2">
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-center text-muted">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-semibold text-brand-600 underline">
          Cadastre-se
        </Link>
      </p>
    </AuthLayout>
  )
}
