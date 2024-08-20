import express from 'express';
import pegarUsuarios from '../controllers/usuarios.js';
export const rotaUsuarios = express.Router();

rotaUsuarios.get('/', pegarUsuarios);

export default rotaUsuarios;