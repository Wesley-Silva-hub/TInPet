import express from 'express';
import cors from 'cors';
import {rotaProfissoes} from './src/routes/profissoes.js';
import {rotaUsuarios} from './src/routes/usuarios.js';
import {rotaPets} from './src/routes/pets.js';
const app = express();
app.use(express.json());
app.use(cors());
app.use("/usuarios", rotaUsuarios);
app.use("/profissoes", rotaProfissoes);
app.use("/pets", rotaPets);
app.listen(3000, () => {
  console.log('Servidor do TinPet está rodando na Localhost na porta 3000');
});
