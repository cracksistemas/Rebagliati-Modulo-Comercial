# Rebagliati Modulo Comercial

Modulo interno para ranking, control de ventas, equipos, ejecutivos, configuracion administrativa y mapa de clientes.

## Variables para Vercel

Configura estas variables en Project Settings > Environment Variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://ombsfjcrzxtctpgmsnvd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_erz6jERFBG_3GkebejSg8g_Jfe4zbZn
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

No configures `service_role` en el frontend.

### Kommo en Vercel

Agrega estas variables como server-side environment variables, sin prefijo `NEXT_PUBLIC`:

```txt
KOMMO_BASE_URL=https://tu-subdominio.kommo.com
KOMMO_ACCESS_TOKEN=token_de_kommo
KOMMO_WEBHOOK_SECRET=secreto_para_webhooks
```

Tambien puedes usar `KOMMO_SUBDOMAIN=tu-subdominio` en lugar de `KOMMO_BASE_URL`.

Rutas publicadas automaticamente por Vercel:

```txt
GET    /api/kommo/status
GET    /api/kommo/leads
POST   /api/kommo/leads
GET    /api/kommo/leads/:id
PATCH  /api/kommo/leads/:id
GET    /api/kommo/contacts
POST   /api/kommo/contacts
GET    /api/kommo/contacts/:id
PATCH  /api/kommo/contacts/:id
GET    /api/kommo/pipelines
GET    /api/kommo/users
POST   /api/kommo/webhook
GET    /api/kommo/proxy/:path
POST   /api/kommo/proxy/:path
PATCH  /api/kommo/proxy/:path
DELETE /api/kommo/proxy/:path
```

El proxy solo permite recursos de Kommo bajo `account`, `contacts`, `companies`, `customers`, `events`, `leads`, `notes`, `pipelines`, `tasks` y `users`.

## Comandos

```bash
npm install
npm run dev
npm run build
```
