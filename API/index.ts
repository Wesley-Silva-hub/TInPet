import { PrismaClient } from '@prisma/client';
import { hash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = hash("Admin", '8');
  // Adiciona dados ao modelo EstadoCivil
  


  const estadoCivil1 = await prisma.estadoCivil.create({
    data: {
      descricao: 'Solteiro',
    },
  });

  const estadoCivil2 = await prisma.estadoCivil.create({
    data: {
      descricao: 'Casado',
    },
  });

  // Adiciona dados ao modelo Profissao
  const profissao1 = await prisma.profissao.create({
    data: {
      descricao: 'Desenvolvedor',
    },
  });

  const profissao2 = await prisma.profissao.create({
    data: {
      descricao: 'Designer',
    },
  });

  // Adiciona dados ao modelo Tipo_Usuario
  const tipoUsuario1 = await prisma.tipo_Usuario.create({
    data: {
      descricao: 'Admin',
    },
  });

  const tipoUsuario2 = await prisma.tipo_Usuario.create({
    data: {
      descricao: 'Usuário',
    },
  });

  // Adiciona dados ao modelo Usuario
  await prisma.usuario.create({
    data: {
      nomeUsuario: 'joao_doe',
      senha_hash: passwordHash,
      email: 'joao.doe@example.com',
      nome_completo: 'João Doe',
      foto_url_usuario: ['http://example.com/foto1.jpg'],
      estado_civil: estadoCivil1.id_estadoCivil,
      profissao_id: profissao1.id_profissao,
      tipo_usuario_id: tipoUsuario1.id_tipo_usuario,
      biografia: 'Desenvolvedor apaixonado por tecnologia.',
      data_nascimento: new Date('1990-01-01'),
      contador_curtida: 0,
      latitude_usuario: -23.5505,
      longitude_usuario: -46.6333,
    },
  });

  console.log('Dados inseridos com sucesso!');
}

main()
  .catch(e => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
