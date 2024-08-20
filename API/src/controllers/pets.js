import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const pegarPets = async (_, res) => {
  try {
    const pets = await prisma.pet.findMany();
    res.status(200).json(pets);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};
export default pegarPets;
//aqui estamos exportando a função pegarUsuarios que é responsável por buscar todos os usuários no banco de dados.
//caso ocorra algum erro, retornamos um status 500 com a mensagem de erro.