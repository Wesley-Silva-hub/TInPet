/**
 * Dados de desenvolvimento. Idempotente: tabelas de domínio por upsert e dados
 * de demonstração (e-mails @tinpet.dev) recriados a cada execução.
 * Senha de todos os usuários de demonstração: tinpet123
 */
import argon2 from 'argon2'
import sharp from 'sharp'
import type { PetPurpose, PetSex, PetSize, Species } from '../src/generated/prisma/client'
import { roundCoordinate } from '../src/shared/dto'
import { loadEnv } from '../src/shared/env'
import { createPrisma } from '../src/shared/prisma'
import { createStorage, newStorageKey } from '../src/shared/storage/storage'

const env = loadEnv()
const db = createPrisma(env.DATABASE_URL)
const storage = createStorage(env)
const DEMO_DOMAIN = '@tinpet.dev'

const maritalStatuses = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável']
const professions = [
  'Desenvolvedor(a)',
  'Designer',
  'Professor(a)',
  'Médico(a) veterinário(a)',
  'Enfermeiro(a)',
  'Engenheiro(a)',
  'Advogado(a)',
  'Estudante',
  'Autônomo(a)',
  'Administrador(a)',
]
const breeds: Record<Species, string[]> = {
  DOG: [
    'Sem raça definida',
    'Labrador',
    'Golden Retriever',
    'Poodle',
    'Shih Tzu',
    'Bulldog Francês',
    'Pinscher',
    'Border Collie',
    'Yorkshire',
    'Spitz Alemão',
  ],
  CAT: ['Sem raça definida', 'Siamês', 'Persa', 'Maine Coon', 'Angorá', 'Ragdoll'],
  BIRD: ['Calopsita', 'Periquito', 'Canário', 'Agapornis'],
  RABBIT: ['Mini Lop', 'Fuzzy Lop', 'Lionhead'],
  RODENT: ['Hamster Sírio', 'Porquinho-da-índia', 'Chinchila'],
  OTHER: ['Outro'],
}

// Bairros de São Paulo para o feed ter distâncias variadas
const places = [
  { city: 'São Paulo', lat: -23.5614, lng: -46.6559 },
  { city: 'São Paulo', lat: -23.5869, lng: -46.6823 },
  { city: 'São Paulo', lat: -23.5329, lng: -46.6395 },
  { city: 'Osasco', lat: -23.5329, lng: -46.7917 },
  { city: 'Santo André', lat: -23.6639, lng: -46.5383 },
  { city: 'Guarulhos', lat: -23.4538, lng: -46.5333 },
  { city: 'Campinas', lat: -22.9099, lng: -47.0626 },
]

const owners = [
  {
    name: 'Ana Souza',
    bio: 'Mãe de pet em tempo integral. Amo trilhas aos fins de semana.',
    profession: 'Designer',
    marital: 'Solteiro(a)',
    birth: '1994-03-12',
  },
  {
    name: 'Bruno Lima',
    bio: 'Corredor e tutor do cachorro mais animado do bairro.',
    profession: 'Desenvolvedor(a)',
    marital: 'Casado(a)',
    birth: '1989-07-21',
  },
  {
    name: 'Carla Mendes',
    bio: 'Veterinária apaixonada por gatos.',
    profession: 'Médico(a) veterinário(a)',
    marital: 'União estável',
    birth: '1991-11-02',
  },
  {
    name: 'Diego Rocha',
    bio: 'Procuro amigos para meu pet brincar no parque.',
    profession: 'Professor(a)',
    marital: 'Divorciado(a)',
    birth: '1985-01-30',
  },
  {
    name: 'Elisa Martins',
    bio: 'Tenho uma casa cheia de bichos e de amor.',
    profession: 'Enfermeiro(a)',
    marital: 'Solteiro(a)',
    birth: '1997-05-17',
  },
  {
    name: 'Felipe Costa',
    bio: 'Engenheiro, tutor de primeira viagem.',
    profession: 'Engenheiro(a)',
    marital: 'Solteiro(a)',
    birth: '1999-09-09',
  },
  {
    name: 'Gabriela Alves',
    bio: 'Adestradora nas horas vagas.',
    profession: 'Autônomo(a)',
    marital: 'Casado(a)',
    birth: '1990-12-25',
  },
]

