import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@tinpet/shared'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { errorMessage } from '../../lib/api'
import { homePathFor, useAuth } from '../../lib/auth'
import { AuthLayout } from './AuthLayout'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await login(values)
      navigate(from ?? homePathFor(user), { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

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
