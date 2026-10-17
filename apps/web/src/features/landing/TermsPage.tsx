import { Link } from 'react-router'
import { Logo } from '../../components/Logo'

/** Resumo de termos e privacidade (LGPD). Texto jurídico definitivo deve ser revisado por especialista. */
export function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link to="/" aria-label="TinPet, início">
        <Logo />
      </Link>
      <article className="mt-8 flex flex-col gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold">
        <h1 className="text-3xl font-semibold">Termos de uso e privacidade</h1>
        <p className="text-muted">Versão resumida para a fase de testes do TinPet.</p>

        <h2>O que coletamos</h2>
        <p>
          Nome, e-mail, data de nascimento, senha (guardada apenas como hash), dados opcionais de
          perfil (bio, estado civil, profissão, cidade), fotos que você envia, dados dos seus pets,
          curtidas, matches e mensagens.
        </p>

        <h2>Localização</h2>
        <p>
          Só com o seu consentimento. Guardamos coordenadas arredondadas (precisão de cerca de 1 km)
          e nunca mostramos sua posição a outras pessoas, apenas a distância aproximada. Você pode
          revogar a qualquer momento nas configurações, e as coordenadas são apagadas.
        </p>

        <h2>Fotos</h2>
        <p>
          Toda imagem é reprocessada e tem os metadados removidos (inclusive dados de GPS da
          câmera).
        </p>

        <h2>Seus direitos (LGPD)</h2>
        <p>
          Em Configurações você pode baixar uma cópia de todos os seus dados e excluir sua conta. A
          exclusão é definitiva e remove também pets, fotos, matches e mensagens. Denúncias feitas
          por você são mantidas, sem identificação, para fins de moderação.
        </p>

        <h2>Regras de convivência</h2>
        <p>
          É preciso ter 18 anos ou mais. Proibido conteúdo ofensivo, perfis falsos, comércio de
          animais e qualquer forma de maus-tratos. Use bloquear e denunciar sempre que precisar.
        </p>

        <h2>Marketplace</h2>
        <p>
          O TinPet apenas divulga anúncios. Compras e entregas são negociadas diretamente com a
          empresa anunciante.
        </p>
      </article>
    </main>
  )
}
