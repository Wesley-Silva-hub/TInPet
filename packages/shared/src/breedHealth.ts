import type { Species } from './pets'

/**
 * Saúde da raça (ideia do Notion: "na tabela raça, informações referentes a possíveis doenças").
 * Predisposições bem estabelecidas na literatura veterinária, escritas como orientação para
 * conversar com o veterinário, nunca como diagnóstico. Revisar com um veterinário antes de ampliar.
 */
export interface BreedHealth {
  /** Condições a que a raça tem predisposição conhecida. */
  watch: string[]
  /** Cuidado do dia a dia que mais ajuda. */
  care: string
}

export const BREED_HEALTH_DISCLAIMER =
  'Informação geral sobre a raça, não um diagnóstico. Nem todo pet da raça terá esses problemas: converse com o veterinário nas consultas de rotina.'

const brachycephalic = 'Síndrome braquicefálica (dificuldade para respirar, ronco, cansaço)'
const patella = 'Luxação de patela (o joelho “sai do lugar”, a pata fica suspensa)'
const hips = 'Displasia de quadril e de cotovelo'
const retina = 'Atrofia progressiva de retina (perda gradual da visão)'
const heat = 'Evite passeios nas horas mais quentes e deixe sempre água fresca e sombra.'

const byBreed: Record<string, BreedHealth> = {
  Labrador: {
    watch: [hips, 'Obesidade', retina, 'Otite (inflamação no ouvido)'],
    care: 'Controle o peso com ração medida e exercício diário: o excesso de peso piora as articulações.',
  },
  'Golden Retriever': {
    watch: [
      hips,
      'Alguns tipos de câncer, mais comuns que em outras raças',
      'Dermatite atópica (alergia de pele)',
      'Hipotireoidismo',
    ],
    care: 'Check-up anual com exame físico completo ajuda a perceber caroços e mudanças cedo.',
  },
  'Pastor Belga Malinois': {
    watch: [hips, retina, 'Epilepsia'],
    care: 'Precisa de muito exercício físico e mental todos os dias; o tédio vira estresse.',
  },
  'Jack Russell Terrier': {
    watch: [
      patella,
      'Doença de Legg-Calvé-Perthes (quadril, em filhotes)',
      'Luxação do cristalino (olhos)',
      'Surdez',
    ],
    care: 'Mancar de repente ou poupar uma pata traseira merece consulta.',
  },
  'Husky Siberiano': {
    watch: ['Catarata juvenil', retina, 'Distrofia de córnea', 'Sensibilidade ao calor'],
    care: `Raça de clima frio: ${heat}`,
  },
  'Shih Tzu': {
    watch: [
      brachycephalic,
      'Úlcera de córnea e olho seco',
      'Problemas na coluna (disco intervertebral)',
      'Tártaro e perda de dentes',
    ],
    care: 'Limpe os olhos todo dia e escove os dentes; evite pular de lugares altos.',
  },
  Pug: {
    watch: [
      brachycephalic,
      'Lesões nos olhos (são saltados)',
      'Obesidade',
      'Dermatite nas dobras da pele',
    ],
    care: `${heat} Seque bem as dobrinhas do rosto.`,
  },
  Beagle: {
    watch: [
      'Obesidade',
      'Epilepsia',
      'Hipotireoidismo',
      'Problemas na coluna (disco intervertebral)',
      'Otite',
    ],
    care: 'É comilão: ração medida e cuidado com restos de comida.',
  },
  'Shiba Inu': {
    watch: ['Alergias de pele', patella, 'Glaucoma'],
    care: 'Coceira constante ou olho vermelho e dolorido merecem consulta.',
  },
  'Cocker Spaniel': {
    watch: ['Otite (orelhas longas e caídas)', 'Glaucoma e catarata'],
    care: 'Limpe e seque as orelhas toda semana, principalmente depois do banho.',
  },
  'Lulu da Pomerânia': {
    watch: [
      patella,
      'Colapso de traqueia (tosse “de ganso”)',
      'Alopecia X (queda de pelo)',
      'Tártaro e perda de dentes',
    ],
    care: 'Prefira peitoral à coleira no pescoço e escove os dentes.',
  },
  'Cão d’Água': {
    watch: [retina, hips],
    care: 'Ama água: seque bem as orelhas depois de nadar.',
  },
  Cockapoo: {
    watch: [
      'Pode herdar do Cocker: otite e problemas nos olhos',
      `Pode herdar do Poodle: ${patella.toLowerCase()}`,
    ],
    care: 'Orelhas limpas e secas e tosa regular evitam a maior parte dos problemas.',
  },
  Poodle: {
    watch: [patella, retina, 'Epilepsia', 'Tártaro e perda de dentes'],
    care: 'Escovação de dentes e tosa regular fazem diferença.',
  },
  'Bulldog Francês': {
    watch: [
      brachycephalic,
      'Problemas na coluna (disco intervertebral)',
      'Alergias e dermatites',
      'Sensibilidade ao calor',
    ],
    care: `${heat} Evite exercício intenso e escadas em excesso.`,
  },
  Siamês: {
    watch: ['Asma felina', 'Amiloidose (rins e fígado)', retina],
    care: 'Tosse, chiado ou respiração pela boca em gato não é normal: procure o veterinário.',
  },
  Persa: {
    watch: [
      'Doença renal policística (cistos nos rins)',
      'Braquicefalia (respiração e lacrimejamento)',
      'Nós no pelo e bolas de pelo',
    ],
    care: 'Escove o pelo todo dia e limpe os olhos; exame de rins pode ser pedido mesmo sem sintomas.',
  },
  'Maine Coon': {
    watch: [
      'Cardiomiopatia hipertrófica (coração)',
      'Displasia de quadril',
      'Atrofia muscular espinhal',
    ],
    care: 'Pergunte ao veterinário sobre exame do coração (ecocardiograma) nos check-ups.',
  },
  Calopsita: {
    watch: ['Obesidade e problemas de fígado (dieta só de sementes)', 'Problemas respiratórios'],
    care: 'Ração extrusada, verduras e frutas, e pouca semente; sem fumaça e sem panela antiaderente superaquecida por perto.',
  },
  Periquito: {
    watch: ['Sarna no bico e nas patas (ácaros)', 'Tumores', 'Obesidade'],
    care: 'Crostas no bico ou nas patas precisam de tratamento: procure veterinário de aves.',
  },
  Jandaia: {
    watch: ['Arrancar as próprias penas (estresse, tédio)', 'Dieta pobre em vitaminas'],
    care: 'Precisa de companhia, brinquedos e tempo fora da gaiola todos os dias.',
  },
  Agapornis: {
    watch: ['Arrancar as próprias penas', 'Doença do bico e das penas (viral)'],
    care: 'Faça quarentena de aves novas antes de juntar com as outras.',
  },
}

