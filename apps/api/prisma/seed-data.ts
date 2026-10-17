/**
 * Conteúdo de demonstração (fictício). As fotos ficam em ./seed-assets (CC0, ver CREDITS.md).
 * Senha de todos os usuários: tinpet123
 */
import type {
  ArticleCategory,
  CompanyKind,
  PetPurpose,
  PetSex,
  PetSize,
  ProductCategory,
  Species,
} from '../src/generated/prisma/client'

export interface SeedPet {
  key: string
  name: string
  species: Species
  breed: string
  sex: PetSex
  size: PetSize
  purpose: PetPurpose
  birth: string
  bio: string
  photos: string[]
}

export interface SeedOwner {
  key: string
  name: string
  birth: string
  marital: string
  profession: string
  city: string
  state: string
  lat: number
  lng: number
  bio: string
  avatar: string
  pets: SeedPet[]
  /** [foto, legenda, chave do pet marcado, dias atrás] */
  posts: [string, string, string | null, number][]
}

export const maritalStatuses = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União estável',
  'Namorando',
]

export const professions = [
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
  'Fotógrafo(a)',
  'Aposentado(a)',
  'Jornalista',
  'Chef de cozinha',
  'Arquiteto(a)',
  'Psicólogo(a)',
]

export const breeds: Record<Species, string[]> = {
  DOG: [
    'Sem raça definida',
    'Labrador',
    'Golden Retriever',
    'Pastor Belga Malinois',
    'Jack Russell Terrier',
    'Husky Siberiano',
    'Shih Tzu',
    'Pug',
    'Beagle',
    'Shiba Inu',
    'Cocker Spaniel',
    'Lulu da Pomerânia',
    'Cão d’Água',
    'Cockapoo',
    'Poodle',
    'Bulldog Francês',
  ],
  CAT: ['Sem raça definida', 'Siamês', 'Persa', 'Maine Coon', 'Tigrado', 'Frajola'],
  BIRD: ['Calopsita', 'Periquito', 'Jandaia', 'Agapornis'],
  RABBIT: ['Mini Lop', 'Fuzzy Lop', 'Lionhead'],
  RODENT: ['Hamster Sírio', 'Porquinho-da-índia', 'Chinchila'],
  OTHER: ['Outro'],
}

