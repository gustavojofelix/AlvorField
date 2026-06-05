# AlvorField — Frontend AgriTech (Angular 21)

Esta é a versão inicial do frontend da plataforma **AlvorField** (SaaS agrícola para Moçambique), construída com **Angular 21** e **Angular Material**, utilizando componentes autónomos (_standalone_) e uma interface com design premium, mobile-first e totalmente adaptada à identidade de agricultura e tecnologia de Moçambique.

---

## 🛠️ Tecnologias Utilizadas

- **Angular 21.2.x** (Standalone Components, Routing, Reactive Forms)
- **Angular Material** (Inputs, Cards, Buttons, Menus, Chips, SnackBars)
- **SCSS (Sass)** com tema customizado (Verde Primário `#2E7D32` e Azul Acento `#1565C0`)
- **Inter Font** (Tipografia moderna e limpa via Google Fonts)

---

## 🚀 Como Executar o Projecto Localmente

### 1. Instalar as Dependências

Abra o terminal no directório raiz do projecto e execute:

```bash
npm install --force
```

### 2. Iniciar o Servidor de Desenvolvimento

Execute o comando do Angular CLI para iniciar a aplicação localmente:

```bash
npm start
```

Após o arranque, abra o navegador em `http://localhost:4200/`.

---

## 🌾 Funcionalidades & Demonstração do Fluxo de Autenticação

A aplicação possui um simulador de autenticação de alta fidelidade sem a necessidade imediata de ligar a um backend real (será integrado com o Supabase no futuro).

### 💡 Contas Demonstrativas (Quick-Login)

Na tela de login, foram criados **3 utilizadores de exemplo pré-carregados (JSON)** representando cada um dos perfis do ecossistema:

1. **Mateus Tembe (Produtor)**
   - 📞 Telefone: `841234567` | 🔑 Password: `password123`
   - _Finalidade:_ Produção de hortícolas orgânicas e tubérculos em Macia, Gaza.
2. **Lúcia Maputo (Consumidor)**
   - 📞 Telefone: `829876543` | 🔑 Password: `password123`
   - _Finalidade:_ Supermercados e distribuidores de Maputo Cidade que compram em grande escala.
3. **AgroInvest Moçambique (Investidor)**
   - 📞 Telefone: `855554433` | 🔑 Password: `password123`
   - _Finalidade:_ Financiamento de estufas, regas gota-a-gota e modernização agrícola.

> **Dica de Teste:** Basta clicar em qualquer um dos cards de demonstração na tela de login para auto-preencher os dados e simular a autenticação imediata!

### 📋 Páginas do Projecto

- **/login (Página de Login):** Apresentação das vantagens do ecossistema na coluna esquerda (desktop) e formulário intuitivo com área de utilizadores demonstrativos rápidos na direita.
- **/register (Página de Registo):** Permite o registo de novos perfis com dados específicos (Nome, Telefone, Perfil, Localidade e Descrição da Machamba/Abastecimento).
- **/dashboard (Painel de Controlo):** Protegido por rotas. Dependendo do perfil autenticado, apresenta ferramentas específicas (como publicação de colheitas, propostas comerciais ou análise de investimentos), além de um painel de transações recentes (ligando o campo às cidades) e cotação de preços reais do mercado de Moçambique (SIMA).

---

## 📦 Estrutura de Pastas Implementada

```text
src/
 ├── app/
 │    ├── components/
 │    │    └── header/                # Cabeçalho global com menu de perfil e logout
 │    ├── guards/
 │    │    └── auth.guard.ts          # Proteção de rotas para o painel
 │    ├── pages/
 │    │    ├── login/                 # Login com utilizadores rápidos
 │    │    ├── register/              # Registo de perfis e negócios
 │    │    └── dashboard/             # Painel customizado por perfil + cotações
 │    ├── services/
 │    │    └── auth.service.ts        # Serviço de simulação de login/registo
 │    ├── app.component.*             # Estrutura principal
 │    ├── app.config.ts               # Provedores globais (Router + Animations)
 │    └── app.routes.ts               # Mapeamento de rotas com lazy load
 ├── index.html                       # Importação de fontes (Inter) e ícones
 └── styles.scss                      # Tema e estilo geral do AlvorField
```
