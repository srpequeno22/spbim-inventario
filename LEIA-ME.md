# SPBIM Inventário: Supabase + GitHub + Antigravity

O sistema continua sendo um único `index.html`. A diferença é que agora os dados ficam
numa tabela do **Supabase**, compartilhada por todos que fizerem login, e não mais só
no navegador de cada pessoa.

```
spbim-inventario/
├── index.html            ← o site (abra e edite no Antigravity)
├── supabase/schema.sql   ← cria a tabela e as regras de segurança
└── LEIA-ME.md
```

> **Importante:** as listas de máquinas e hardware (com senhas de e-mail e chaves de
> recuperação) foram **retiradas** do `index.html`. O site vai ficar público no GitHub,
> então esses dados agora só existem no banco, protegidos por login.

---

## 1. Criar o banco no Supabase

1. Entre em <https://supabase.com>, clique em **New project**, escolha um nome
   (ex.: `spbim-inventario`) e a região **South America (São Paulo)**.
2. No menu lateral, abra **SQL Editor** e clique em **New query**.
3. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   O resultado deve ser "Success. No rows returned".
4. Abra **Authentication → Sign In / Providers** e **desligue "Allow new users to sign up"**.
   Assim só entra quem você cadastrar.
5. Abra **Authentication → Users → Add user → Create new user**. Cadastre o seu e-mail e
   uma senha, marcando **Auto Confirm User**. Repita para cada colega.
   *O primeiro usuário que fizer login vira Administrador.*

## 2. Conectar o site ao banco

1. No Supabase, clique em **Connect** (ou em **Project Settings → API**) e copie:
   * **Project URL**, algo como `https://abcdefgh.supabase.co`
   * **anon / publishable key**, a chave **pública**
     *(nunca use a `service_role` / `secret`)*
2. No Antigravity, abra a pasta `spbim-inventario` e procure em `index.html` por `SUPABASE_URL`:

   ```js
   const SUPABASE_URL='https://abcdefgh.supabase.co';
   const SUPABASE_KEY='eyJhbGciOi...';
   ```
3. Salve. A chave pública pode ficar no GitHub sem problema: sem login, a tabela
   não devolve nada (RLS).

## 3. Levar os dados atuais para o banco

Os dados atuais estão no navegador onde você usa a versão antiga (`SPBIM_otimizado.html`).

1. Abra a **versão antiga** e vá em **Configurações → Backup → Baixar backup**.
2. Abra a **versão nova** (depois de publicada, ou localmente) e faça login.
3. Vá em **Configurações → Backup → Restaurar de arquivo** e escolha o backup.
   Tudo é enviado para o Supabase. Para conferir, abra **Table Editor → inventario**.

## 4. Publicar no GitHub (GitHub Pages)

**Pelo site do GitHub (sem instalar nada):**
1. Em <https://github.com/new>, crie o repositório `spbim-inventario`.
2. Clique em **uploading an existing file** e arraste `index.html`, `LEIA-ME.md` e a pasta `supabase`.
   Depois clique em **Commit changes**.
3. Vá em **Settings → Pages → Branch: `main` / `(root)` → Save**.
4. Em cerca de 1 minuto o site estará em `https://SEU-USUARIO.github.io/spbim-inventario/`.

**Pelo Antigravity (Git integrado):** abra a pasta, use o painel **Source Control**:
**Initialize Repository → Commit → Publish Branch**. O editor pede login no GitHub.

> No plano gratuito, o GitHub Pages exige repositório **público**. Isso não é problema
> porque os dados ficam no Supabase, não no código.

5. No Supabase, em **Authentication → URL Configuration**, coloque a URL do GitHub Pages
   em **Site URL**.

## Como funciona

| O quê | Onde |
|---|---|
| Peças, máquinas, hardware, patrimônio, empréstimos, manutenções, movimentações, atividades, lixeira, usuários e limite de estoque baixo | Tabela `inventario` no Supabase (uma linha por coleção, em JSON) |
| Tema, foto de perfil, filtros, cópias automáticas diárias | Só no navegador de cada pessoa |

* As alterações são enviadas cerca de 0,7 s depois de salvar. Sem internet, o site avisa e reenvia sozinho quando a conexão volta.
* Se um colega salvar, a sua tela atualiza sozinha (tempo real).
* Se duas pessoas editarem **a mesma lista ao mesmo tempo**, vale a última que salvou.
  Para uma equipe pequena isso funciona bem. Se o uso crescer, o próximo passo é
  separar em tabelas por registro.
* Se você deixar `SUPABASE_URL` vazio, o site volta ao modo antigo (só no navegador).
