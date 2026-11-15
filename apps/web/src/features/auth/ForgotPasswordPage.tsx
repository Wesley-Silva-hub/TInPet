import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, PASSWORD_RESET_TTL_MINUTES } from '@tinpet/shared'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { api, errorMessage } from '../../lib/api'
import { AuthLayout } from './AuthLayout'

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api('/auth/forgot-password', { method: 'POST', body: values })
      setSentTo(values.email)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  if (sentTo) {
    return (
      <AuthLayout title="Confira seu e-mail" subtitle="Quase lá!">
        <div className="flex flex-col items-center gap-4 text-center" role="status">
          <MailCheck className="size-12 text-brand-500" aria-hidden />
          <p>
            Se existir uma conta com <strong>{sentTo}</strong>, enviamos um link para criar uma
            senha nova. Ele vale {PASSWORD_RESET_TTL_MINUTES} minutos.
          </p>
          <p className="text-sm text-muted">Não chegou? Olhe a caixa de spam ou peça de novo.</p>
          <Button variant="secondary" onClick={() => setSentTo(null)}>
            Pedir outro link
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Esqueceu a senha?"
      subtitle="Sem problema: mandamos um link para você criar outra."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="E-mail da conta" error={errors.email?.message}>
          {(props) => (
            <input type="email" autoComplete="email" {...props} {...form.register('email')} />
          )}
        </Field>
        <Button type="submit" loading={isSubmitting} className="mt-2">
          Enviar link
        </Button>
      </form>
      <p className="mt-6 text-center text-muted">
        Lembrou?{' '}
        <Link to="/entrar" className="font-semibold text-brand-600 underline">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  )
}
