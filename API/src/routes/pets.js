import express from 'express';
import pegarPets from '../controllers/pets.js';
export const rotaPets = express.Router();

rotaPets.get('/', pegarPets);

export default rotaPets
// //aqui estamos exportando a rota de usuários que é responsável por buscar todos os usuários no banco de dados.;