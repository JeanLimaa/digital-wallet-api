# Digital Wallet Backend

## Descrição do Projeto

API RESTful para uma carteira digital desenvolvida com **NestJS**, **TypeScript**, **Prisma ORM** e **PostgreSQL**. O sistema permite cadastro de usuários, autenticação JWT, depósitos, transferências entre usuários e reversão de transações.

## 🚀 Como Executar

### Pré-requisitos

- Node.js 20+ ou Docker
- PostgreSQL 16+ (ou usar Docker Compose)

### Opção 1: Com Docker Compose (Recomendado)

```bash
# Clonar o repositório
git clone git@github.com:JeanLimaa/digital-wallet-backend.git
cd digital-wallet-backend

# Subir os containers
docker-compose up -d

# Executar migrações dentro do container da API
docker-compose exec api npx prisma migrate dev

# A porta é configurável via variável de ambiente PORT.
# A API estará disponível em http://localhost:3000
# A documentação Swagger em http://localhost:3000/api/docs
```

### Opção 2: Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Executar migrações do banco
npx prisma migrate dev

# Iniciar em modo desenvolvimento
npm run start:dev
```

## 📚 Documentação da API

A documentação completa está disponível via Swagger em: `http://localhost:3000/api/docs`

## 🧪 Testes

### Executar Testes Unitários

```bash
# Executar todos os testes unitários
npm run test
```

### Executar Testes de Integração (E2E)

```bash
# Criar um arquivo de variáveis de ambiente para testes
cp .env.example .env.test
# Editar .env.test com as configurações de banco de teste

# Migrar banco de teste
npm run prisma:test:migrate

# Certifique-se que o banco está rodando
npm run test:e2e
```