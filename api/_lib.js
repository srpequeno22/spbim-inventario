// Código compartilhado pelas rotas da API (arquivos com "_" não viram rota na Vercel).
// Só o servidor fala com o Supabase. O navegador nunca recebe nenhuma chave do banco.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY; // chave secreta (service_role): só existe na Vercel
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY; // usada só para o login

if (!URL || !SECRET || !PUBLISHABLE) {
  console.error('Faltam variáveis de ambiente: SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY');
}

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
/** Acesso ao banco com a chave secreta. Usar SOMENTE depois de validar o usuário. */
export const db = () => createClient(URL, SECRET, opts);
/** Cliente para login / renovação de sessão. */
export const authClient = () => createClient(URL, PUBLISHABLE, opts);

/* Coleções que o site pode ler e gravar (qualquer outra chave é recusada) */
export const CHAVES = new Set(['items', 'movs', 'per', 'cmp', 'acts', 'assets', 'loans', 'maint', 'trash', 'hw', 'users', 'low']);

/* ---------------- cookies de sessão (httpOnly: o JavaScript da página não consegue ler) ---------------- */
const AT = 'spbim_at'; // token de acesso (~1 h)
const RT = 'spbim_rt'; // token de renovação
const DIAS_SESSAO = 7;
const seguro = () => process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';

function cookie(nome, valor, maxAge) {
  return [
    `${nome}=${encodeURIComponent(valor)}`,
    'Path=/api',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
    seguro() ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

export function gravarSessao(res, session) {
  res.setHeader('Set-Cookie', [
    cookie(AT, session.access_token, session.expires_in || 3600),
    cookie(RT, session.refresh_token, DIAS_SESSAO * 86400),
  ]);
}

export function limparSessao(res) {
  res.setHeader('Set-Cookie', [cookie(AT, '', 0), cookie(RT, '', 0)]);
}

function lerCookies(req) {
  const out = {};
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0) {
      try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch { /* cookie inválido */ }
    }
  }
  return out;
}

/**
 * Confere o login do pedido. Se o token de acesso venceu, renova com o token de renovação.
 * Devolve o usuário do Supabase ou null.
 */
export async function usuarioDaSessao(req, res) {
  const c = lerCookies(req);
  if (c[AT]) {
    const { data, error } = await db().auth.getUser(c[AT]);
    if (!error && data?.user) return data.user;
  }
  if (c[RT]) {
    const { data, error } = await authClient().auth.refreshSession({ refresh_token: c[RT] });
    if (!error && data?.session && data.user) {
      gravarSessao(res, data.session);
      return data.user;
    }
  }
  return null;
}

export function tokenDeAcesso(req) {
  return lerCookies(req)[AT] || null;
}

/* ---------------- proteções comuns ---------------- */

/** Bloqueia pedidos que alteram dados vindos de outro site (CSRF). */
export function mesmaOrigem(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  const origem = req.headers.origin;
  if (!origem) return false;
  try { return new globalThis.URL(origem).host === req.headers.host; } catch { return false; }
}

export function enviar(res, status, corpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(corpo));
}

/** Formato do usuário que o site espera */
export const publico = (u) => ({ user: { id: u.id, email: u.email, user_metadata: u.user_metadata || {} } });

/**
 * Envolve uma rota: limita métodos, checa origem, (opcionalmente) exige login e trata erros.
 */
export function rota(metodos, handler, { exigeLogin = true } = {}) {
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!metodos.includes(req.method)) {
      res.setHeader('Allow', metodos.join(', '));
      return enviar(res, 405, { erro: 'Método não permitido' });
    }
    if (!mesmaOrigem(req)) return enviar(res, 403, { erro: 'Origem não permitida' });
    if (req.method !== 'GET' && !String(req.headers['content-type'] || '').startsWith('application/json')) {
      return enviar(res, 415, { erro: 'Envie JSON' });
    }
    try {
      let usuario = null;
      if (exigeLogin) {
        usuario = await usuarioDaSessao(req, res);
        if (!usuario) {
          limparSessao(res);
          return enviar(res, 401, { erro: 'Faça login novamente' });
        }
      }
      return await handler(req, res, usuario);
    } catch (e) {
      console.error(e);
      return enviar(res, 500, { erro: 'Erro interno' });
    }
  };
}
