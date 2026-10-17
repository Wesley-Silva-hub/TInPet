import { Avatar } from './Avatar'

interface PetAvatarProps {
  petSrc: string
  ownerSrc: string | null
  ownerName: string
  className?: string
}

/** Foto do pet em anel degradê com o mini-avatar do tutor no canto (ideia do Figma do time). */
export function PetAvatar({ petSrc, ownerSrc, ownerName, className = 'size-16' }: PetAvatarProps) {
  return (
    <span className="relative inline-block shrink-0">
      <span className="block rounded-full bg-gradient-to-tr from-sun-400 via-brand-500 to-brand-700 p-[3px]">
        <img
          src={petSrc}
          alt=""
          className={`${className} rounded-full border-2 border-canvas object-cover`}
        />
      </span>
      <span className="absolute -right-1 -bottom-1 rounded-full border-2 border-canvas">
        <Avatar src={ownerSrc} name={ownerName} className="size-6" />
      </span>
    </span>
  )
}
