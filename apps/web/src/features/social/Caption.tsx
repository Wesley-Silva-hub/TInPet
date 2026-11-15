import { splitHashtags } from '@tinpet/shared'
import { Link } from 'react-router'

/** Texto da legenda com as #hashtags virando links para a página da tag. */
export function Caption({ text }: { text: string }) {
  return (
    <>
      {splitHashtags(text).map((part) =>
        part.tag ? (
          <Link
            key={part.start}
            to={`/tags/${encodeURIComponent(part.tag)}`}
            className="font-semibold text-sky-700 hover:underline dark:text-sky-400"
          >
            {part.text}
          </Link>
        ) : (
          <span key={part.start}>{part.text}</span>
        ),
      )}
    </>
  )
}
