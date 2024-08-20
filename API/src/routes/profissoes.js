import express from 'express';
import pegarProfissao from '../controllers/profissoes.js';
export const rotaProfissoes = express.Router();

rotaProfissoes.get('/', pegarProfissao);

export default rotaProfissoes
// //aqui estamos exportando a rota de usuários que é responsável por buscar todos os usuários no banco de dados.;