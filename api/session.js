// GET /api/session  ->  devolve o usuário logado (ou 401)
import { rota, enviar, publico } from './_lib.js';

export default rota(['GET'], async (req, res, usuario) => enviar(res, 200, publico(usuario)));
