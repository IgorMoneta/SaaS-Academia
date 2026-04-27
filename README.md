# SaaS-Academia================================================================================
              FITSAAS — COMO RODAR O PROJETO (PASSO A PASSO)
================================================================================


════════════════════════════════════════════════════════════════════════════════
PRÉ-REQUISITOS
════════════════════════════════════════════════════════════════════════════════

Antes de começar, instale:

  1. Node.js (versão 18 ou superior)
     → https://nodejs.org  (baixe a versão LTS)
     → Para verificar se já tem: abra o terminal e digite:
          node --version
          npm --version

  2. Git (opcional, só se for clonar via Git)
     → https://git-scm.com


════════════════════════════════════════════════════════════════════════════════
PARTE 1 — RODAR O FRONTEND (OBRIGATÓRIO)
════════════════════════════════════════════════════════════════════════════════

Passo 1: Baixar o projeto
─────────────────────────
  Opção A (ZIP):
    - Baixe o arquivo ZIP do projeto
    - Extraia em uma pasta (ex: C:\Projetos\SaaS Academia)

  Opção B (Git):
    git clone <URL_DO_REPOSITORIO>
    cd "SaaS Academia"


Passo 2: Abrir o terminal na pasta do projeto
──────────────────────────────────────────────
  Windows:
    - Abra a pasta no Explorador de Arquivos
    - Clique com botão direito → "Abrir no Terminal"
    ou
    - Abra o Prompt de Comando (cmd) e navegue:
         cd "C:\Projetos\SaaS Academia"

  Mac/Linux:
    - Abra o Terminal
    - cd "/caminho/para/SaaS Academia"


Passo 3: Instalar as dependências
───────────────────────────────────
  npm install

  Aguarde terminar (pode demorar 1-2 minutos na primeira vez).


Passo 4: Rodar o projeto
─────────────────────────
  npm run dev

  O terminal vai mostrar algo assim:
    VITE v5.4.21  ready in 1753 ms
    ➜  Local:   http://localhost:5173/

  Deixe o terminal aberto enquanto usa o projeto.


Passo 5: Abrir no navegador
────────────────────────────
  Abra o navegador (Chrome, Edge, Firefox) e acesse:

    http://localhost:5173


════════════════════════════════════════════════════════════════════════════════
CONTAS DE TESTE
════════════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────┐
  │  Perfil    │  Email                  │  Senha       │
  ├────────────┼─────────────────────────┼──────────────┤
  │  Admin     │  admin@saas.com         │  123         │
  │  Aluno     │  aluno@fitsaas.com      │  123         │
  └────────────┴─────────────────────────┴──────────────┘

  Com o login de Aluno você verá as 3 abas principais:
    → Treino   — ficha de exercícios e registro de cargas
    → Medidas  — formulário + recomendação automática por ML
    → Dieta    — chatbot de orientação nutricional


════════════════════════════════════════════════════════════════════════════════
PARTE 2 — RODAR O BACKEND (OPCIONAL)
════════════════════════════════════════════════════════════════════════════════

O backend é necessário apenas para:
  - Usar o modelo de ML real (quando o dataset for treinado)
  - Ativar o chatbot com IA real (via Claude API)

Sem o backend, o projeto roda normalmente com dados simulados.

─────────────────────────────────────────────────────────────────────────────
Passo 1: Instalar Python (versão 3.10 ou superior)
─────────────────────────────────────────────────────────────────────────────
  → https://www.python.org/downloads/
  → Durante a instalação, marque: "Add Python to PATH"
  → Verificar: python --version


Passo 2: Criar ambiente virtual
────────────────────────────────
  (Dentro da pasta do projeto, no terminal)

  cd backend
  python -m venv venv

  Ativar o ambiente:
    Windows:   venv\Scripts\activate
    Mac/Linux: source venv/bin/activate

  O terminal vai mostrar (venv) no início da linha.


Passo 3: Instalar dependências Python
───────────────────────────────────────
  pip install -r requirements.txt


Passo 4: Configurar a chave da API do Claude (para o chatbot)
───────────────────────────────────────────────────────────────
  - Crie uma cópia do arquivo .env.example com o nome .env
  - Abra o .env e preencha:
       ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
  - Chave disponível em: https://console.anthropic.com


Passo 5: Rodar o backend
─────────────────────────
  (Ainda dentro da pasta backend, com o venv ativado)

  uvicorn main:app --reload --port 8000

  O terminal vai mostrar:
    Uvicorn running on http://0.0.0.0:8000

  Deixe este terminal aberto também.


Passo 6: Treinar o modelo ML (quando tiver o dataset)
───────────────────────────────────────────────────────
  (Ainda dentro da pasta backend, com o venv ativado)

  python ml/train.py --dataset caminho/para/dataset.csv

  Após treinar, o arquivo model.pkl será criado automaticamente.
  O endpoint /api/predict passa a usar o modelo real.


════════════════════════════════════════════════════════════════════════════════
RESUMO DOS COMANDOS
════════════════════════════════════════════════════════════════════════════════

  Frontend (obrigatório):
    npm install
    npm run dev
    → Acesse: http://localhost:5173

  Backend (opcional):
    cd backend
    python -m venv venv
    venv\Scripts\activate        (Windows)
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
    → API em: http://localhost:8000


════════════════════════════════════════════════════════════════════════════════
PROBLEMAS COMUNS
════════════════════════════════════════════════════════════════════════════════

  "npm não é reconhecido"
  → Node.js não está instalado ou não está no PATH.
  → Reinstale o Node.js de https://nodejs.org e reinicie o terminal.

  "Porta 5173 já está em uso"
  → Outro processo está usando a porta. O Vite usa automaticamente a 5174.
  → Acesse http://localhost:5174 no navegador.

  "Cannot find module ..."
  → Você esqueceu de rodar: npm install
  → Rode npm install e tente novamente.

  "Python não é reconhecido"
  → Python não está no PATH. Reinstale marcando "Add Python to PATH".

  A página abre mas está em branco
  → Abra as Ferramentas do Desenvolvedor (F12) → Console
  → Copie o erro e consulte o desenvolvedor.

================================================================================
                  FitSaaS — Qualquer dúvida, entre em contato.
================================================================================
