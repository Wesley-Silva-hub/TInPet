import React from "react";
import styled from "styled-components";
import { useRef } from "react"; 

const ContainerFormulario = styled.div` 
    display: flex;
    justify-content: center;
    align-items: center; /* Centraliza verticalmente */
    flex-direction: column; /* Coloca os itens em uma coluna (vertical) */
    margin: 20px;
    height: 100vh;
    width: 50vw;
    gap: 2px;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    background-color: #fff;
    padding: 20px;
`;

const AreaFormulario = styled.form`
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
`;
const Label = styled.label``;

const Input = styled.input`
    width: 100%;
    padding: 2px;
    border-radius: 5px;
    border: 1px solid #ccc;
`; 

const Button = styled.button`
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    border: none;
    background-color: #333;
    color: #fff;
    cursor: pointer;
    transition: 0.3s;
    &:hover {
        background-color: #444;
    }
`;

const Formulario = ({onEdit}) => {
    const ref = useRef();

    return (
        <ContainerFormulario ref={ref}>
            <AreaFormulario>
                <Label>Nome</Label>
                <Input type="text" name="nome_usuario" />
            </AreaFormulario>

            <AreaFormulario>
                <Label>Idade</Label>
                <Input type="number" name="idade" />
            </AreaFormulario>

            <AreaFormulario>
                <Label>Email</Label>
                <Input type="email" name="email" />
            </AreaFormulario>
            <Button type="Submit">SALVAR</Button>
        </ContainerFormulario>
    );
};

export default Formulario;