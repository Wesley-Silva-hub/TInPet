import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Criando dados iniciais de Estado Civil
  const solteiro = await prisma.estadoCivil.create({
    data: { descricao: 'Solteiro' },
  });

  const casado = await prisma.estadoCivil.create({
    data: { descricao: 'Casado' },
  });

  // Criando dados iniciais de Profissão
  const desenvolvedor = await prisma.profissao.create({
    data: { descricao: 'Desenvolvedor' },
  });

  const engenheiro = await prisma.profissao.create({
    data: { descricao: 'Engenheiro' },
  });

  // Criando dados iniciais de Tipo de Usuário
  const admin = await prisma.tipo_Usuario.create({
    data: { descricao: 'Administrador' },
  });

  const usuario = await prisma.tipo_Usuario.create({
    data: { descricao: 'Usuário' },
  });

  // Criando dados iniciais de Usuário
  const usuario1 = await prisma.usuario.create({
    data: {
      id_estadoCivil: solteiro.id_estadoCivil,
      id_profissao: desenvolvedor.id_profissao,
      id_tipo_usuario: usuario.id_tipo_usuario,
      nomeUsuario: 'jose123',
      senha_hash: 'senhaSegura123',
      email: 'jose@example.com',
      nome_completo: 'José Wesley',
      foto_url_usuario: ['https://example.com/foto1.jpg'],
      biografia: 'Sou desenvolvedor de software.',
      data_nascimento: new Date('1990-01-01'),
      contador_curtida: 100,
      latitude_usuario: -23.55052,
      longitude_usuario: -46.633308,
    },
  });

  const usuario2 = await prisma.usuario.create({
    data: {
      id_estadoCivil: casado.id_estadoCivil,
      id_profissao: engenheiro.id_profissao,
      id_tipo_usuario: admin.id_tipo_usuario,
      nomeUsuario: 'maria456',
      senha_hash: 'senhaSegura456',
      email: 'maria@example.com',
      nome_completo: 'Maria Silva',
      foto_url_usuario: ['https://example.com/foto2.jpg'],
      biografia: 'Sou engenheira civil.',
      data_nascimento: new Date('1985-05-15'),
      contador_curtida: 200,
      latitude_usuario: -22.906847,
      longitude_usuario: -43.172897,
    },
  });

  console.log({ usuario1, usuario2 });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