interface DemoPet {
  owner: number
  name: string
  species: Species
  breed: string
  sex: PetSex
  size: PetSize
  purpose: PetPurpose
  birth: string
  bio: string
}

const pets: DemoPet[] = [
  {
    owner: 0,
    name: 'Thor',
    species: 'DOG',
    breed: 'Golden Retriever',
    sex: 'MALE',
    size: 'LARGE',
    purpose: 'BOTH',
    birth: '2021-04-10',
    bio: 'Adora bolinha e água.',
  },
  {
    owner: 0,
    name: 'Mia',
    species: 'CAT',
    breed: 'Siamês',
    sex: 'FEMALE',
    size: 'SMALL',
    purpose: 'FRIENDSHIP',
    birth: '2022-02-01',
    bio: 'Rainha do sofá.',
  },
  {
    owner: 1,
    name: 'Luna',
    species: 'DOG',
    breed: 'Labrador',
    sex: 'FEMALE',
    size: 'LARGE',
    purpose: 'BOTH',
    birth: '2020-08-15',
    bio: 'Companheira de corrida.',
  },
  {
    owner: 2,
    name: 'Simba',
    species: 'CAT',
    breed: 'Maine Coon',
    sex: 'MALE',
    size: 'MEDIUM',
    purpose: 'MATING',
    birth: '2021-06-20',
    bio: 'Pelagem impecável e vacinado.',
  },
  {
    owner: 2,
    name: 'Nina',
    species: 'CAT',
    breed: 'Persa',
    sex: 'FEMALE',
    size: 'SMALL',
    purpose: 'MATING',
    birth: '2022-03-03',
    bio: 'Calma e carinhosa.',
  },
  {
    owner: 3,
    name: 'Bob',
    species: 'DOG',
    breed: 'Bulldog Francês',
    sex: 'MALE',
    size: 'SMALL',
    purpose: 'FRIENDSHIP',
    birth: '2019-12-12',
    bio: 'Ronca alto, ama alto.',
  },
  {
    owner: 4,
    name: 'Mel',
    species: 'DOG',
    breed: 'Shih Tzu',
    sex: 'FEMALE',
    size: 'SMALL',
    purpose: 'FRIENDSHIP',
    birth: '2023-01-05',
    bio: 'Pequena e cheia de energia.',
  },
  {
    owner: 4,
    name: 'Pipoca',
    species: 'RABBIT',
    breed: 'Mini Lop',
    sex: 'FEMALE',
    size: 'SMALL',
    purpose: 'BOTH',
    birth: '2023-07-07',
    bio: 'Come cenoura o dia inteiro.',
  },
  {
    owner: 5,
    name: 'Rex',
    species: 'DOG',
    breed: 'Border Collie',
    sex: 'MALE',
    size: 'MEDIUM',
    purpose: 'BOTH',
    birth: '2021-10-30',
    bio: 'Super inteligente, aprende tudo.',
  },
  {
    owner: 5,
    name: 'Kiwi',
    species: 'BIRD',
    breed: 'Calopsita',
    sex: 'MALE',
    size: 'SMALL',
    purpose: 'FRIENDSHIP',
    birth: '2022-09-14',
    bio: 'Assobia o hino do time.',
  },
  {
    owner: 6,
    name: 'Amora',
    species: 'DOG',
    breed: 'Spitz Alemão',
    sex: 'FEMALE',
    size: 'SMALL',
    purpose: 'MATING',
    birth: '2021-05-22',
    bio: 'Pedigree e muito charme.',
  },
  {
    owner: 6,
    name: 'Zeus',
    species: 'DOG',
    breed: 'Sem raça definida',
    sex: 'MALE',
    size: 'MEDIUM',
    purpose: 'FRIENDSHIP',
    birth: '2018-11-11',
    bio: 'Resgatado, gratidão em forma de cão.',
  },
]

