import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const pegarProfissao = async (_, res) => {
  try {
    const profissoes = await prisma.profissao.findMany();
    res.status(200).json(profissoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};
export default pegarProfissao;
//aqui estamos exportando a função pegarUsuarios que é responsável por buscar todos os usuários no banco de dados.
//caso ocorra algum erro, retornamos um status 500 com a mensagem de erro.