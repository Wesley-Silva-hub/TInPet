import EstiloGlobal from "./style/global";
import styled from 'styled-components';
import { toast, ToastContainer } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';
import Formulario from './components/form.js';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  gap: 10px;
`;

const Titulo = styled.h1`
  font-size: 2rem;
  color: #333;
`;

function App() {
  return (
    <>  
      <Container>
        <Titulo>Bem-Vindo ao TinPet</Titulo>
        <Formulario />
      </Container>
      <ToastContainer autoClose={3000} position="bottom-right" />
      <EstiloGlobal />
    </>
  );
}

export default App;
