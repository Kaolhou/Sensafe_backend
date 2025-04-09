# Sensafe_backend

Backend para o projeto Sensafe, uma solução focada em promover a acessibilidade para pessoas com deficiência através da integração com um dispositivo IoT específico. Este backend gerencia dados, autenticação e a comunicação necessária para o funcionamento do sistema.

## Propósito

O objetivo principal do Sensafe é fornecer ferramentas que auxiliem na independência e segurança de pessoas com deficiência. Este backend é a espinha dorsal do sistema, conectando o dispositivo IoT, o banco de dados e potenciais aplicações frontend ou mobile.

## Tecnologias Utilizadas

*   **Linguagem:** TypeScript
*   **Ambiente de Execução:** Node.js
*   **Framework:** Express.js (inferido pelo uso de `Request`, `Response`)
*   **Banco de Dados:** PostgreSQL
*   **Validação:** Zod
*   **Autenticação:** bcryptjs (para hashing de senhas), JWT (JSON Web Tokens - inferido por `generateToken`)
*   **Gerenciador de Pacotes:** npm ou yarn

*(Nota: O código de exemplo atual usa um `mockDB` em memória. As instruções abaixo assumem a configuração com PostgreSQL como pretendido para o projeto final.)*

## Pré-requisitos

Para rodar este projeto localmente, você precisará ter instalado:

*   Node.js (versão LTS recomendada)
*   npm ou yarn
*   PostgreSQL (servidor rodando localmente ou acessível)
*   Git

## Instalação e Configuração

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/Kaolhou/Sensafe_frontend.git
    cd Sensafe_backend
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configure as Variáveis de Ambiente:**
    *   Crie um arquivo `.env` na raiz do projeto.
    *   Copie o conteúdo de um arquivo `.env.example` (se existir) ou adicione as seguintes variáveis, ajustando os valores conforme necessário:
        ```dotenv
        # Configurações do Banco de Dados PostgreSQL
        DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME?schema=public"
        # Exemplo: DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/sensafe_db?schema=public"

        # Segredo para JWT (JSON Web Token)
        JWT_SECRET="SEU_SEGREDO_SUPER_SECRETO_AQUI"

        # Porta da Aplicação (opcional, padrão pode ser 3000 ou 5000)
        PORT=5000
        ```
    *   **Importante:** Certifique-se de que o usuário, senha, host, porta e nome do banco de dados (`DATABASE_NAME`) correspondam à sua configuração do PostgreSQL. Crie o banco de dados se ele ainda não existir.

4.  **Migrações do Banco de Dados (se aplicável):**
    *   Se o projeto usar um ORM como Prisma ou TypeORM, execute os comandos de migração para criar as tabelas no banco de dados. Exemplo (pode variar):
        ```bash
        npx prisma migrate dev --name init
        # ou
        npm run typeorm migration:run
        ```
    *   Se não houver sistema de migração, pode ser necessário executar um script SQL para configurar o schema inicial.

5.  **Build do Projeto (se necessário):**
    *   Como o projeto usa TypeScript, pode ser necessário compilar o código para JavaScript:
        ```bash
        npm run build
        # ou
        yarn build
        ```

## Rodando a Aplicação

*   **Modo de Desenvolvimento (com hot-reload, se configurado):**
    ```bash
    npm run dev
    # ou
    yarn dev
    ```

*   **Modo de Produção (após o build):**
    ```bash
    npm start
    # ou
    yarn start
    ```

A aplicação estará rodando na porta definida na variável de ambiente `PORT` (ou uma porta padrão, como 3000 ou 5000).

## Como Contribuir

Agradecemos o seu interesse em contribuir para o Sensafe! Para colaborar:

1.  **Faça um Fork** do repositório para a sua conta do GitHub.
2.  **Clone** o seu fork localmente (`git clone <URL_DO_SEU_FORK>`).
3.  **Crie uma Branch** para a sua modificação (`git checkout -b feature/sua-feature` ou `fix/seu-bug`).
4.  **Faça as alterações** desejadas no código.
5.  **Adicione e Commite** suas alterações com mensagens claras (`git add .`, `git commit -m 'feat: Adiciona funcionalidade X'`).
6.  **Envie** a sua branch para o seu fork no GitHub (`git push origin feature/sua-feature`).
7.  **Abra um Pull Request (PR)** no repositório original, descrevendo as suas alterações.

Se tiver dúvidas ou sugestões, sinta-se à vontade para abrir uma *Issue* no repositório para discussão. Toda contribuição é bem-vinda!
