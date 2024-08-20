import {createGlobalStyle} from 'styled-components';


const EstiloGlobal = createGlobalStyle`
    * {
        margin: 0;
        padding: 0;
        font-family: 'poppins', sans-serif;
    }   
    body {
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Roboto', sans-serif;
        background-color: #f0f0f0;
    }   
`;

export default EstiloGlobal;