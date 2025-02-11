
# 🐾 TinPet

**Bem-vindo ao TinPet!**  
O TinPet é uma aplicação web que conecta donos de animais de estimação, permitindo que eles deem "match" entre seus pets e encontrem o par perfeito. Além disso, o TinPet oferece um marketplace para que empresas possam anunciar seus produtos para pets.

## 🌟 **Funcionalidades Principais**

- **Login/Cadastro:** Criação e autenticação de usuários.
- **Feed de Pets:** Deslize entre fotos de pets para encontrar o par ideal para o seu animal de estimação.
- **Marketplace:** Anuncie e encontre produtos para pets, como rações e acessórios.
- **Perfil do Dono:** Exiba informações sobre o dono do pet, incluindo estado civil, idade, profissão e uma biografia.

## 🛠️ **Tecnologias Utilizadas**

### **Frontend**

- **React.js**: Framework JavaScript para construir interfaces de usuário.
- **Styled-Components**: Para estilização dos componentes React.
- **Axios**: Para realizar requisições HTTP.
- **React-Icons e React-Toastify**: Para ícones e notificações.

### **Backend**

- **Node.js** com **Express.js**: Servidor web para lidar com as rotas da API.
- **Prisma**: ORM utilizado para comunicação com o banco de dados.
- **PostgreSQL**: Banco de dados relacional para armazenamento de dados.

### **Desenvolvimento Mobile**

- **React Native**: Para o desenvolvimento de aplicativos móveis nativos.

### **Hospedagem e Infraestrutura**

- **Docker & Kubernetes**: Gerenciamento e orquestração de contêineres.
- **AWS ou GCP**: Hospedagem e serviços escaláveis.

## 📐 **Modelo Entidade-Relacionamento**

Aqui está o modelo ER utilizado para a estruturação do banco de dados:

![Modelo ER](https://prod-files-secure.s3.us-west-2.amazonaws.com/697b76be-2f87-4ca9-be05-ac9d22421d8b/29c2774d-a664-4147-a8ba-c9bd1871db04/MER_TinPet.drawio_(2).png)

## 🚀 **Como Rodar o Projeto**

### **Backend**

1. Clone o repositório:
   ```bash
   git clone https://github.com/Wesley-Silva-hub/TInPet.git
   cd TInPet/API
   ```

2. Instale as dependências:
   ```bash
   yarn install
   ```

3. Inicie o servidor:
   ```bash
   yarn start
   ```

### **Frontend**

1. Vá para a pasta do frontend:
   ```bash
   cd TInPet/FRONTED
   ```

2. Instale as dependências:
   ```bash
   yarn install
   ```

3. Inicie a aplicação:
   ```bash
   yarn start
   ```

## 🌍 **Hospedagem e Deploy**

O projeto pode ser hospedado utilizando serviços como **AWS** ou **Google Cloud Platform** (GCP) com suporte para Docker e Kubernetes.

## 🏥 **Ideias de Aprimoramento**

- **Acompanhamento Médico:** Adicionar uma seção para que os donos possam registrar informações de saúde dos seus pets.
- **Dog Walker:** Implementar uma funcionalidade para conectar donos de pets com passeadores de cães.

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
