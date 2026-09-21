# Bitácora de Migración: Render → VPS Teramont
# Universidad Siglo XXI
# ============================================
# Fecha de inicio: 2026-07-25
# Fecha completada: 2026-07-26
# Estado actual: ✅ MIGRACIÓN COMPLETADA
# ============================================

## RESUMEN DEL PROYECTO

- **Plataforma**: Universidad Siglo XXI (universidadsigloxxi.com)
- **Stack**: React 19 (frontend) + Node.js/Express 5 (backend) + React Native/Expo (móvil)
- **Objetivo**: Migrar backend API de Render a VPS Teramont, mantener frontend en Neubox

## ARQUITECTURA ACTUAL (ANTES DE MIGRAR)

```
Frontend (React SPA)     → Neubox cPanel (universidadsigloxxi.com/plataforma)
Backend API (Node.js)    → Render (api-universidad-c5o8.onrender.com) ← SE ELIMINA
Base de datos            → TiDB Cloud (gateway01.us-east-1.prod.aws.tidbcloud.com:4000)
Email institucional      → Neubox cPanel (universidadsigloxxi.com)
Mobile app (Expo)        → Apunta a Render (PENDIENTE de actualizar en EAS)
```

## ARQUITECTURA OBJETIVO (DESPUÉS DE MIGRAR)

```
Frontend (React SPA)     → Neubox cPanel (universidadsigloxxi.com/plataforma)
Backend API (Node.js)    → VPS Teramont (api.universidadsigloxxi.com) ← NUEVO
Base de datos            → TiDB Cloud (sin cambios por ahora)
Email institucional      → Neubox cPanel (sin cambios)
Mobile app (Expo)        → Apunta a api.universidadsigloxxi.com ← ACTUALIZADO
```

## DATOS DEL VPS TERAMONT

- **Plan**: Extreme VPS - 4GB ($140.08 MXN/mes)
- **SO**: Ubuntu Server 22.04 LTS (Jammy Jellyfish)
- **Ubicación**: Miami, Florida
- **Especificaciones**: AMD Ryzen 9 5900X, 2 vCore, 4GB DDR4, 60GB SSD NVMe
- **Estado**: ✅ OPERACIONAL - Migración completada 2026-07-26
- **IP**: 167.148.33.58
- **Usuario SSH**: root
- **URL API**: https://api.universidadsigloxxi.com

## CAMBIOS REALIZADOS EN EL CÓDIGO

### 1. client/src/config.js (COMPLETADO)
```javascript
// ANTES:
const API_URL = isLocal
  ? "http://localhost:3001"
  : "https://api-universidad-c5o8.onrender.com";

// DESPUÉS:
const API_URL = isLocal
  ? "http://localhost:3001"
  : "https://api.universidadsigloxxi.com";
```

### 2. server/index.js (COMPLETADO) - Líneas 22-30
```javascript
// ANTES:
app.use(cors({
  origin: [
    "https://universidadsigloxxi.com",
    "https://www.universidadsigloxxi.com",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  credentials: true,
}));

// DESPUÉS:
app.use(cors({
  origin: [
    "https://universidadsigloxxi.com",
    "https://www.universidadsigloxxi.com",
    "https://api.universidadsigloxxi.com",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  credentials: true,
}));
```

### 3. movil/context/AuthContext.tsx (COMPLETADO) - Línea 18
```typescript
// ANTES:
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api-universidad-c5o8.onrender.com/api";

// DESPUÉS:
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.universidadsigloxxi.com/api";
```

### 4. Frontend build (COMPLETADO)
- `npm run build` ejecutado en `/client`
- Build generado en `client/build/` con la nueva URL de API

## ARCHIVOS CREADOS PARA EL VPS

