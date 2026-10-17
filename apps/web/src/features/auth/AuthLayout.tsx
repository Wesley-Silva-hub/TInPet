import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '../../components/Logo'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Link to="/" aria-label="TinPet, início" className="self-start">
        <Logo />
      </Link>
      <div className="mt-10 mb-6">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-muted">{subtitle}</p>
      </div>
      {children}
    </main>
  )
}