export const owners: SeedOwner[] = [
  {
    key: 'rafael',
    name: 'Rafael Moreira',
    birth: '1990-04-12',
    marital: 'Solteiro(a)',
    profession: 'Desenvolvedor(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.0771,
    lng: -42.788,
    avatar: 'rafael-avatar',
    bio: 'Dev de dia, tutor do Bento em tempo integral. Procurando parceiros de corrida na Potycabana 🏃‍♂️🐕',
    pets: [
      {
        key: 'bento',
        name: 'Bento',
        species: 'DOG',
        breed: 'Pastor Belga Malinois',
        sex: 'MALE',
        size: 'LARGE',
        purpose: 'BOTH',
        birth: '2020-06-02',
        bio: 'Inteligente, obediente e viciado em bolinha. Vacinas em dia.',
        photos: ['bento-1', 'bento-2'],
      },
    ],
    posts: [
      [
        'rafael-1',
        'Home office com supervisão integral. O Bento aprova cada linha de código (ou só quer carinho mesmo).',
        'bento',
        0.2,
      ],
      [
        'rafael-2',
        'Domingo é dia de sofá e série. Ele escolhe o episódio, eu pago a ração 😂',
        'bento',
        2,
      ],
      [
        'rafael-3',
        'Esse olhar quando eu pego a coleira… alguém mais tem um cachorro que entende tudo?',
        'bento',
        4,
      ],
      [
        'rafael-4',
        'Primeiro dia dele no escritório pet friendly. Já virou o queridinho do time!',
        'bento',
        7,
      ],
    ],
  },
  {
    key: 'julia',
    name: 'Júlia Ramos',
    birth: '1995-09-30',
    marital: 'Namorando',
    profession: 'Designer',
    city: 'Teresina',
    state: 'PI',
    lat: -5.069,
    lng: -42.7935,
    avatar: 'julia-avatar',
    bio: 'Eu, o Pedro e a Pipoca 🍕 Conta do casal mais bagunceiro do Fátima.',
    pets: [
      {
        key: 'pipoca',
        name: 'Pipoca',
        species: 'DOG',
        breed: 'Jack Russell Terrier',
        sex: 'FEMALE',
        size: 'SMALL',
        purpose: 'FRIENDSHIP',
        birth: '2021-11-15',
        bio: 'Energia infinita, ama pizza (só a borda!) e outros cachorros pequenos.',
        photos: ['pipoca-1', 'pipoca-2'],
      },
    ],
    posts: [
      ['julia-1', 'Café da manhã na cama… e advinha quem acordou primeiro? 🐶☕', 'pipoca', 0.5],
      [
        'julia-2',
        'Sábado preguiçoso no apê novo. A Pipoca já escolheu o lugar dela no sofá.',
        'pipoca',
        3,
      ],
      ['julia-3', 'Noite de filme a três. Spoiler: ela dormiu antes da metade.', 'pipoca', 5],
      ['julia-4', 'Ela mandando em casa como sempre 💛', 'pipoca', 8],
      ['julia-5', 'Quem precisa de cobertor tendo uma jack russell?', 'pipoca', 10],
    ],
  },
  {
    key: 'camila',
    name: 'Camila Duarte',
    birth: '1988-02-21',
    marital: 'Casado(a)',
    profession: 'Fotógrafo(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.056,
    lng: -42.7945,
    avatar: 'camila-avatar',
    bio: 'Fotógrafa de natureza. Trilhas aos fins de semana com a Mel e o Caramelo 🍂',
    pets: [
      {
        key: 'mel',
        name: 'Mel',
        species: 'DOG',
        breed: 'Labrador',
        sex: 'FEMALE',
        size: 'LARGE',
        purpose: 'BOTH',
        birth: '2019-03-10',
        bio: 'A labradora mais sorridente da trilha. Adora água e crianças.',
        photos: ['mel-1'],
      },
      {
        key: 'caramelo',
        name: 'Caramelo',
        species: 'DOG',
        breed: 'Cocker Spaniel',
        sex: 'MALE',
        size: 'MEDIUM',
        purpose: 'FRIENDSHIP',
        birth: '2023-05-04',
        bio: 'Filhote curioso, ainda aprendendo a não roubar meias.',
        photos: ['caramelo-1'],
      },
    ],
    posts: [
      ['camila-1', 'Ela não cabe mais no colo, mas ninguém avisou ela 🤍 #labrador', 'mel', 1],
      ['camila-2', 'Trilha de outono. Melhor terapia que existe.', 'mel', 6],
    ],
  },
  {
    key: 'larissa',
    name: 'Larissa Costa',
    birth: '1993-07-08',
    marital: 'Solteiro(a)',
    profession: 'Psicólogo(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.085,
    lng: -42.784,
    avatar: 'larissa-avatar',
    bio: 'Psicóloga e mãe da Kira, uma husky com olhos de outro planeta 💙',
    pets: [
      {
        key: 'kira',
        name: 'Kira',
        species: 'DOG',
        breed: 'Husky Siberiano',
        sex: 'FEMALE',
        size: 'LARGE',
        purpose: 'BOTH',
        birth: '2021-01-19',
        bio: 'Fala mais do que eu. Precisa de muito exercício e de amigos para correr.',
        photos: ['kira-1', 'kira-2', 'kira-3'],
      },
    ],
    posts: [
      [
        'larissa-1',
        'Fim de tarde olhando o horizonte. Ela pensa na vida, eu penso no jantar dela.',
        'kira',
        0.8,
      ],
      ['larissa-2', 'Passeio de domingo no parque 🌳', 'kira', 3.5],
      ['larissa-3', 'Rotina de 6h da manhã. Quem tem husky sabe: cansar é obrigatório.', 'kira', 6],
      ['larissa-4', 'Ela viu um lago. Fim.', 'kira', 9],
    ],
  },
  {
    key: 'diego',
    name: 'Diego Ferreira',
    birth: '1987-12-03',
    marital: 'Divorciado(a)',
    profession: 'Engenheiro(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.0905,
    lng: -42.812,
    avatar: 'diego-avatar',
    bio: 'Engenheiro, corredor amador e tutor de dois furacões.',
    pets: [
      {
        key: 'thor',
        name: 'Thor',
        species: 'DOG',
        breed: 'Husky Siberiano',
        sex: 'MALE',
        size: 'LARGE',
        purpose: 'BOTH',
        birth: '2020-08-25',
        bio: 'Pedigree, calmo dentro de casa e incansável na rua.',
        photos: ['thor-1', 'thor-2'],
      },
      {
        key: 'nuvem',
        name: 'Nuvem',
        species: 'DOG',
        breed: 'Cockapoo',
        sex: 'FEMALE',
        size: 'SMALL',
        purpose: 'FRIENDSHIP',
        birth: '2022-10-01',
        bio: 'Uma bolinha de pelo que acha que é do tamanho do Thor.',
        photos: ['nuvem-1'],
      },
    ],
    posts: [
      [
        'diego-1',
        'Corrida de fim de dia com o parceiro. 5 km e ele ainda queria mais.',
        'thor',
        1.5,
      ],
      ['diego-2', 'Posando como se não tivesse acabado de rolar na lama.', 'thor', 7],
    ],
  },
  {
    key: 'bianca',
    name: 'Bianca Lopes',
    birth: '1997-05-17',
    marital: 'Solteiro(a)',
    profession: 'Jornalista',
    city: 'Teresina',
    state: 'PI',
    lat: -5.0668,
    lng: -42.778,
    avatar: 'bianca-avatar',
    bio: 'Jornalista, café e gatos. A Frida é a editora-chefe desta casa 🐈',
    pets: [
      {
        key: 'frida',
        name: 'Frida',
        species: 'CAT',
        breed: 'Tigrado',
        sex: 'FEMALE',
        size: 'SMALL',
        purpose: 'FRIENDSHIP',
        birth: '2019-12-24',
        bio: 'Adotada no Natal. Desconfiada no começo, grudenta depois.',
        photos: ['frida-1', 'frida-2'],
      },
    ],
    posts: [
      [
        'bianca-1',
        'Adotar foi a melhor decisão que eu já tomei. Adote, não compre 🧡',
        'frida',
        0.3,
      ],
      ['bianca-2', 'A árvore de Natal é dela, só deixamos enfeitar.', 'frida', 4.5],
      ['bianca-3', 'Modo soneca: ativado.', 'frida', 11],
    ],
  },
  {
    key: 'natalia',
    name: 'Natália Pires',
    birth: '1994-10-10',
    marital: 'União estável',
    profession: 'Chef de cozinha',
    city: 'Timon',
    state: 'MA',
    lat: -5.0947,
    lng: -42.8366,
    avatar: 'natalia-avatar',
    bio: 'Chef, tatuada e mãe de primeira viagem de um filhote laranja.',
    pets: [
      {
        key: 'pacoca',
        name: 'Paçoca',
        species: 'CAT',
        breed: 'Sem raça definida',
        sex: 'MALE',
        size: 'SMALL',
        purpose: 'FRIENDSHIP',
        birth: '2024-03-01',
        bio: 'Resgatado com 40 dias. Agora manda na cozinha.',
        photos: ['pacoca-1'],
      },
    ],
    posts: [
      [
        'natalia-1',
        'Meu novo acessório favorito 🧡 Ele não desce do ombro por nada.',
        'pacoca',
        2.2,
      ],
    ],
  },
  {
    key: 'felipe',
    name: 'Felipe Andrade',
    birth: '1991-01-28',
    marital: 'Casado(a)',
    profession: 'Professor(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.105,
    lng: -42.7605,
    avatar: 'felipe-avatar',
    bio: 'Professor de história. O Chico é meu aluno mais bagunceiro.',
    pets: [
      {
        key: 'chico',
        name: 'Chico',
        species: 'CAT',
        breed: 'Tigrado',
        sex: 'MALE',
        size: 'SMALL',
        purpose: 'BOTH',
        birth: '2023-09-12',
        bio: 'Curioso, brincalhão e castrado. Procurando amigos felinos.',
        photos: ['chico-1', 'chico-2'],
      },
    ],
    posts: [
      ['felipe-1', 'Olha essa carinha de quem acabou de derrubar o copo da mesa.', 'chico', 1.2],
      ['felipe-2', 'Crescendo rápido demais 🥲', 'chico', 8],
    ],
  },
  {
    key: 'renata',
    name: 'Renata Souza',
    birth: '1986-06-14',
    marital: 'Casado(a)',
    profession: 'Advogado(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.0788,
    lng: -42.771,
    avatar: 'renata-avatar',
    bio: 'Advogada nos dias úteis, tutora do Mingau em tempo integral.',
    pets: [
      {
        key: 'mingau',
        name: 'Mingau',
        species: 'CAT',
        breed: 'Frajola',
        sex: 'MALE',
        size: 'MEDIUM',
        purpose: 'FRIENDSHIP',
        birth: '2018-04-04',
        bio: 'Senhor gato de 6 anos. Gosta de silêncio e sol da manhã.',
        photos: ['mingau-1', 'mingau-2'],
      },
    ],
    posts: [
      [
        'renata-1',
        'Férias merecidas, com direito a visita felina na beira da piscina 🌞',
        null,
        2.8,
      ],
      ['renata-2', 'O Mingau descobriu o raio de sol da manhã e não sai mais dali.', 'mingau', 12],
    ],
  },
  {
    key: 'aline',
    name: 'Aline Martins',
    birth: '1999-03-03',
    marital: 'Solteiro(a)',
    profession: 'Estudante',
    city: 'Teresina',
    state: 'PI',
    lat: -5.104,
    lng: -42.797,
    avatar: 'aline-avatar',
    bio: 'Estudante de veterinária 🩺 e tutora do Biscoito.',
    pets: [
      {
        key: 'biscoito',
        name: 'Biscoito',
        species: 'DOG',
        breed: 'Shih Tzu',
        sex: 'MALE',
        size: 'SMALL',
        purpose: 'BOTH',
        birth: '2022-07-20',
        bio: 'Pequeno no tamanho, gigante na personalidade.',
        photos: ['biscoito-1'],
      },
    ],
    posts: [
      ['aline-1', 'Dia de frio = Biscoito dentro do casaco. Regra da casa.', 'biscoito', 0.6],
    ],
  },
  {
    key: 'mariana',
    name: 'Mariana Teixeira',
    birth: '1992-08-09',
    marital: 'Casado(a)',
    profession: 'Arquiteto(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.026,
    lng: -42.812,
    avatar: 'mariana-avatar',
    bio: 'Arquiteta, apaixonada por café, pug e beagle (nessa ordem? não sei).',
    pets: [
      {
        key: 'feijao',
        name: 'Feijão',
        species: 'DOG',
        breed: 'Pug',
        sex: 'MALE',
        size: 'SMALL',
        purpose: 'BOTH',
        birth: '2020-02-14',
        bio: 'Ronca, baba e é o melhor amigo do mundo.',
        photos: ['feijao-1', 'feijao-2'],
      },
      {
        key: 'duque',
        name: 'Duque',
        species: 'DOG',
        breed: 'Beagle',
        sex: 'MALE',
        size: 'MEDIUM',
        purpose: 'FRIENDSHIP',
        birth: '2019-09-09',
        bio: 'Nariz em primeiro lugar. Segue qualquer cheiro de petisco.',
        photos: ['duque-1', 'duque-2'],
      },
    ],
    posts: [
      [
        'mariana-1',
        'Café da tarde com companhia. O Feijão finge que não está de olho no meu bolo.',
        'feijao',
        1.8,
      ],
      ['mariana-2', 'Passeio cultural de domingo 🏯', 'feijao', 9.5],
    ],
  },
  {
    key: 'antonio',
    name: 'Antônio Carvalho',
    birth: '1956-11-02',
    marital: 'Viúvo(a)',
    profession: 'Aposentado(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.095,
    lng: -42.805,
    avatar: 'antonio-avatar',
    bio: 'Aposentado, colecionador de carros antigos e de amigos de quatro patas.',
    pets: [
      {
        key: 'barao',
        name: 'Barão',
        species: 'DOG',
        breed: 'Cão d’Água',
        sex: 'MALE',
        size: 'MEDIUM',
        purpose: 'FRIENDSHIP',
        birth: '2017-05-30',
        bio: 'Companheiro de estrada. Adora passeio de carro com a janela aberta.',
        photos: ['barao-1'],
      },
      {
        key: 'dourado',
        name: 'Dourado',
        species: 'DOG',
        breed: 'Golden Retriever',
        sex: 'MALE',
        size: 'LARGE',
        purpose: 'BOTH',
        birth: '2021-12-12',
        bio: 'Neto do meu primeiro golden. Doce como o nome.',
        photos: ['dourado-1'],
      },
    ],
    posts: [
      [
        'antonio-1',
        'Passeio de domingo com os meninos. Eles adoram sentir o vento! Aos 68 anos, a melhor companhia que eu poderia ter.',
        'barao',
        3,
      ],
    ],
  },
  {
    key: 'thiago',
    name: 'Thiago Martins',
    birth: '1996-12-19',
    marital: 'Solteiro(a)',
    profession: 'Autônomo(a)',
    city: 'Parnaíba',
    state: 'PI',
    lat: -2.9055,
    lng: -41.7769,
    avatar: 'thiago-avatar',
    bio: 'Surfista e adestrador nas horas vagas. Praia, sol e cachorros 🌊',
    pets: [
      {
        key: 'algodao',
        name: 'Algodão',
        species: 'DOG',
        breed: 'Sem raça definida',
        sex: 'MALE',
        size: 'SMALL',
        purpose: 'FRIENDSHIP',
        birth: '2024-01-10',
        bio: 'Filhote resgatado na praia. Aprendendo a dar a pata!',
        photos: ['algodao-1'],
      },
      {
        key: 'akira',
        name: 'Akira',
        species: 'DOG',
        breed: 'Shiba Inu',
        sex: 'FEMALE',
        size: 'MEDIUM',
        purpose: 'BOTH',
        birth: '2020-10-10',
        bio: 'Independente, elegante e dramática. Típica shiba.',
        photos: ['akira-1', 'akira-2'],
      },
    ],
    posts: [
      ['thiago-1', 'Aula de “dá a pata” na beira da praia. Progresso: 50% 😅', 'algodao', 0.9],
    ],
  },
  {
    key: 'paula',
    name: 'Paula Mendes',
    birth: '1990-09-25',
    marital: 'Namorando',
    profession: 'Enfermeiro(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.0712,
    lng: -42.796,
    avatar: 'paula-avatar',
    bio: 'Enfermeira, plantonista e mãe de duas: a Pretinha e a Fofa.',
    pets: [
      {
        key: 'pretinha',
        name: 'Pretinha',
        species: 'DOG',
        breed: 'Labrador',
        sex: 'FEMALE',
        size: 'LARGE',
        purpose: 'BOTH',
        birth: '2019-06-06',
        bio: 'Calma, carinhosa e ótima com outros cães.',
        photos: ['pretinha-1', 'pretinha-2'],
      },
      {
        key: 'fofa',
        name: 'Fofa',
        species: 'DOG',
        breed: 'Lulu da Pomerânia',
        sex: 'FEMALE',
        size: 'SMALL',
        purpose: 'FRIENDSHIP',
        birth: '2022-04-18',
        bio: 'Pequena, barulhenta e muito amorosa.',
        photos: ['fofa-1', 'fofa-2'],
      },
    ],
    posts: [
      [
        'paula-1',
        'Depois de um plantão de 12h, isso aqui é tudo que eu preciso 🖤',
        'pretinha',
        1.1,
      ],
      ['paula-2', 'A Pretinha esperando eu chegar em casa. Todo dia.', 'pretinha', 6.5],
    ],
  },
  {
    key: 'sofia',
    name: 'Sofia Almeida',
    birth: '1998-02-11',
    marital: 'Solteiro(a)',
    profession: 'Médico(a) veterinário(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.0545,
    lng: -42.7925,
    avatar: 'sofia-avatar',
    bio: 'Veterinária de silvestres e aves 🦜 Tutora da Manga.',
    pets: [
      {
        key: 'manga',
        name: 'Manga',
        species: 'BIRD',
        breed: 'Jandaia',
        sex: 'FEMALE',
        size: 'SMALL',
        purpose: 'BOTH',
        birth: '2021-05-05',
        bio: 'Jandaia-amarela de criadouro legalizado, cheia de opinião.',
        photos: ['manga-1', 'manga-2'],
      },
    ],
    posts: [
      ['sofia-1', 'Café da manhã servido na mão. Ela só come se for assim 🧡', 'manga', 0.4],
      ['sofia-2', 'Agapornis de uma paciente: amor que não cabe no galho 💚', null, 5.5],
    ],
  },
  {
    key: 'carla',
    name: 'Carla Nunes',
    birth: '1985-04-27',
    marital: 'Casado(a)',
    profession: 'Administrador(a)',
    city: 'Teresina',
    state: 'PI',
    lat: -5.108,
    lng: -42.7562,
    avatar: 'carla-avatar',
    bio: 'Coelhos não são brinquedo: são família. A Pantufa que o diga 🐰',
    pets: [
      {
        key: 'pantufa',
        name: 'Pantufa',
        species: 'RABBIT',
        breed: 'Mini Lop',
        sex: 'FEMALE',
        size: 'SMALL',
        purpose: 'FRIENDSHIP',
        birth: '2022-03-20',
        bio: 'Orelhas caídas, coração gigante. Ama feno fresco.',
        photos: ['pantufa-1', 'pantufa-2'],
      },
    ],
    posts: [
      ['carla-1', 'Banho de sol no quintal ☀️', 'pantufa', 2.5],
      ['carla-2', 'Essas orelhas deveriam ser patrimônio nacional.', 'pantufa', 7.5],
      ['carla-3', 'Visitei uma criadora responsável e me apaixonei por esses dois 🩶', null, 13],
    ],
  },
]

