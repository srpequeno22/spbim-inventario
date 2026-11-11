# SPBIM Inventário: Front + API + Supabase, publicado na Vercel

## Como funciona

```
Navegador (front)  ──►  API /api/... (back, Vercel)  ──►  Supabase (banco)
   public/index.html        pasta api/                   tabela "inventario"
```

* O **front** (`public/index.html`) **não fala com o banco**. Ele só chama a API.
* A **API** (`api/`) confere o login, valida os dados e só então lê ou grava no Supabase.
* A **chave secreta** do banco fica **só na Vercel** (variável de ambiente). Ela não está no código nem no GitHub.

```
spbim-inventario/
├── public/index.html     ← o site (front)
├── api/                  ← o servidor (back), funções da Vercel
│   ├── _lib.js           ← conexão com o Supabase, cookies e proteções
│   ├── login.js          ← POST /api/login
│   ├── logout.js         ← POST /api/logout
│   ├── session.js        ← GET  /api/session
│   └── inventario.js     ← GET/PUT /api/inventario
├── supabase/schema.sql   ← cria a tabela e fecha o acesso direto
├── vercel.json           ← configuração e cabeçalhos de segurança
├── package.json
├── .env.example          ← modelo das variáveis de ambiente
└── LEIA-ME.md
```

## Segurança

| Proteção | Como |
|---|---|
| Banco fechado para o navegador | `schema.sql` tira todo o acesso de `anon` e `authenticated`. Só a API (chave secreta) acessa. |
| Chave secreta escondida | Fica em *Environment Variables* da Vercel, nunca no `index.html` |
| Login | Feito pela API no Supabase Auth. A sessão vai num **cookie httpOnly** (o JavaScript da página não consegue ler, o que protege contra roubo por XSS), `Secure`, `SameSite=Strict`, válido por 7 dias. |
| Toda rota exige login | Exceto `/api/login` e `/api/logout`. O token é conferido no Supabase a cada pedido e renovado sozinho. |
| Contra pedidos de outros sites (CSRF) | Cookie `SameSite=Strict` + a API recusa POST/PUT cuja origem não é o próprio site + exige JSON |
| Validação | A API só aceita as 12 coleções conhecidas e confere o formato de cada uma |
| Cabeçalhos HTTP | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` (em `vercel.json`) |
| Cadastro fechado | Só entra quem o administrador cadastrar no Supabase |

---

## 1. Banco de dados (Supabase)

1. No projeto do Supabase, abra **SQL Editor → New query**, cole todo o `supabase/schema.sql` e clique em **Run**.
   *(Se a tabela já existe, ele só atualiza as regras. Os dados continuam.)*
2. **Authentication → Sign In / Providers**: deixe **"Allow new users to sign up" desligado**.
3. **Authentication → Users → Add user**: cadastre cada pessoa com e-mail e senha (**Auto Confirm User**).
4. Em **Project Settings → API Keys**, copie três valores:
   * **Project URL**
   * **Publishable key** (`sb_publishable_...`)
   * **Secret key** (`sb_secret_...`, ou a antiga `service_role`). **Nunca cole esta chave em lugar nenhum além da Vercel.**

> A chave publishable antiga estava escrita no `index.html` e já foi para o GitHub.
> Com o novo `schema.sql` ela não abre mais nada, mas, para garantir, vale gerar uma
> nova em **API Keys** e apagar a antiga.

## 2. GitHub

Suba a pasta inteira para o repositório (pelo Source Control do Antigravity ou arrastando no site do GitHub).
O `.gitignore` já impede que arquivos `.env` sejam enviados.

## 3. Publicar na Vercel

1. Entre em <https://vercel.com> com a conta do GitHub → **Add New → Project** → escolha `spbim-inventario` → **Import**.
2. Em **Environment Variables**, cadastre:

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key |

3. Clique em **Deploy**. Em cerca de 1 minuto o site estará em `https://spbim-inventario.vercel.app` (ou parecido).
4. A cada `git push`, a Vercel publica a nova versão sozinha.
5. Se o site estava no GitHub Pages, desative em **Settings → Pages**, para não ficar uma versão antiga no ar.

## 4. Testar no computador (opcional)

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm i -g vercel
vercel link          # liga a pasta ao projeto da Vercel
vercel env pull .env.local
vercel dev           # abre em http://localhost:3000
```

Abrir o `index.html` direto do disco (duplo clique) usa o **modo antigo**, só no navegador, sem banco.

## Observações

* As alterações são enviadas cerca de 0,7 s depois de salvar. Sem internet, o site avisa e reenvia sozinho.
* A tela de quem está com o sistema aberto atualiza sozinha a cada **15 segundos** quando outra pessoa salva.
* Se a sessão vencer, o site pede login de novo e envia o que ainda não tinha sido salvo.
* Se duas pessoas editarem **a mesma lista ao mesmo tempo**, vale a última que salvou.
* Os papéis (Administrador / Operador) ainda são conferidos só na tela. Qualquer usuário logado pode
  gravar pela API. Próximo passo, se precisar: guardar o papel no Supabase e a API checar antes de gravar.
