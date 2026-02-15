# Checklist Staging: Endpoints de Costo (Auth Firebase)

## 1) Precondiciones

- Frontend desplegado en Firebase y backend en Render.
- Usuario de prueba válido en Firebase Auth (email/password o Google).
- Variables en Render confirmadas:
  - `NODE_ENV=production`
  - `ENFORCE_FIREBASE_AUTH=true`
  - `FIREBASE_PROJECT_ID=<project-id-real>`
  - API keys de IA configuradas (`OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY` según uso)

## 2) Obtener ID Token para pruebas API

- Inicia sesión en la app.
- Abre DevTools en el navegador.
- Ejecuta:

```js
const k = Object.keys(localStorage).find(x => x.startsWith('firebase:authUser:'));
const token = JSON.parse(localStorage.getItem(k)).stsTokenManager.accessToken;
console.log(token);
```

## 3) Configuración rápida (PowerShell)

```powershell
$BASE = "https://<tu-backend-render>.onrender.com"
$TOKEN = "<pega_token_firebase>"

$HNoAuth = @{ "Content-Type" = "application/json" }
$HAuth = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $TOKEN" }
```

## 4) Matriz de pruebas API (obligatoria)

### Caso A1 - `/api/analysis/text` sin token

```powershell
Invoke-WebRequest -Method POST -Uri "$BASE/api/analysis/text" -Headers $HNoAuth -Body '{"texto":"Texto de prueba para análisis","api":"deepseek"}'
```

- Aceptación: status `401` o `403`.

### Caso A2 - `/api/analysis/text` con token

```powershell
Invoke-WebRequest -Method POST -Uri "$BASE/api/analysis/text" -Headers $HAuth -Body '{"texto":"Texto de prueba para análisis","api":"deepseek"}'
```

- Aceptación: status `200` y JSON con `resumen`.

### Caso B1 - `/api/analysis/prelecture` sin token

```powershell
$body = @{ text = ("Texto largo de prueba. " * 10); metadata = @{} } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/analysis/prelecture" -Headers $HNoAuth -Body $body
```

- Aceptación: status `401` o `403`.

### Caso B2 - `/api/analysis/prelecture` con token

```powershell
$body = @{ text = ("Texto largo de prueba. " * 10); metadata = @{} } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/analysis/prelecture" -Headers $HAuth -Body $body
```

- Aceptación: status `200` o `502` con fallback estructurado (nunca `401`/`403` con token válido).

### Caso C1 - `/api/analysis/glossary` sin token

```powershell
$body = @{ text = ("Texto académico extenso para glosario. " * 12); maxTerms = 6 } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/analysis/glossary" -Headers $HNoAuth -Body $body
```

- Aceptación: status `401` o `403`.

### Caso C2 - `/api/analysis/glossary` con token

```powershell
$body = @{ text = ("Texto académico extenso para glosario. " * 12); maxTerms = 6 } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/analysis/glossary" -Headers $HAuth -Body $body
```

- Aceptación: status `200` y JSON con `terms` (array).

### Caso D1 - `/api/notes/generate` sin token

```powershell
$body = @{ texto = "Texto de prueba para notas"; api = "openai"; tipoTexto = "auto"; numeroTarjetas = 5 } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/notes/generate" -Headers $HNoAuth -Body $body
```

- Aceptación: status `401` o `403`.

### Caso D2 - `/api/notes/generate` con token

```powershell
$body = @{ texto = "Texto de prueba para notas"; api = "openai"; tipoTexto = "auto"; numeroTarjetas = 5 } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/notes/generate" -Headers $HAuth -Body $body
```

- Aceptación: status `200` y JSON con `resumen`, `notas`, `preguntas`, `tarjetas`.

### Caso E1 - `/api/web-search` sin token

```powershell
$body = @{ query = "pobreza ecuador estadísticas 2025"; type = "estadisticas_locales"; maxResults = 5 } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/web-search" -Headers $HNoAuth -Body $body
```

- Aceptación: status `401` o `403`.

### Caso E2 - `/api/web-search` con token

```powershell
$body = @{ query = "pobreza ecuador estadísticas 2025"; type = "estadisticas_locales"; maxResults = 5 } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/web-search" -Headers $HAuth -Body $body
```

- Aceptación: status `200` y JSON con `resultados` (array).

### Caso F1 - `/api/web-search/answer` sin token

```powershell
$body = @{ query = "impacto social de la lectura crítica"; maxResults = 4; provider = "smart" } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/web-search/answer" -Headers $HNoAuth -Body $body
```

- Aceptación: status `401` o `403`.

### Caso F2 - `/api/web-search/answer` con token

```powershell
$body = @{ query = "impacto social de la lectura crítica"; maxResults = 4; provider = "smart" } | ConvertTo-Json
Invoke-WebRequest -Method POST -Uri "$BASE/api/web-search/answer" -Headers $HAuth -Body $body
```

- Aceptación: status `200` y JSON con `respuesta` + `citas`.

## 5) Smoke test UI (obligatorio)

- Flujo análisis normal en frontend.
- Flujo prelectura.
- Flujo glosario.
- Flujo notas de estudio.
- Flujo web-search desde tutor.
- Aceptación: no errores `401/403` para usuario autenticado; UX funcional en cada flujo.

## 6) Endpoint público esperado

- `GET /api/web-search/test` puede quedar público por diagnóstico.
- Aceptación: responde `200` sin token y no ejecuta costos de IA.

## 7) Evidencia mínima a guardar

- Captura de status code de cada caso A1..F2.
- Captura de respuesta JSON de casos A2..F2.
- Fragmento de logs de Render del periodo de pruebas.
- Fecha/hora exacta de ejecución (UTC o zona local).

## 8) Criterio final de salida

- Todos los endpoints de costo rechazan anónimo (`401/403`).
- Todos los endpoints de costo funcionan con token válido (`200` o fallback controlado).
- UI autenticada opera sin bloqueos de autorización.

## 9) Ejecucion automatica (script)

- Script agregado: `scripts/smoke-cost-endpoints.ps1`

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-cost-endpoints.ps1 `
  -BaseUrl "https://<tu-backend-render>.onrender.com" `
  -Token "<firebase_id_token>"
```

- Salida:
  - Resumen en consola por caso (`A1..G1`)
  - Reporte JSON en `test-results/smoke-cost-endpoints-<timestamp>.json`