/** Comentários genéricos para dar vida ao feed (sorteados de forma determinística). */
export const commentPool = [
  'Que fofura! 😍',
  'Morri com essa foto',
  'Lindo demais!!',
  'Quero um igual 🥹',
  'Que olhar!',
  'Bora marcar um passeio juntos?',
  'Ele é muito parecido com o meu',
  'Que paz essa foto transmite',
  'Melhor perfil do TinPet 😂',
  'Que pelagem linda!',
  'Manda beijo pra ele(a)!',
  'Isso que é vida boa',
  'Aqui em casa é igualzinho kkkk',
  'Que carinha de sapeca',
  'Amei a legenda 😂',
  'Que foto incrível!',
  'Precisamos de um encontro dos pets!',
  'Coisa mais linda 💛',
  'Já quero ver mais fotos',
  'Que bom que adotou! ❤️',
]

export const articles: {
  slug: string
  title: string
  summary: string
  category: ArticleCategory
  cover: string
  readMinutes: number
  daysAgo: number
  body: string
}[] = [
  {
    slug: 'calendario-de-vacinas-de-caes-e-gatos',
    title: 'Vacinas em dia: o que todo tutor precisa saber',
    summary:
      'Por que vacinar, quando começar e como manter o cartão de vacinação do seu pet organizado.',
    category: 'HEALTH',
    cover: 'noticia-vacinas',
    readMinutes: 4,
    daysAgo: 0.5,
    body: `A vacinação é a forma mais simples e eficaz de proteger cães e gatos contra doenças graves, muitas delas transmissíveis entre animais e algumas até para pessoas, como a raiva.

## Quando começar

Filhotes costumam iniciar o protocolo entre 6 e 8 semanas de vida, com doses de reforço nas semanas seguintes. O esquema exato depende da idade, do histórico e do estilo de vida do animal, por isso quem define é o médico-veterinário.

## Adultos também precisam

Depois da série inicial, os reforços geralmente são anuais. Pets que frequentam creches, parques e hotéis podem precisar de vacinas adicionais.

## Dica de organização

Guarde o cartão de vacinação em local fácil, tire uma foto dele no celular e anote a data do próximo reforço na agenda. Em breve o TinPet vai ter uma carteira de vacinação digital.

Antes de marcar encontros pelo TinPet, combine com o outro tutor: vacinas em dia são um sinal de respeito com o pet do outro.`,
  },
  {
    slug: 'passeios-no-calor',
    title: 'Calor intenso: como passear sem colocar seu cão em risco',
    summary:
      'Asfalto quente queima patinhas. Veja horários, sinais de alerta e cuidados para os dias mais quentes.',
    category: 'HEALTH',
    cover: 'noticia-calor',
    readMinutes: 3,
    daysAgo: 1.5,
    body: `Nos dias quentes, o asfalto pode ficar muito mais quente que o ar e queimar as almofadinhas das patas.

## O teste dos 5 segundos

Encoste o dorso da mão no chão por cinco segundos. Se estiver desconfortável para você, está quente demais para o seu cão.

## Melhores horários

Prefira o começo da manhã e o fim da tarde. Leve água fresca e faça pausas na sombra.

## Sinais de alerta

Respiração muito ofegante, salivação excessiva, gengiva muito vermelha, fraqueza ou vômito podem indicar hipertermia. Leve o animal para a sombra, ofereça água e procure atendimento veterinário imediatamente.

Raças de focinho curto, como pugs e bulldogs, e cães idosos merecem atenção redobrada.`,
  },
  {
    slug: 'adocao-responsavel',
    title: 'Adoção responsável: um guia para o primeiro mês',
    summary:
      'Do primeiro dia em casa à adaptação com a família: como tornar a chegada do novo pet tranquila.',
    category: 'ADOPTION',
    cover: 'noticia-adocao',
    readMinutes: 5,
    daysAgo: 2.5,
    body: `Adotar é um gesto de amor e também um compromisso de muitos anos. Planejar a chegada ajuda o animal a se sentir seguro mais rápido.

## Antes de buscar

Prepare um cantinho com cama, potes de água e comida e alguns brinquedos. Retire do alcance fios, produtos de limpeza e plantas que possam ser tóxicas.

## Os primeiros dias

Mantenha a rotina previsível, apresente a casa aos poucos e evite muitas visitas. Medo e desconfiança no início são normais.

## Saúde

Marque uma consulta logo na primeira semana para avaliação geral, vermifugação e planejamento de vacinas e castração.

## Paciência

A adaptação completa pode levar semanas. Recompense os comportamentos que você quer ver e procure ajuda de um adestrador que use reforço positivo se precisar.`,
  },
  {
    slug: 'alimentacao-equilibrada',
    title: 'Ração, petiscos e comida caseira: como equilibrar a dieta',
    summary: 'Entenda rótulos, porções e os alimentos que nunca devem ir para o pote do seu pet.',
    category: 'NUTRITION',
    cover: 'noticia-alimentacao',
    readMinutes: 4,
    daysAgo: 3.5,
    body: `Uma alimentação adequada é a base da saúde. A quantidade certa depende de peso, idade, porte e nível de atividade.

## Lendo o rótulo

Rações completas informam se são indicadas para filhotes, adultos ou idosos. A tabela de porções é um ponto de partida: ajuste com a orientação do veterinário.

## Petiscos com moderação

Petiscos não devem passar de cerca de 10% das calorias do dia. Use-os como recompensa no adestramento.

## Alimentos perigosos

Chocolate, uva e uva-passa, cebola, alho, abacate, xilitol (adoçante) e bebidas alcoólicas são tóxicos para cães. Para gatos, cebola, alho e leite também costumam causar problemas.

Quer oferecer comida caseira? Só com uma dieta formulada por veterinário nutricionista.`,
  },
  {
    slug: 'linguagem-dos-gatos',
    title: 'O que seu gato está tentando dizer',
    summary:
      'Cauda, orelhas, piscadas lentas e ronronados: um pequeno dicionário do comportamento felino.',
    category: 'BEHAVIOR',
    cover: 'noticia-gatos',
    readMinutes: 3,
    daysAgo: 4.5,
    body: `Gatos se comunicam o tempo todo, só que de um jeito mais sutil que os cães.

## Cauda

Cauda levantada com a ponta curvada costuma indicar um gato confiante e amigável. Cauda batendo de um lado para o outro pode ser sinal de irritação.

## Piscada lenta

Quando o gato olha para você e fecha os olhos devagar, é um sinal de confiança. Experimente devolver a piscada.

## Ronronar

Na maioria das vezes significa conforto, mas gatos também ronronam quando sentem dor ou estresse. Observe o contexto.

## Amassar pãozinho

Esse movimento com as patas vem da época de filhote e está ligado a sensação de segurança.`,
  },
  {
    slug: 'cuidados-com-coelhos',
    title: 'Coelhos em apartamento: cuidados que fazem diferença',
    summary:
      'Feno à vontade, espaço para se exercitar e atenção aos dentes: o básico para um coelho feliz.',
    category: 'CURIOSITIES',
    cover: 'noticia-coelhos',
    readMinutes: 4,
    daysAgo: 5.5,
    body: `Coelhos são animais sociais, curiosos e que vivem em média de 8 a 12 anos com os cuidados certos.

## Feno é a base

A maior parte da dieta deve ser feno de boa qualidade, sempre disponível. Ele ajuda no funcionamento do intestino e no desgaste natural dos dentes, que crescem a vida toda.

## Espaço para pular

Gaiolas pequenas não bastam. Reserve um cercadinho amplo e momentos soltos em ambiente seguro, sem fios expostos.

## Veterinário especializado

Procure um profissional que atenda animais exóticos para consultas de rotina.`,
  },
  {
    slug: 'aves-de-estimacao',
    title: 'Aves de estimação: enriquecimento ambiental e convivência',
    summary:
      'Brinquedos, banho de sol e companhia: como manter calopsitas e periquitos ativos e saudáveis.',
    category: 'CURIOSITIES',
    cover: 'noticia-aves',
    readMinutes: 3,
    daysAgo: 6.5,
    body: `Aves são inteligentes e precisam de estímulos diários para não ficarem entediadas.

## Enriquecimento

Ofereça poleiros de diferentes espessuras, brinquedos para destruir e esconda petiscos para estimular a busca.

## Convivência

Muitas espécies são sociais e sofrem quando passam o dia sozinhas. Reserve tempo de interação todos os dias.

## Legalidade

Compre ou adote somente aves de criadouros autorizados. Nunca compre animais silvestres sem documentação: além de crime, isso alimenta o tráfico.`,
  },
  {
    slug: 'viajar-com-pet',
    title: 'Pé na estrada: como viajar de carro com seu pet',
    summary:
      'Cinto de segurança para cães, paradas estratégicas e o que levar na bagagem do seu companheiro.',
    category: 'CURIOSITIES',
    cover: 'noticia-viagem',
    readMinutes: 3,
    daysAgo: 8,
    body: `Viajar com o pet pode ser muito divertido com um pouco de preparo.

## Segurança

Use caixa de transporte presa ao carro ou cinto de segurança próprio para pets. Nada de animal solto no colo do motorista.

## Paradas

Pare a cada duas ou três horas para água, xixi e uma caminhada curta.

## Na mala

Ração, potes, coleira com plaquinha de identificação, cartão de vacinação, remédios de uso contínuo e um brinquedo conhecido para trazer conforto.`,
  },
  {
    slug: 'pets-idosos',
    title: 'Pets idosos: mais carinho, mais cuidado',
    summary:
      'Mudanças de comportamento, exames de rotina e adaptações simples para a melhor idade do seu pet.',
    category: 'HEALTH',
    cover: 'noticia-idosos',
    readMinutes: 4,
    daysAgo: 10,
    body: `Cães e gatos entram na fase sênior por volta dos 7 anos, dependendo do porte e da espécie.

## Consultas mais frequentes

Check-ups semestrais ajudam a detectar cedo problemas comuns da idade, como doenças renais, cardíacas e articulares.

## Adaptações em casa

Tapetes antiderrapantes, rampas para o sofá e camas mais macias fazem diferença no conforto.

## Atividade na medida

Passeios mais curtos e frequentes mantêm músculos e mente ativos sem sobrecarregar as articulações.`,
  },
  {
    slug: 'feira-de-adocao-sao-paulo',
    title: 'Feiras de adoção: como participar e ajudar',
    summary:
      'Seja adotando, sendo voluntário ou divulgando: veja como as feiras de adoção funcionam.',
    category: 'EVENTS',
    cover: 'noticia-feira',
    readMinutes: 2,
    daysAgo: 12,
    body: `Feiras de adoção acontecem com frequência em parques, pet shops e praças de várias cidades, organizadas por ONGs e protetores independentes.

## Para adotar

Leve documento com foto e comprovante de residência. A ONG costuma fazer uma entrevista e pode pedir uma visita à casa.

## Para ajudar

Mesmo sem adotar, você pode ser voluntário, oferecer lar temporário, doar ração ou compartilhar os animais disponíveis nas redes.

Fique de olho na aba de notícias do TinPet: vamos divulgar eventos de parceiros por aqui.`,
  },
]

