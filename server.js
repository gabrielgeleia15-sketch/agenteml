// ============================================================
//  AGENTE ML v2 — Servidor
//  Compatível com Railway (gratuito) e uso local
// ============================================================

const http = require('http');
const fs   = require('fs');
const path = require('path');

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────
// No Railway: configure estas como variáveis de ambiente
// Localmente: edite os valores abaixo diretamente
const CONFIG = {
  ANTHROPIC_KEY : process.env.ANTHROPIC_KEY  || 'SUA_CHAVE_ANTHROPIC_AQUI',
  ML_TOKEN      : process.env.ML_TOKEN       || 'SEU_ACCESS_TOKEN_ML_AQUI',
  APP_PASSWORD  : process.env.APP_PASSWORD   || '1234',   // senha de acesso ao app
  PORT          : process.env.PORT           || 3000,
};

// ─── SYSTEM PROMPT ───────────────────────────────────────────
const AGENT_SYSTEM = `Você é o Agente ML, assistente especializado em Mercado Livre Brasil.
Ajuda vendedores com: performance de anúncios, precificação, títulos, descrições, promoções, Product Ads, reputação e atendimento a compradores.

REGRAS:
- Português brasileiro informal mas profissional
- Respostas objetivas e acionáveis, sem enrolação
- Títulos ML: máx 60 caracteres, palavras-chave no início, sem pontuação desnecessária
- Preços: sempre considere custo + frete + comissão ML (11-16%) + impostos
- Respostas a compradores: cordial, claro, dentro das políticas do ML
- Use negrito e listas quando ajudar na leitura
- Ao analisar perguntas reais: identifique padrões, sugira templates reutilizáveis`;

// ─── HELPERS ─────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON inválido')); } });
  });
}

function send(res, status, data, extra = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Password',
    ...extra,
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
  if (!fs.existsSync(filePath)) return send(res, 404, { error: 'Arquivo não encontrado' });
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fs.readFileSync(filePath));
}

function authCheck(req, res) {
  const pwd = req.headers['x-app-password'];
  if (pwd !== CONFIG.APP_PASSWORD) {
    send(res, 401, { error: 'Senha incorreta' });
    return false;
  }
  return true;
}

// ─── ROTAS ───────────────────────────────────────────────────

async function handleChat(req, res) {
  if (!authCheck(req, res)) return;
  const { messages, context } = await parseBody(req);
  let system = AGENT_SYSTEM;
  if (context) system += `\n\nCONTEXTO:\n${context}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system, messages }),
  });

  const data = await r.json();
  if (!r.ok) return send(res, 500, { error: data });
  send(res, 200, { reply: data.content?.map(b => b.text || '').join('') || '' });
}

async function handleQuestions(req, res) {
  if (!authCheck(req, res)) return;
  const [p, a] = await Promise.all([
    fetch('https://api.mercadolibre.com/my/received_questions/search?status=UNANSWERED&limit=20', { headers: { Authorization: `Bearer ${CONFIG.ML_TOKEN}` } }),
    fetch('https://api.mercadolibre.com/my/received_questions/search?status=ANSWERED&limit=40',   { headers: { Authorization: `Bearer ${CONFIG.ML_TOKEN}` } }),
  ]);
  const pending  = p.ok ? (await p.json()).questions || [] : [];
  const answered = a.ok ? (await a.json()).questions || [] : [];
  send(res, 200, { pending, answered });
}

async function handleAnswer(req, res) {
  if (!authCheck(req, res)) return;
  const { questionId, text } = await parseBody(req);
  const r = await fetch('https://api.mercadolibre.com/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CONFIG.ML_TOKEN}` },
    body: JSON.stringify({ question_id: questionId, text }),
  });
  const data = await r.json();
  send(res, r.ok ? 200 : 500, r.ok ? { success: true } : { error: data });
}

async function handleListings(req, res) {
  if (!authCheck(req, res)) return;
  const meR = await fetch('https://api.mercadolibre.com/users/me', { headers: { Authorization: `Bearer ${CONFIG.ML_TOKEN}` } });
  if (!meR.ok) return send(res, 500, { error: 'Token ML inválido.' });
  const { id } = await meR.json();

  const listR = await fetch(`https://api.mercadolibre.com/users/${id}/items/search?limit=20&status=active`, { headers: { Authorization: `Bearer ${CONFIG.ML_TOKEN}` } });
  const { results = [] } = await listR.json();
  if (!results.length) return send(res, 200, { listings: [] });

  const detR  = await fetch(`https://api.mercadolibre.com/items?ids=${results.slice(0,10).join(',')}`, { headers: { Authorization: `Bearer ${CONFIG.ML_TOKEN}` } });
  const dets  = await detR.json();
  const listings = (Array.isArray(dets) ? dets : []).filter(d => d.code === 200).map(d => ({
    id: d.body.id, title: d.body.title, price: d.body.price,
    sold_qty: d.body.sold_quantity, visits: d.body.visits,
    status: d.body.status, thumbnail: d.body.thumbnail, permalink: d.body.permalink,
  }));
  send(res, 200, { listings });
}

async function handleStatus(req, res) {
  const anthropicOk = CONFIG.ANTHROPIC_KEY !== 'SUA_CHAVE_ANTHROPIC_AQUI';
  const mlOk        = CONFIG.ML_TOKEN      !== 'SEU_ACCESS_TOKEN_ML_AQUI';
  let mlUser = null;
  if (mlOk) {
    try {
      const r = await fetch('https://api.mercadolibre.com/users/me', { headers: { Authorization: `Bearer ${CONFIG.ML_TOKEN}` } });
      if (r.ok) { const d = await r.json(); mlUser = d.nickname || d.first_name; }
    } catch {}
  }
  send(res, 200, { anthropicOk, mlOk, mlUser });
}

async function handleAuth(req, res) {
  const { password } = await parseBody(req);
  if (password === CONFIG.APP_PASSWORD) send(res, 200, { ok: true });
  else send(res, 401, { ok: false });
}

// ─── SERVIDOR ────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-App-Password' });
    return res.end();
  }

  // Arquivos estáticos
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html'))
    return sendFile(res, path.join(__dirname, 'index.html'), 'text/html; charset=utf-8');

  // API routes
  try {
    if (req.method === 'POST' && req.url === '/api/auth')        return await handleAuth(req, res);
    if (req.method === 'POST' && req.url === '/api/chat')        return await handleChat(req, res);
    if (req.method === 'GET'  && req.url === '/api/questions')   return await handleQuestions(req, res);
    if (req.method === 'POST' && req.url === '/api/answer')      return await handleAnswer(req, res);
    if (req.method === 'GET'  && req.url === '/api/listings')    return await handleListings(req, res);
    if (req.method === 'GET'  && req.url === '/api/status')      return await handleStatus(req, res);
    send(res, 404, { error: 'Rota não encontrada' });
  } catch (err) {
    console.error('Erro:', err.message);
    send(res, 500, { error: err.message });
  }
});

server.listen(CONFIG.PORT, () => {
  console.log(`\n  ✅ Agente ML rodando em http://localhost:${CONFIG.PORT}\n`);
  if (CONFIG.ANTHROPIC_KEY === 'SUA_CHAVE_ANTHROPIC_AQUI') console.log('  ⚠️  Configure ANTHROPIC_KEY');
  if (CONFIG.ML_TOKEN === 'SEU_ACCESS_TOKEN_ML_AQUI')      console.log('  ⚠️  Configure ML_TOKEN');
});
