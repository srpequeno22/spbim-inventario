// GET /api/inventario            -> todas as coleções
// GET /api/inventario?desde=ISO  -> só as coleções alteradas depois dessa data (atualização automática)
// PUT /api/inventario { linhas: [{ chave, dados }] } -> grava coleções
import { rota, db, enviar, CHAVES } from './_lib.js';

const maior = (a, b) => (!a ? b : !b ? a : (a > b ? a : b));

export default rota(['GET', 'PUT'], async (req, res, usuario) => {
  if (req.method === 'GET') {
    let q = db().from('inventario').select('chave,dados,atualizado_em');
    const desde = typeof req.query.desde === 'string' ? req.query.desde : '';
    if (desde) {
      const t = Date.parse(desde);
      if (Number.isNaN(t)) return enviar(res, 400, { erro: 'Data inválida' });
      // margem de 5 s: pega gravações simultâneas que terminaram fora de ordem
      q = q.gt('atualizado_em', new Date(t - 5000).toISOString());
    }
    const { data, error } = await q;
    if (error) throw error;
    const linhas = (data || []).filter((r) => CHAVES.has(r.chave));
    const ts = linhas.reduce((m, r) => maior(m, r.atualizado_em), desde || null);
    return enviar(res, 200, { linhas: linhas.map(({ chave, dados }) => ({ chave, dados })), ts });
  }

  // PUT
  const linhas = req.body?.linhas;
  if (!Array.isArray(linhas) || !linhas.length || linhas.length > CHAVES.size) {
    return enviar(res, 400, { erro: 'Envie "linhas" com as coleções' });
  }
  for (const l of linhas) {
    if (!l || !CHAVES.has(l.chave)) return enviar(res, 400, { erro: `Coleção inválida: ${l && l.chave}` });
    // "low" (limite de estoque baixo) é um número; as demais coleções são listas
    const ok = l.chave === 'low' ? Number.isFinite(l.dados) : Array.isArray(l.dados);
    if (!ok) return enviar(res, 400, { erro: `Formato inválido em ${l.chave}` });
  }
  const rows = linhas.map((l) => ({ chave: l.chave, dados: l.dados, atualizado_por: usuario.id }));
  const { error } = await db().from('inventario').upsert(rows);
  if (error) throw error;
  return enviar(res, 200, { ok: true });
});