### vps-setup.sh
Script de instalación automática para el VPS:
- Actualiza sistema Ubuntu
- Instala Node.js 20 LTS (NodeSource)
- Instala Nginx
- Instala PM2 (process manager)
- Instala Git
- Instala Certbot (para SSL Let's Encrypt)
- Configura firewall UFW (puertos 22, 80, 443)
- Clona el repositorio en /opt/plataforma
- Instala dependencias del servidor

### nginx-api.conf
Configuración de Nginx para:
- Reverse proxy de la API Node.js (puerto 3001)
- Servir archivos /uploads/ directamente (expires 30d)
- Servir frontend React backup en /plataforma/
- Gzip compression
- Proxy headers (X-Real-IP, X-Forwarded-For, etc.)
- client_max_body_size 100M

## PASOS COMPLETADOS (2026-07-26)

### Fase A: DNS (en Neubox cPanel) ✅
- Registro A creado: api → 167.148.33.58
- Propagación verificada via Google DNS (8.8.8.8)

### Fase B: Setup del VPS (por SSH) ✅
- Node.js 20.20.2 instalado
- Nginx 1.18.0 instalado y configurado
- PM2 7.0.3 instalado (auto-start habilitado)
- Git 2.25.1 (ya existía)
- Certbot 0.40.0 instalado
- UFW configurado (puertos 22, 80, 443)
- Repositorio clonado en /opt/plataforma
- .env subido con permisos 600

### Fase C: SSL (Certbot) ✅
- Certificado generado: api.universidadsigloxxi.com
- Válido desde: 2026-07-26 hasta 2026-10-24
- Auto-renew habilitado (certbot.timer activo)
- HTTP→HTTPS redirect configurado

### Fase D: API funcionando ✅
- PM2 ejecutando api-universidad (PID activo, 0 restarts)
- API responde: https://api.universidadsigloxxi.com/api/login → 401 (correcto)
- Conexión a TiDB Cloud verificada
- Uploads migrados (31 archivos)

### Fase E: Subir uploads al VPS ✅
- 31 archivos subidos (perfiles, tareas, recursos, documentos)

## PENDIENTE

### Fase F: Subir build de React a Neubox (TU HACES ESTO)
- El build ya está generado en `client/build/`
- Subir vía FTP/cPanel el contenido de `client/build/` a la carpeta `plataforma/` en Neubox
- Asegurar que el `.htaccess` esté en la raíz de `plataforma/`

### Fase G: Verificación
1. Abrir https://universidadsigloxxi.com/plataforma
2. Hacer login
3. Verificar que la API responde desde https://api.universidadsigloxxi.com
4. Probar subida de archivos
5. Verificar envío de emails
6. Verificar que los cron jobs corren (PM2 logs)

### Fase H: Mobile app (opcional, cuando quieras)
- Actualizar el `EXPO_PUBLIC_API_URL` en eas.json o .env del móvil
- Hacer nuevo build con EAS
- Publicar en Play Store

### Fase I: Cancelar Render
- Una vez que el VPS esté funcionando correctamente, cancelar el servicio en Render

## NOTAS IMPORTANTES

- **Render**: Se puede cancelar una vez que el VPS esté funcionando correctamente
- **TiDB Cloud**: Se mantiene como base de datos por ahora (no se migra al VPS)
- **PHP Bridge** (crear_api_correo.php): Sigue en Neubox, se usa para crear correos institucionales
- **cPanel UAPI**: Se usa para cambiar contraseñas de correo, sigue apuntando a Neubox
- **Dominio**: universidadsigloxxi.com sigue en Neubox
- **El .env del server tiene credenciales en texto plano** - asegurar permisos 600 en el VPS

## COMANDOS ÚTILES PARA EL VPS

```bash
# Ver logs de la API
pm2 logs api-universidad

# Reiniciar la API
pm2 restart api-universidad

# Ver estado de PM2
pm2 status

# Ver logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Reiniciar Nginx
systemctl restart nginx

# Verificar SSL
certbot certificates

# Renovar SSL manualmente
certbot renew

# Verificar que Node.js funciona
node -v
npm -v

# Verificar que la API responde
curl http://localhost:3001/api/login
```