export interface SeedPromotion {
  headline: string
  discountPercent: number | null
  couponCode: string | null
  species: Species[]
  radiusKm: number
  /** Horas até acabar (ofertas relâmpago têm poucas horas). */
  endsInHours: number
}

export interface SeedCompany {
  name: string
  email: string
  tradeName: string
  cnpj: string
  phone: string
  website: string | null
  kind: CompanyKind
  description: string
  city: string
  state: string
  neighborhood: string
  lat: number
  lng: number
  delivers: boolean
  products: {
    title: string
    priceCents: number
    category: ProductCategory
    description: string
    image: string
    species: Species[]
    promotion?: SeedPromotion
  }[]
}

/**
 * Lojas FICTÍCIAS em bairros reais de Teresina (coordenadas do OpenStreetMap). Nomes conferidos
 * para não coincidir com lojas existentes: ofertas e cupons de demonstração não podem parecer
 * promoções de um comércio real. Preços com base em referências de mercado de 2026.
 */
export const companies: SeedCompany[] = [
  {
    name: 'Ana Paula Ferreira',
    email: 'pet',
    tradeName: 'Pet Cajuína Rações',
    cnpj: '12345678000190',
    phone: '(86) 98888-0001',
    website: null,
    kind: 'PETSHOP',
    description:
      'Rações, petiscos e farmácia veterinária. Entrega no mesmo dia na zona leste, de moto.',
    city: 'Teresina',
    state: 'PI',
    neighborhood: 'Jóquei',
    lat: -5.0758,
    lng: -42.7902,
    delivers: true,
    products: [
      {
        title: 'Ração Premium Cães Adultos 15 kg',
        priceCents: 22990,
        category: 'FOOD',
        description:
          'Ração premium com proteína de frango e arroz, sem corantes artificiais. Raças médias e grandes.',
        image: 'produto-racao',
        species: ['DOG'],
        promotion: {
          headline: 'Ração do mês com 20% off',
          discountPercent: 20,
          couponCode: 'CAJUINA20',
          species: ['DOG'],
          radiusKm: 15,
          endsInHours: 5,
        },
      },
      {
        title: 'Antipulgas e carrapatos (3 doses)',
        priceCents: 15990,
        category: 'HEALTH',
        description:
          'Proteção mensal para cães de 10 a 25 kg. No calor de Teresina o carrapato não dá trégua: siga a orientação do veterinário.',
        image: 'produto-antipulgas',
        species: ['DOG'],
      },
      {
        title: 'Cama ortopédica para gatos idosos',
        priceCents: 12990,
        category: 'ACCESSORIES',
        description: 'Espuma de alta densidade e capa lavável. Ideal para gatos sênior.',
        image: 'produto-cama',
        species: ['CAT'],
      },
    ],
  },
  {
    name: 'José Ribamar Sousa',
    email: 'carnauba',
    tradeName: 'Rações Carnaúba',
    cnpj: '98765432000110',
    phone: '(86) 97777-0002',
    website: null,
    kind: 'PETSHOP',
    description:
      'Casa de rações de bairro: ração a granel por quilo, aves, petiscos e preço justo. Desde o tempo do meu pai.',
    city: 'Teresina',
    state: 'PI',
    neighborhood: 'Itararé',
    lat: -5.1042,
    lng: -42.7588,
    delivers: true,
    products: [
      {
        title: 'Ração a granel para cães (1 kg)',
        priceCents: 1290,
        category: 'FOOD',
        description: 'Leve só o que precisa. Pesamos na hora, com saco reforçado.',
        image: 'produto-racao',
        species: ['DOG'],
        promotion: {
          headline: 'Leve 10 kg e pague 9',
          discountPercent: 10,
          couponCode: null,
          species: ['DOG'],
          radiusKm: 10,
          endsInHours: 72,
        },
      },
      {
        title: 'Mistura de sementes para calopsita (1 kg)',
        priceCents: 1890,
        category: 'FOOD',
        description:
          'Painço, alpiste, girassol e aveia. Complemente com frutas e verduras frescas.',
        image: 'produto-racao',
        species: ['BIRD'],
      },
      {
        title: 'Bola com corda resistente',
        priceCents: 2990,
        category: 'TOYS',
        description: 'Borracha atóxica, ótima para cabo de guerra.',
        image: 'produto-brinquedo',
        species: ['DOG'],
      },
    ],
  },
  {
    name: 'Juliana Prado',
    email: 'espuma',
    tradeName: 'Espuma & Patas Banho e Tosa',
    cnpj: '45678912000133',
    phone: '(86) 96666-0003',
    website: null,
    kind: 'GROOMING',
    description:
      'Banho, tosa higiênica e tosa na tesoura com hora marcada. Leva e traz no Fátima, Jóquei e Horto.',
    city: 'Teresina',
    state: 'PI',
    neighborhood: 'Fátima',
    lat: -5.0676,
    lng: -42.7918,
    delivers: true,
    products: [
      {
        title: 'Banho para pequeno porte',
        priceCents: 5000,
        category: 'SERVICES',
        description:
          'Produtos hipoalergênicos, corte de unhas e limpeza de ouvidos. Secagem sem barulho para pets ansiosos.',
        image: 'produto-banho',
        species: ['DOG', 'CAT'],
        promotion: {
          headline: 'Primeiro banho com 30% off',
          discountPercent: 30,
          couponCode: 'PRIMEIROBANHO',
          species: [],
          radiusKm: 12,
          endsInHours: 2,
        },
      },
      {
        title: 'Banho e tosa higiênica (médio porte)',
        priceCents: 7500,
        category: 'SERVICES',
        description: 'Tosa da barriga, patas e região íntima. Ideal para os meses mais quentes.',
        image: 'produto-banho',
        species: ['DOG'],
      },
    ],
  },
  {
    name: 'Marcos Tanaka',
    email: 'miau',
    tradeName: 'Miau do Piauí',
    cnpj: '32165498000144',
    phone: '(86) 95555-0004',
    website: null,
    kind: 'STORE',
    description:
      'Loja só para felinos: arranhadores, caminhas, fontes de água e brinquedos de enriquecimento.',
    city: 'Teresina',
    state: 'PI',
    neighborhood: 'Ininga',
    lat: -5.0556,
    lng: -42.793,
    delivers: true,
    products: [
      {
        title: 'Fonte de água para gatos',
        priceCents: 13990,
        category: 'ACCESSORIES',
        description:
          'Água corrente e filtrada estimula o gato a beber mais, o que ajuda muito no calor.',
        image: 'produto-cama',
        species: ['CAT'],
        promotion: {
          headline: 'Fonte para gatos: 25% off hoje',
          discountPercent: 25,
          couponCode: 'MIAU25',
          species: ['CAT'],
          radiusKm: 20,
          endsInHours: 9,
        },
      },
      {
        title: 'Varinha com penas e guizo',
        priceCents: 2490,
        category: 'TOYS',
        description: 'Estimula o instinto de caça. Uso sempre com supervisão.',
        image: 'produto-brinquedo',
        species: ['CAT'],
      },
    ],
  },
  {
    name: 'Rafael Nunes',
    email: 'quintal',
    tradeName: 'Quintal do Poty',
    cnpj: '15975345000166',
    phone: '(86) 94444-0006',
    website: null,
    kind: 'STORE',
    description:
      'Coleiras, guias e acessórios para passear cedinho ou no fim da tarde, fugindo do sol forte.',
    city: 'Teresina',
    state: 'PI',
    neighborhood: 'Horto',
    lat: -5.0655,
    lng: -42.7768,
    delivers: false,
    products: [
      {
        title: 'Peitoral acolchoado anti-puxão',
        priceCents: 8990,
        category: 'ACCESSORIES',
        description:
          'Ajuste em 4 pontos, tecido respirável e faixa refletiva para passeio à noite.',
        image: 'produto-peitoral',
        species: ['DOG'],
        promotion: {
          headline: 'Passeio sem puxão: 15% off',
          discountPercent: 15,
          couponCode: null,
          species: ['DOG'],
          radiusKm: 15,
          endsInHours: 48,
        },
      },
      {
        title: 'Guia retrátil 5 m',
        priceCents: 7990,
        category: 'ACCESSORIES',
        description: 'Trava de segurança e empunhadura emborrachada.',
        image: 'produto-guia',
        species: ['DOG'],
      },
    ],
  },
  {
    name: 'Fernanda Lopes',
    email: 'chapada',
    tradeName: 'Clínica Veterinária Chapada',
    cnpj: '74185296000155',
    phone: '(86) 93333-0005',
    website: null,
    kind: 'VET_CLINIC',
    description:
      'Consultas, vacinas e check-up para cães, gatos e aves. Atendimento com hora marcada.',
    city: 'Teresina',
    state: 'PI',
    neighborhood: 'Noivos',
    lat: -5.0838,
    lng: -42.7842,
    delivers: false,
    products: [
      {
        title: 'Check-up completo com exames',
        priceCents: 25000,
        category: 'SERVICES',
        description:
          'Consulta, hemograma e avaliação odontológica. Recomendado uma vez por ano, e a cada 6 meses para pets idosos.',
        image: 'produto-antipulgas',
        species: [],
        promotion: {
          headline: 'Check-up sênior com 10% off',
          discountPercent: 10,
          couponCode: 'CHAPADA10',
          species: [],
          radiusKm: 30,
          endsInHours: 168,
        },
      },
      {
        title: 'Vacina V10 (aplicação)',
        priceCents: 9000,
        category: 'HEALTH',
        description: 'Aplicação com registro na carteirinha de vacinação.',
        image: 'produto-antipulgas',
        species: ['DOG'],
      },
    ],
  },
]
