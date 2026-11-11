// POST /api/logout  ->  encerra a sessão no Supabase e apaga os cookies
import { rota, db, limparSessao, tokenDeAcesso, enviar } from './_lib.js';

export default rota(['POST'], async (req, res) => {
  const token = tokenDeAcesso(req);
  if (token) {
    try { await db().auth.admin.signOut(token); } catch { /* sessão já encerrada */ }
  }
  limparSessao(res);
  return enviar(res, 200, { ok: true });
}, { exigeLogin: false });
