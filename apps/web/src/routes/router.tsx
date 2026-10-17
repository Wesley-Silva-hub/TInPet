import { SearchX } from 'lucide-react'
import type { ComponentType } from 'react'
import { createBrowserRouter, Link } from 'react-router'
import { EmptyState } from '../components/ui/States'
import { LandingPage } from '../features/landing/LandingPage'
import { AppLayout } from './AppLayout'
import { RedirectIfAuthenticated, RequireAuth } from './guards'
import { RouteError } from './RouteError'

/** Carrega a tela sob demanda: cada rota vira um chunk separado. */
function page<K extends string, M extends Record<K, ComponentType>>(
  load: () => Promise<M>,
  name: K,
) {
  return async () => ({ Component: (await load())[name] })
}

function NotFound() {
  return (
    <EmptyState icon={<SearchX className="size-8" />} title="Página não encontrada">
      <Link to="/" className="font-semibold text-brand-600 underline">
        Voltar ao início
      </Link>
    </EmptyState>
  )
}

export const router = createBrowserRouter([
  {
    // Qualquer erro de rota (inclusive versão desatualizada do site) cai numa tela amigável
    errorElement: <RouteError />,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          { path: '/', element: <LandingPage /> },
          { path: '/entrar', lazy: page(() => import('../features/auth/LoginPage'), 'LoginPage') },
          {
            path: '/cadastro',
            lazy: page(() => import('../features/auth/RegisterPage'), 'RegisterPage'),
          },
        ],
      },
      { path: '/termos', lazy: page(() => import('../features/landing/TermsPage'), 'TermsPage') },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: '/loja',
                lazy: page(
                  () => import('../features/marketplace/MarketplacePage'),
                  'MarketplacePage',
                ),
              },
              {
                path: '/loja/:id',
                lazy: page(() => import('../features/marketplace/ProductPage'), 'ProductPage'),
              },
              {
                path: '/lojas',
                lazy: page(() => import('../features/marketplace/StoresPage'), 'StoresPage'),
              },
              {
                path: '/lojas/:id',
                lazy: page(() => import('../features/marketplace/StorePage'), 'StorePage'),
              },
              {
                path: '/configuracoes',
                lazy: page(() => import('../features/profile/SettingsPage'), 'SettingsPage'),
              },
              {
                path: '/noticias',
                lazy: page(() => import('../features/news/NewsPage'), 'NewsPage'),
              },
              {
                path: '/noticias/:slug',
                lazy: page(() => import('../features/news/ArticlePage'), 'ArticlePage'),
              },
              {
                element: <RequireAuth roles={['OWNER']} />,
                children: [
                  {
                    path: '/inicio',
                    lazy: page(() => import('../features/social/HomePage'), 'HomePage'),
                  },
                  {
                    path: '/publicar',
                    lazy: page(() => import('../features/social/NewPostPage'), 'NewPostPage'),
                  },
                  {
                    path: '/posts/:id',
                    lazy: page(() => import('../features/social/PostPage'), 'PostPage'),
                  },
                  {
                    path: '/onboarding',
                    lazy: page(
                      () => import('../features/profile/OnboardingPage'),
                      'OnboardingPage',
                    ),
                  },
                  {
                    path: '/feed',
                    lazy: page(() => import('../features/feed/FeedPage'), 'FeedPage'),
                  },
                  {
                    path: '/matches',
                    lazy: page(() => import('../features/matches/MatchesPage'), 'MatchesPage'),
                  },
                  {
                    path: '/matches/:id',
                    lazy: page(() => import('../features/chat/ChatPage'), 'ChatPage'),
                  },
                  {
                    path: '/perfil',
                    lazy: page(() => import('../features/profile/MyProfilePage'), 'MyProfilePage'),
                  },
                  {
                    path: '/pets/novo',
                    lazy: page(() => import('../features/profile/PetFormPage'), 'PetFormPage'),
                  },
                  {
                    path: '/pets/:id',
                    lazy: page(
                      () => import('../features/profile/PetProfilePage'),
                      'PetProfilePage',
                    ),
                  },
                  {
                    path: '/notificacoes',
                    lazy: page(
                      () => import('../features/notifications/NotificationsPage'),
                      'NotificationsPage',
                    ),
                  },
                  {
                    path: '/pets/:id/editar',
                    lazy: page(() => import('../features/profile/PetFormPage'), 'PetFormPage'),
                  },
                  {
                    path: '/usuarios/:id',
                    lazy: page(
                      () => import('../features/profile/UserProfilePage'),
                      'UserProfilePage',
                    ),
                  },
                ],
              },
              {
                element: <RequireAuth roles={['COMPANY']} />,
                children: [
                  {
                    path: '/empresa',
                    lazy: page(
                      () => import('../features/marketplace/CompanyDashboardPage'),
                      'CompanyDashboardPage',
                    ),
                  },
                  {
                    path: '/empresa/impulsionar',
                    lazy: page(
                      () => import('../features/marketplace/BoostWizardPage'),
                      'BoostWizardPage',
                    ),
                  },
                  {
                    path: '/empresa/perfil',
                    lazy: page(
                      () => import('../features/marketplace/StoreProfilePage'),
                      'StoreProfilePage',
                    ),
                  },
                  {
                    path: '/empresa/produtos/novo',
                    lazy: page(
                      () => import('../features/marketplace/ProductFormPage'),
                      'ProductFormPage',
                    ),
                  },
                  {
                    path: '/empresa/produtos/:id',
                    lazy: page(
                      () => import('../features/marketplace/ProductFormPage'),
                      'ProductFormPage',
                    ),
                  },
                ],
              },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
])
