# Rodando o app com os emuladores do Firebase

Para testar sem tocar nos dados reais. Requer **Java 21+** (o emulador do Firestore roda em Java).

1. Suba os emuladores (Auth + Firestore, com as regras de `firestore.rules`):

   ```bash
   npx firebase-tools emulators:start --project demo-gastos
   ```

2. Em outro terminal, crie os dados de teste (contas e senhas estão no topo do script):

   ```bash
   node scripts/seed-emulator.mjs
   ```

3. Rode o app apontando para os emuladores:

   ```bash
   NEXT_PUBLIC_USE_EMULATORS=1 NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gastos npm run dev
   ```

   No PowerShell: `$env:NEXT_PUBLIC_USE_EMULATORS='1'; $env:NEXT_PUBLIC_FIREBASE_PROJECT_ID='demo-gastos'; npm run dev`

Os dados do emulador somem quando ele é fechado.

## Publicar as regras no projeto real

```bash
npx firebase-tools deploy --only firestore:rules
```

(Na primeira vez, `npx firebase-tools login`.)