const companies = [
  {
    name: 'Ana Paula Ferreira',
    tradeName: 'Pet Feliz Rações',
    cnpj: '12345678000190',
    phone: '(11) 98888-0001',
    website: 'https://example.com/petfeliz',
    products: [
      {
        title: 'Ração Premium Cães Adultos 15 kg',
        priceCents: 24990,
        category: 'FOOD',
        description: 'Ração super premium com proteína de frango e arroz.',
      },
      {
        title: 'Petisco Natural de Batata-doce',
        priceCents: 1990,
        category: 'FOOD',
        description: 'Snack desidratado, sem conservantes.',
      },
      {
        title: 'Ração Gatos Castrados 10 kg',
        priceCents: 18990,
        category: 'FOOD',
        description: 'Controle de peso e saúde urinária.',
      },
    ],
  },
  {
    name: 'Rafael Nunes',
    tradeName: 'Mundo Pet Acessórios',
    cnpj: '98765432000110',
    phone: '(11) 97777-0002',
    website: null,
    products: [
      {
        title: 'Cama Ortopédica Média',
        priceCents: 15900,
        category: 'ACCESSORIES',
        description: 'Espuma de alta densidade, capa lavável.',
      },
      {
        title: 'Arranhador Torre 1,2 m',
        priceCents: 22900,
        category: 'TOYS',
        description: 'Sisal natural, três andares.',
      },
      {
        title: 'Shampoo Hipoalergênico 500 ml',
        priceCents: 3490,
        category: 'HYGIENE',
        description: 'Para peles sensíveis.',
      },
      {
        title: 'Banho e tosa (agendamento)',
        priceCents: 6000,
        category: 'SERVICES',
        description: 'Atendimento com hora marcada em Pinheiros.',
      },
    ],
  },
] as const

