# Gestor de Gastos — app com login e Firestore

App Next.js com login por e-mail/senha (Firebase Authentication) e dados
salvos no Firestore, um documento por usuário. Cada conta vê só os
próprios dados.

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e crie um novo projeto.
2. No menu lateral, vá em **Build > Authentication > Sign-in method** e
   ative os provedores **E-mail/senha** e **Google**. Para o Google, basta
   escolher um e-mail de suporte do projeto e salvar — não precisa de mais
   nada para funcionar em `localhost`.
3. Vá em **Build > Firestore Database** e clique em **Criar banco de
   dados**. Escolha o modo **produção** (as regras de segurança do
   projeto já cuidam do acesso) e a região mais próxima de você.
4. Em **Configurações do projeto (ícone de engrenagem) > Geral**, role
   até "Seus apps" e clique no ícone `</>` para criar um app Web. Dê um
   nome qualquer e clique em registrar — não precisa de Hosting.
5. Copie o objeto `firebaseConfig` que aparece na tela.

## 2. Configurar as variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha com os valores
copiados do passo anterior:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 3. Publicar as regras de segurança do Firestore

O arquivo `firestore.rules` já vem pronto — ele garante que cada usuário
só leia/escreva no próprio documento (`users/{uid}`). Para o recurso de
**Parceiros**, ele também libera a *leitura* do documento de quem estiver
vinculado (coleções `invites` e `links`), nunca a escrita. **Sempre que este
arquivo mudar, publique de novo** — sem isso o vínculo dá "permission-denied".
Duas formas de aplicar:

- **Pelo console**: em Firestore Database > Regras, cole o conteúdo de
  `firestore.rules` e publique.
- **Pela CLI** (opcional): `npm install -g firebase-tools`, depois
  `firebase login`, `firebase init firestore` (aponte para este projeto
  e reaproveite o `firestore.rules` existente) e `firebase deploy --only firestore:rules`.

## 4. Rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 — você será redirecionado para `/login`.
Crie uma conta pelo próprio formulário (aba "Criar conta").

## 5. Deploy no Vercel

1. Suba este projeto para um repositório no GitHub/GitLab/Bitbucket.
2. Em https://vercel.com, clique em **Add New > Project** e importe o
   repositório. O Vercel detecta o Next.js automaticamente, não precisa
   mexer em build settings.
3. Em **Environment Variables**, adicione as mesmas seis variáveis do
   `.env.local` (as que começam com `NEXT_PUBLIC_FIREBASE_`).
4. Clique em **Deploy**.

Depois do primeiro deploy, se você mudar as variáveis de ambiente,
lembre de fazer um **redeploy** para elas entrarem em vigor.

## 6. Autorizar o domínio do Vercel no Firebase

O Firebase Auth só aceita login em domínios autorizados. Depois do
deploy:

1. Copie a URL que o Vercel te deu (ex: `extrato-app.vercel.app`).
2. No Firebase Console, vá em **Authentication > Settings > Domínios
   autorizados** e adicione essa URL.

Sem isso, o login funciona em `localhost` mas falha em produção.

## Parceiros (ver os gastos de outra conta)

Em **Parceiros**, uma pessoa gera um código de convite (vale 24 h, uso único)
e a outra digita em "Tenho um código". O vínculo é dos dois lados e somente
leitura: cada um vê os gastos do outro em tempo real (seletor "Meus gastos /
nome") e qualquer um pode desvincular. Convites ficam em `invites/{código}` e
vínculos em `links/{uidA_uidB}`.

## Personalizar

O botão **Personalizar** deixa cada pessoa escolher quais seções aparecem
(pessoas, cartões, calendário, outros gastos, categorias, resumo, relatório).
A escolha fica salva no aparelho (localStorage) e não apaga nenhum dado.

## Estrutura do projeto

```
app/
  layout.jsx       # layout raiz, envolve tudo com AuthProvider
  page.jsx          # página inicial — exige login, renderiza o app
  login/page.jsx     # tela de login/cadastro
components/
  ExtratoApp.jsx     # o app inteiro (pessoas, cartões, gastos, relatórios)
context/
  AuthContext.jsx    # estado de autenticação (login, cadastro, logout)
lib/
  firebase.js        # inicialização do Firebase (Auth + Firestore)
  firestore.js        # leitura/gravação dos dados do usuário logado
firestore.rules       # regras de segurança (isolamento por usuário)
```

Cada usuário tem um único documento em `users/{uid}` no Firestore, com
todas as pessoas, cartões, lançamentos e gastos daquela conta — a mesma
estrutura de dados que o app já usava, só que agora salva na nuvem em
vez de localmente.
