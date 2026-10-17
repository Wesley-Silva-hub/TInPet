import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@tinpet/shared'
import { Building2, PawPrint } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { errorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { AuthLayout } from './AuthLayout'

const emptyToNull = (value: string) => (value.trim() === '' ? null : value)

export function RegisterPage() {
  const { register: signUp } = useAuth()
  const navigate = useNavigate()
  const form = useForm({
    resolver: zodResolver(registerSchema),
    // Campos da empresa somem dos valores quando o papel é "dono de pet"
    shouldUnregister: true,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      birthDate: '',
      role: 'OWNER' as const,
      acceptTerms: false as unknown as true,
      acceptLocation: false,
    },
  })
  const { errors, isSubmitting } = form.formState
  const role = form.watch('role')

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await signUp(values)
      navigate(user.role === 'COMPANY' ? '/empresa' : '/onboarding', { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  const roleOption = (value: 'OWNER' | 'COMPANY', label: string, Icon: typeof PawPrint) => (
    <label
      className={`flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center font-semibold transition has-focus-visible:outline-3 has-focus-visible:outline-brand-400 ${
        role === value
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-surface-2 dark:text-brand-400'
          : 'border-line bg-surface'
      }`}
    >
      <input type="radio" value={value} className="sr-only" {...form.register('role')} />
      <Icon className="size-7" aria-hidden />
      {label}
    </label>
  )

  return (
    <AuthLayout title="Crie sua conta" subtitle="Leva menos de um minuto.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <fieldset className="flex gap-3">
          <legend className="mb-2 text-sm font-semibold">Eu sou</legend>
          {roleOption('OWNER', 'Tutor(a) de pet', PawPrint)}
          {roleOption('COMPANY', 'Empresa', Building2)}
        </fieldset>

        <Field
          label={role === 'COMPANY' ? 'Nome do responsável' : 'Seu nome'}
          error={errors.name?.message}
        >
          {(props) => <input autoComplete="name" {...props} {...form.register('name')} />}
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          {(props) => (
            <input type="email" autoComplete="email" {...props} {...form.register('email')} />
          )}
        </Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres" error={errors.password?.message}>
          {(props) => (
            <input
              type="password"
              autoComplete="new-password"
              {...props}
              {...form.register('password')}
            />
          )}
        </Field>
        <Field
          label="Data de nascimento"
          hint="É preciso ter 18 anos ou mais"
          error={errors.birthDate?.message}
        >
          {(props) => (
            <input type="date" autoComplete="bday" {...props} {...form.register('birthDate')} />
          )}
        </Field>

        {role === 'COMPANY' && (
          <fieldset className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
            <legend className="px-1 text-sm font-semibold">Dados da empresa</legend>
            <Field
              label="Nome fantasia"
              error={errors.company?.tradeName?.message ?? errors.company?.message}
            >
              {(props) => <input {...props} {...form.register('company.tradeName')} />}
            </Field>
            <Field label="CNPJ" error={errors.company?.cnpj?.message}>
              {(props) => (
                <input inputMode="numeric" {...props} {...form.register('company.cnpj')} />
              )}
            </Field>
            <Field label="Telefone (opcional)" error={errors.company?.phone?.message}>
              {(props) => (
                <input
                  type="tel"
                  autoComplete="tel"
                  {...props}
                  {...form.register('company.phone', { setValueAs: emptyToNull })}
                />
              )}
            </Field>
            <Field label="Site (opcional)" error={errors.company?.website?.message}>
              {(props) => (
                <input
                  type="url"
                  placeholder="https://"
                  {...props}
                  {...form.register('company.website', { setValueAs: emptyToNull })}
                />
              )}
            </Field>
          </fieldset>
        )}

        <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-4 text-sm">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-5 accent-brand-500"
              {...form.register('acceptTerms')}
            />
            <span>
              Li e aceito os{' '}
              <Link to="/termos" className="font-semibold underline">
                termos de uso e a política de privacidade
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-brand-700 dark:text-brand-400">{errors.acceptTerms.message}</p>
          )}
          {role === 'OWNER' && (
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5 accent-brand-500"
                {...form.register('acceptLocation')}
              />
              <span>
                Autorizo o uso da minha localização aproximada (~1 km) para mostrar pets por perto.
                Ninguém vê sua localização exata, só a distância. Dá para revogar quando quiser.
              </span>
            </label>
          )}
        </div>

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Criar conta
        </Button>
      </form>
      <p className="mt-6 text-center text-muted">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-semibold text-brand-600 underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
