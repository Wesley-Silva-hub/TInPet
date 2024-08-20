import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const pegarUsuarios = async (_, res) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};
export default pegarUsuarios;
//aqui estamos exportando a função pegarUsuarios que é responsável por buscar todos os usuários no banco de dados.
//caso ocorra algum erro, retornamos um status 500 com a mensagem de erro.