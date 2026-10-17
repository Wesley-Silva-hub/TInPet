import { useMutation, useQuery } from '@tanstack/react-query'
import type { Pet, PetTag, Sighting } from '@tinpet/shared'
import { Download, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { api, errorMessage } from '../../lib/api'
import { timeAgo } from '../../lib/time'

export const tagUrl = (code: string) => `${window.location.origin}/p/${code}`

const QR_OPTIONS = { errorCorrectionLevel: 'M', margin: 1, color: { dark: '#2b1d1a' } } as const

/** Monta a arte da plaquinha (PNG) pronta para levar à gráfica ou imprimir em casa. */
async function tagImage(pet: Pet, code: string): Promise<string> {
  const canvas = document.createElement('canvas')
  const width = 600
  const height = 820
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Seu navegador não gerou a imagem')
  context.fillStyle = '#fff4f1'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#ef5b4c'
  context.fillRect(0, 0, width, 150)
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.font = 'bold 54px sans-serif'
  context.fillText(`Oi, sou ${pet.name}!`, width / 2, 92)
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, tagUrl(code), { ...QR_OPTIONS, width: 440 })
  context.drawImage(qr, (width - 440) / 2, 190)
  context.fillStyle = '#2b1d1a'
  context.font = 'bold 34px sans-serif'
  context.fillText('Me achou? Aponte a câmera', width / 2, 690)
  context.font = '28px sans-serif'
  context.fillText('e avise meu tutor. Não precisa de app.', width / 2, 735)
  context.fillStyle = '#b32f22'
  context.font = 'bold 26px monospace'
  context.fillText(`tinpet · ${code}`, width / 2, 790)
  return canvas.toDataURL('image/png')
}

function TagReports({ petId }: { petId: string }) {
  const reports = useQuery({
    queryKey: ['tag-reports', petId],
    queryFn: () => api<Sighting[]>(`/pets/${petId}/tag-reports`),
  })
  if (!reports.data?.length) return null
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <p className="text-sm font-bold">Recados de quem escaneou</p>
      <ul className="flex flex-col gap-2">
        {reports.data.map((report) => (
          <li key={report.id} className="rounded-2xl bg-surface-2 p-3 text-sm">
            <p>{report.message}</p>
            <p className="text-muted">
              {report.contact && `${report.contact} · `}
              {timeAgo(report.createdAt)}
              {report.mapsUrl && (
                <>
                  {' · '}
                  <a
                    href={report.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-700 underline"
                  >
                    ver no mapa
                  </a>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PetTagCard({ pet }: { pet: Pet }) {
  const [svg, setSvg] = useState<string | null>(null)
  const tag = useMutation({
    mutationFn: () => api<PetTag>(`/pets/${pet.id}/tag`, { method: 'POST' }),
    onError: (error) => toast.error(errorMessage(error)),
  })
  const code = tag.data?.tagCode

  useEffect(() => {
    if (!code) return
    let cancelled = false
    QRCode.toString(tagUrl(code), { ...QR_OPTIONS, type: 'svg' }).then((markup) => {
      if (!cancelled) setSvg(markup)
    })
    return () => {
      cancelled = true
    }
  }, [code])

  const download = async () => {
    if (!code) return
    try {
      const link = document.createElement('a')
      link.href = await tagImage(pet, code)
      link.download = `plaquinha-${pet.name.toLowerCase().replace(/\s+/g, '-')}.png`
      link.click()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <section
      aria-labelledby="plaquinha"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
    >
      <h2 id="plaquinha" className="flex items-center gap-2 text-lg font-semibold">
        <QrCode className="size-5 text-brand-500" aria-hidden /> Plaquinha QR da coleira
      </h2>
      {code && svg ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div
            role="img"
            aria-label={`QR code da plaquinha de ${pet.name}`}
            className="size-40 shrink-0 rounded-2xl bg-white p-2 [&>svg]:size-full"
            // SVG gerado localmente pela biblioteca qrcode a partir do nosso próprio link
            // biome-ignore lint/security/noDangerouslySetInnerHtml: conteúdo gerado localmente, sem entrada do usuário
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="flex flex-col gap-2 text-sm">
            <p>
              Quem achar {pet.name} aponta a câmera e te avisa na hora, <b>sem precisar de app</b> e
              sem ver seu telefone ou endereço.
            </p>
            <p className="font-mono font-bold tracking-widest text-brand-700">{code}</p>
            <Button variant="secondary" onClick={download} className="self-start">
              <Download className="size-4" aria-hidden /> Baixar arte para imprimir
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <p>
            Um QR na coleira faz {pet.name} voltar mais rápido: quem encontrar escaneia e você
            recebe o recado na hora.
          </p>
          <Button loading={tag.isPending} onClick={() => tag.mutate()} className="self-start">
            <QrCode className="size-4" aria-hidden /> Gerar plaquinha
          </Button>
        </div>
      )}
      <TagReports petId={pet.id} />
    </section>
  )
}
