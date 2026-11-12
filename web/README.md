# Remessas Memphis (Next.js)

## Rodar localmente
```
cd web
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # http://localhost:3000
npm test                     # testes dos parsers
```

## Como a coleta funciona (por que cabe na Vercel)
1. O navegador chama `POST /api/coleta/iniciar` (período): o servidor entra no portal, lista os HAWBs e grava nome e data no Supabase. Devolve a fila de HAWBs que ainda precisam de checkpoints (os já "Entregue" ficam de fora).
2. O navegador chama `POST /api/coleta/lote` repetidamente, 4 HAWBs por vez. Cada chamada dura poucos segundos.
3. A lista lê direto da tabela `memphis` do Supabase (com RLS: só usuários logados).

## Deploy na Vercel
1. Suba o repositório (privado!) no GitHub.
2. Vercel → Add New Project → escolha o repositório → **Root Directory: `web`**.
3. Em Environment Variables, cadastre (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (sem prefixo NEXT_PUBLIC)
   - `MEMPHIS_USER`, `MEMPHIS_PASS`
   - `ALLOWED_EMAILS` (opcional)
4. Deploy. `vercel.json` fixa a região `gru1` (São Paulo).
5. No Supabase: Authentication → URL Configuration → coloque a URL da Vercel em "Site URL".

## Privacidade
- Só o nome do destinatário é lido (e o CPF/endereço/CEP nunca). A coluna Comments dos checkpoints é descartada.
- Nenhum dado de paciente é logado; erros devolvem mensagem genérica.
- A chave `service_role` e a senha do portal só existem no servidor.