/** Coelhos e roedores têm dentes que crescem a vida toda: o cuidado é parecido entre as raças. */
const rabbit: BreedHealth = {
  watch: [
    'Dentes que crescem demais (precisam de feno à vontade para gastar)',
    'Estase gastrointestinal (intestino para; é emergência)',
  ],
  care: 'Feno à vontade todo dia. Coelho que para de comer ou de fazer cocô precisa de veterinário no mesmo dia.',
}

const bySpecies: Partial<Record<Species, BreedHealth>> = {
  RABBIT: rabbit,
  RODENT: {
    watch: ['Dentes que crescem demais', 'Problemas de pele e pelo'],
    care: 'Feno e objetos de roer seguros todos os dias; mudanças no apetite merecem consulta.',
  },
}

const lopEars = { ...rabbit, watch: [...rabbit.watch, 'Otite (orelhas caídas)'] }

const extra: Record<string, BreedHealth> = {
  'Mini Lop': lopEars,
  'Fuzzy Lop': lopEars,
  Lionhead: { ...rabbit, watch: [...rabbit.watch, 'Bolas de pelo por causa da juba'] },
  'Hamster Sírio': {
    watch: [
      '“Cauda molhada” (diarreia grave)',
      'Dentes que crescem demais',
      'Tumores na idade adulta',
    ],
    care: 'Diarreia em hamster é urgente: leve ao veterinário no mesmo dia.',
  },
  'Porquinho-da-índia': {
    watch: [
      'Falta de vitamina C (escorbuto): ele não produz a própria',
      'Dentes que crescem demais',
    ],
    care: 'Ração própria para porquinho-da-índia e vegetais ricos em vitamina C todos os dias.',
  },
  Chinchila: {
    watch: ['Superaquecimento (sofre acima de 25 °C)', 'Dentes que crescem demais'],
    care: 'Ambiente fresco e banho só de pó, nunca de água.',
  },
}

/** Sem raça definida e padrões de pelagem (Tigrado, Frajola) não são raças. */
const general: BreedHealth = {
  watch: [],
  care: 'Sem predisposição de raça: o mais importante são vacinas em dia, vermífugo, castração e um check-up por ano.',
}

/** Saúde da raça do pet; nulo quando não há o que dizer (espécie "Outro"). */
export function breedHealthFor(species: Species, breed: string | null): BreedHealth | null {
  if (breed && (byBreed[breed] ?? extra[breed])) return byBreed[breed] ?? extra[breed] ?? null
  if (bySpecies[species]) return bySpecies[species] ?? null
  if (species === 'DOG' || species === 'CAT') return general
  return null
}