const palette = ['#f97362', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#2dd4bf']
const speciesEmoji: Record<Species, string> = {
  DOG: '🐶',
  CAT: '🐱',
  BIRD: '🐦',
  RABBIT: '🐰',
  RODENT: '🐹',
  OTHER: '🐾',
}

/** Placeholder em vez de fotos reais (sem direitos autorais nem dados pessoais). */
async function placeholder(label: string, emoji: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="46%" font-size="260" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
    <text x="50%" y="78%" font-size="72" font-family="sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
  </svg>`
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer()
}

async function upload(folder: string, label: string, emoji: string, color: string) {
  const key = newStorageKey(folder, 'webp')
  await storage.put(key, await placeholder(label, emoji, color), 'image/webp')
  return key
}

async function seedLookups() {
  for (const name of maritalStatuses) {
    await db.maritalStatus.upsert({ where: { name }, create: { name }, update: {} })
  }
  for (const name of professions) {
    await db.profession.upsert({ where: { name }, create: { name }, update: {} })
  }
  for (const [species, names] of Object.entries(breeds) as [Species, string[]][]) {
    for (const name of names) {
      await db.breed.upsert({
        where: { species_name: { species, name } },
        create: { species, name },
        update: {},
      })
    }
  }
}

async function clearDemoData() {
  const demoUsers = await db.user.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    include: { pets: { include: { photos: true } }, products: true },
  })
  const keys = demoUsers.flatMap((user) => [
    ...(user.avatarKey ? [user.avatarKey] : []),
    ...user.pets.flatMap((pet) => pet.photos.map((photo) => photo.storageKey)),
    ...user.products.flatMap((product) => (product.imageKey ? [product.imageKey] : [])),
  ])
  await db.user.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } })
  await storage.delete(keys)
}

async function main() {
  await seedLookups()
  await clearDemoData()

  const passwordHash = await argon2.hash('tinpet123')
  const now = new Date()
  const [statusList, professionList, breedList] = await Promise.all([
    db.maritalStatus.findMany(),
    db.profession.findMany(),
    db.breed.findMany(),
  ])

  const ownerIds: string[] = []
  for (const [index, owner] of owners.entries()) {
    const place = places[index % places.length] as (typeof places)[number]
    const first = owner.name.split(' ')[0] as string
    const user = await db.user.create({
      data: {
        email: `${first.toLowerCase()}${DEMO_DOMAIN}`,
        passwordHash,
        name: owner.name,
        bio: owner.bio,
        birthDate: new Date(`${owner.birth}T00:00:00Z`),
        role: 'OWNER',
        maritalStatusId: statusList.find((s) => s.name === owner.marital)?.id ?? null,
        professionId: professionList.find((p) => p.name === owner.profession)?.id ?? null,
        latitude: roundCoordinate(place.lat),
        longitude: roundCoordinate(place.lng),
        city: place.city,
        state: 'SP',
        consentTermsAt: now,
        consentLocationAt: now,
        avatarKey: await upload('avatars', first, '🙂', palette[index % palette.length] as string),
      },
    })
    ownerIds.push(user.id)
  }

  const petIds: string[] = []
  for (const [index, pet] of pets.entries()) {
    const created = await db.pet.create({
      data: {
        ownerId: ownerIds[pet.owner] as string,
        name: pet.name,
        species: pet.species,
        breedId:
          breedList.find((b) => b.species === pet.species && b.name === pet.breed)?.id ?? null,
        sex: pet.sex,
        size: pet.size,
        purpose: pet.purpose,
        birthDate: new Date(`${pet.birth}T00:00:00Z`),
        bio: pet.bio,
      },
    })
    for (const position of [0, 1]) {
      const color = palette[(index + position * 3) % palette.length] as string
      await db.petPhoto.create({
        data: {
          petId: created.id,
          position,
          storageKey: await upload(
            `pets/${created.id}`,
            pet.name,
            speciesEmoji[pet.species],
            color,
          ),
        },
      })
    }
    petIds.push(created.id)
  }

  // Thor (Ana) e Luna (Bruno) já deram match e conversaram
  const thor = petIds[0] as string
  const luna = petIds[2] as string
  await db.swipe.createMany({
    data: [
      { fromPetId: thor, toPetId: luna, direction: 'LIKE' },
      { fromPetId: luna, toPetId: thor, direction: 'LIKE' },
    ],
  })
  const [petAId, petBId] = [thor, luna].sort() as [string, string]
  const match = await db.match.create({ data: { petAId, petBId } })
  const ana = ownerIds[0] as string
  const bruno = ownerIds[1] as string
  const conversation = [
    { senderId: ana, content: 'Oi, Bruno! O Thor adorou a Luna 😄' },
    { senderId: bruno, content: 'Oi, Ana! A Luna também. Vocês costumam ir ao Ibirapuera?' },
    { senderId: ana, content: 'Todo sábado de manhã! Bora marcar?' },
  ]
  for (const [index, message] of conversation.entries()) {
    await db.message.create({
      data: {
        matchId: match.id,
        ...message,
        createdAt: new Date(now.getTime() - (conversation.length - index) * 60_000),
        readAt: index < conversation.length - 1 ? now : null,
      },
    })
  }

  // Rex (Felipe) já curtiu o Thor: se a Ana curtir o Rex, dá match na hora
  await db.swipe.create({
    data: { fromPetId: petIds[8] as string, toPetId: thor, direction: 'LIKE' },
  })

  for (const company of companies) {
    const first = company.tradeName.split(' ')[0]?.toLowerCase()
    const user = await db.user.create({
      data: {
        email: `${first}${DEMO_DOMAIN}`,
        passwordHash,
        name: company.name,
        birthDate: new Date('1985-01-01T00:00:00Z'),
        role: 'COMPANY',
        city: 'São Paulo',
        state: 'SP',
        consentTermsAt: now,
        company: {
          create: {
            tradeName: company.tradeName,
            cnpj: company.cnpj,
            phone: company.phone,
            website: company.website,
          },
        },
      },
    })
    for (const [index, product] of company.products.entries()) {
      const created = await db.product.create({
        data: { ...product, companyId: user.id, externalLink: company.website },
      })
      const imageKey = await upload(
        `products/${created.id}`,
        product.title.split(' ')[0] as string,
        '🛍️',
        palette[(index + 2) % palette.length] as string,
      )
      await db.product.update({ where: { id: created.id }, data: { imageKey } })
    }
  }

  process.stdout.write(
    `Seed concluído: ${owners.length} donos, ${pets.length} pets, ${companies.length} empresas. Senha: tinpet123\n`,
  )
}

try {
  await main()
} finally {
  await db.$disconnect()
}
