// POST /api/login  { email, senha }  ->  grava os cookies de sessão e devolve o usuário
import { rota, authClient, gravarSessao, enviar, publico } from './_lib.js';

export default rota(['POST'], async (req, res) => {
  const { email, senha } = req.body || {};
  if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha ||
      email.length > 200 || senha.length > 200) {
    return enviar(res, 400, { erro: 'Informe e-mail e senha' });
  }
  const { data, error } = await authClient().auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error || !data?.session) {
    // Mesma mensagem para e-mail inexistente ou senha errada (não revela quem tem conta)
    return enviar(res, 401, { erro: 'E-mail ou senha incorretos' });
  }
  gravarSessao(res, data.session);
  return enviar(res, 200, publico(data.user));
}, { exigeLogin: false });
