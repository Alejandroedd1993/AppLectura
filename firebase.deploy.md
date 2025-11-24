# 🚀 Guía de Deploy a Firebase Production

## ✅ Checklist Pre-Deploy (COMPLETADO)

### Seguridad
- [x] `.env` agregado a `.gitignore` - **NO se subirá a Git**
- [x] `storage.rules` creado - Protección de archivos en Storage
- [x] `firestore.rules` configurado - Protección de datos en Firestore
- [x] Logger condicional implementado - No logs sensibles en producción

### Archivos Limpios
- [x] `App.css` eliminado (no usado)
- [x] `texto_demo_inteligente.txt` eliminado (vacío)
- [x] `.env.example` actualizado con todas las variables

---

## 📋 Pasos para Deploy

### 1. Verificar Configuración Local

```powershell
# Verificar que Firebase CLI esté instalado
firebase --version

# Si no está instalado:
npm install -g firebase-tools

# Login a Firebase
firebase login
```

### 2. Seleccionar Proyecto

```powershell
# Listar proyectos disponibles
firebase projects:list

# Usar tu proyecto
firebase use applectura-cb058
```

### 3. Deploy de Reglas de Seguridad (CRÍTICO)

```powershell
# Deploy de Firestore Rules
firebase deploy --only firestore:rules

# Deploy de Storage Rules (NUEVO)
firebase deploy --only storage:rules

# Verificar que se aplicaron correctamente en Firebase Console
```

### 4. Deploy de Índices de Firestore

```powershell
# Deploy de índices (mejora queries)
firebase deploy --only firestore:indexes
```

### 5. Build de Producción

```powershell
# Crear build optimizado
npm run build

# Verificar tamaño del bundle
dir build\static\js\*.js | Select-Object Name, Length
```

### 6. Deploy de Hosting

```powershell
# Opción 1: Deploy completo (rules + hosting)
npm run firebase:deploy

# Opción 2: Solo hosting (más rápido)
firebase deploy --only hosting

# Opción 3: Preview antes de deploy final
firebase hosting:channel:deploy preview
```

### 7. Verificar Deploy

```powershell
# Ver URL del sitio deployado
firebase hosting:sites:list

# Abrir en navegador
start https://applectura-cb058.web.app
```

---

## 🔒 Seguridad Post-Deploy

### Verificar Reglas en Firebase Console

1. **Firestore Rules**: https://console.firebase.google.com/project/applectura-cb058/firestore/rules
   - Verificar que las reglas se hayan aplicado
   - Ejecutar "Simulator" para probar accesos

2. **Storage Rules**: https://console.firebase.google.com/project/applectura-cb058/storage/rules
   - Verificar límites de tamaño (10MB textos, 5MB sesiones)
   - Probar subida de archivos

3. **Authentication**: https://console.firebase.google.com/project/applectura-cb058/authentication/users
   - Habilitar Email/Password
   - Habilitar Google Sign-In

---

## 🧪 Testing en Producción

### 1. Crear Usuario de Prueba

```javascript
// En la consola del navegador (sitio deployado)
// Ir a: https://applectura-cb058.web.app

// Registrar usuario de prueba
// Email: test@ejemplo.com
// Password: TestPassword123!
// Rol: estudiante
```

### 2. Verificar Funcionalidades

- [ ] Login con email/password
- [ ] Login con Google
- [ ] Subir texto (docente)
- [ ] Guardar sesión en Firestore
- [ ] Sincronización en tiempo real
- [ ] Logout

---

## 📊 Monitoreo Post-Deploy

### Firebase Console - Métricas

1. **Hosting**: https://console.firebase.google.com/project/applectura-cb058/hosting
   - Tráfico
   - Uso de ancho de banda

2. **Firestore**: https://console.firebase.google.com/project/applectura-cb058/firestore/usage
   - Lecturas/Escrituras por día
   - Almacenamiento usado

3. **Storage**: https://console.firebase.google.com/project/applectura-cb058/storage
   - Archivos subidos
   - Espacio usado

4. **Authentication**: https://console.firebase.google.com/project/applectura-cb058/authentication/users
   - Usuarios registrados
   - Métodos de login

---

## ⚠️ Troubleshooting

### Error: "Permission denied"
- Verificar que las reglas de Firestore/Storage estén deployadas
- Revisar en Simulator si el usuario tiene permisos

### Error: "Firebase not initialized"
- Verificar que las variables de entorno estén en `.env`
- Hacer rebuild: `npm run build`

### Sitio no actualiza después de deploy
- Limpiar caché del navegador (Ctrl+Shift+R)
- Verificar versión deployada en Firebase Console

---

## 🔄 Rollback (si algo sale mal)

```powershell
# Ver versiones anteriores
firebase hosting:releases:list

# Hacer rollback a versión anterior
firebase hosting:rollback
```

---

## 📱 Configurar Dominio Custom (Opcional)

```powershell
# Agregar dominio custom
firebase hosting:sites:create your-domain-com

# Seguir instrucciones en consola para verificar DNS
```

---

## ✅ Checklist Final

Antes de compartir la app con usuarios reales:

- [ ] Reglas de seguridad deployadas y probadas
- [ ] Storage rules deployadas
- [ ] Build de producción sin errores
- [ ] Logger condicional funcionando (no logs en consola)
- [ ] Usuario de prueba creado y funcional
- [ ] Sincronización Firestore probada
- [ ] Backup de `.env` guardado de forma segura (NO en Git)
- [ ] Monitoreo activado en Firebase Console

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisar logs en Firebase Console
2. Verificar Network tab en DevTools
3. Consultar documentación: https://firebase.google.com/docs/web/setup
