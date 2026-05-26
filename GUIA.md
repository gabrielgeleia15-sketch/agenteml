# 🚀 Agente ML v2 — Guia Completo

## O que você tem

- `server.js` — servidor com proteção por senha
- `index.html` — app mobile-first com 5 seções
- `GUIA.md` — este arquivo

---

## PARTE 1 — Testar localmente primeiro

### 1. Instale o Node.js
Acesse **https://nodejs.org**, baixe a versão **LTS** e instale normalmente.

### 2. Configure as chaves
Abra o `server.js` e edite o bloco CONFIG:

```javascript
const CONFIG = {
  ANTHROPIC_KEY : 'sk-ant-sua-chave-aqui',
  ML_TOKEN      : 'APP_USR-seu-token-aqui',
  APP_PASSWORD  : 'senha-que-voces-vao-usar',
  PORT          : 3000,
};
```

### 3. Rode o servidor
Abra o terminal na pasta do projeto e execute:
```
node server.js
```

### 4. Acesse
Abra o navegador em **http://localhost:3000** e entre com a senha configurada.

---

## PARTE 2 — Subir no Railway (gratuito, acesso de qualquer lugar)

### Passo 1 — Criar conta no Railway
Acesse **https://railway.app** e crie uma conta gratuita (pode usar login do Google).

### Passo 2 — Criar conta no GitHub
O Railway precisa do código no GitHub. Acesse **https://github.com** e crie uma conta gratuita.

### Passo 3 — Criar repositório no GitHub
1. No GitHub, clique em **"New repository"**
2. Nome: `agente-ml`
3. Marque **"Private"** (seus arquivos ficam privados)
4. Clique em **"Create repository"**

### Passo 4 — Subir os arquivos
Na página do repositório criado, clique em **"uploading an existing file"** e arraste os arquivos `server.js` e `index.html`. Depois clique em **"Commit changes"**.

### Passo 5 — Conectar ao Railway
1. No Railway, clique em **"New Project"**
2. Escolha **"Deploy from GitHub repo"**
3. Conecte sua conta GitHub e selecione o repositório `agente-ml`
4. O Railway vai detectar o `server.js` automaticamente

### Passo 6 — Configurar as variáveis de ambiente
⚠️ **Importante:** no Railway você NÃO coloca as chaves no código — usa variáveis de ambiente (mais seguro).

1. Na dashboard do projeto, clique em **"Variables"**
2. Adicione uma por uma:

| Nome | Valor |
|------|-------|
| `ANTHROPIC_KEY` | sua chave da Anthropic |
| `ML_TOKEN` | seu token do Mercado Livre |
| `APP_PASSWORD` | a senha que vocês vão usar |

3. O Railway reinicia automaticamente com as novas variáveis.

### Passo 7 — Pegar o link público
1. Clique em **"Settings"** → **"Networking"** → **"Generate Domain"**
2. Você receberá um link tipo: `https://agente-ml-production.up.railway.app`
3. Compartilhe este link com as 3 pessoas — é só abrir no navegador ou celular!

---

## Limites do plano gratuito do Railway

| Item | Limite gratuito |
|------|----------------|
| Horas de uso | 500h/mês (~16h/dia) |
| RAM | 512 MB (mais que suficiente) |
| Largura de banda | 100 GB/mês |
| Projetos | 1 projeto gratuito |

Para 3 pessoas usando durante o horário comercial, o plano gratuito aguenta bem.
Se precisar de mais, o plano pago é ~$5/mês.

---

## Atualizando o app no futuro

Quando quiser fazer mudanças:
1. Edite os arquivos localmente
2. Vá no GitHub → repositório → clique no arquivo → ícone de lápis para editar
3. O Railway faz o deploy automaticamente em ~1 minuto

---

## Adicionando o app na tela inicial do celular

### iPhone
1. Abra o link no Safari
2. Toque no botão de compartilhar (quadrado com seta)
3. Toque em **"Adicionar à Tela de Início"**
4. Confirme — vai aparecer como um app normal!

### Android
1. Abra o link no Chrome
2. Toque nos 3 pontinhos no canto superior
3. Toque em **"Adicionar à tela inicial"**
4. Confirme

---

## Problemas comuns

**"Senha incorreta"** → Verifique a variável `APP_PASSWORD` no Railway ou no `server.js` local.

**"Servidor não encontrado"** → Localmente: verifique se `node server.js` está rodando. No Railway: veja os logs na dashboard.

**"Token ML inválido"** → O Access Token expira. Gere um novo no portal de desenvolvedores do ML e atualize a variável no Railway.

**"IA offline"** → Verifique se a `ANTHROPIC_KEY` está correta e se há saldo na conta Anthropic.
