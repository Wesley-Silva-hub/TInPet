import { zodResolver } from '@hookform/resolvers/zod'
import { passwordSchema } from '@tinpet/shared'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { ApiError, api, applySession, errorMessage } from '../../lib/api'
import { AuthLayout } from './AuthLayout'

const formSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    message: 'As senhas não são iguais',
    path: ['confirm'],
  })

export function ResetPasswordPage() {
  const { token } = useParams() as { token: string }
  const navigate = useNavigate()
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } })
      // A troca derruba todas as sessões, inclusive a deste navegador
      applySession(null)
      toast.success('Senha nova criada! Entre com ela.')
      navigate('/entrar', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESET_TOKEN') {
        form.setError('password', { message: error.message })
      } else {
        toast.error(errorMessage(error))
      }
    }
  })

  return (
    <AuthLayout title="Crie uma senha nova" subtitle="Ao salvar, você sai de todos os aparelhos.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Senha nova" error={errors.password?.message} hint="Pelo menos 8 caracteres">
          {(props) => (
            <input
              type="password"
              autoComplete="new-password"
              {...props}
              {...form.register('password')}
            />
          )}
        </Field>
        <Field label="Repita a senha" error={errors.confirm?.message}>
          {(props) => (
            <input
              type="password"
              autoComplete="new-password"
              {...props}
              {...form.register('confirm')}
            />
          )}
        </Field>
        <Button type="submit" loading={isSubmitting} className="mt-2">
          Salvar senha nova
        </Button>
      </form>
      <p className="mt-6 text-center text-muted">
        Link vencido?{' '}
        <Link to="/esqueci-senha" className="font-semibold text-brand-600 underline">
          Peça outro
        </Link>
      </p>
    </AuthLayout>
  )
}
