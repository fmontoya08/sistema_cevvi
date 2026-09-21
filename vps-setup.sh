#!/bin/bash
# ============================================
# SCRIPT DE SETUP PARA VPS TERAMONT
# Ubuntu 22.04 LTS - Universidad Siglo XXI
# ============================================
# Ejecutar como root o con sudo:
#   bash vps-setup.sh
# ============================================

set -e

echo "=========================================="
echo "  SETUP VPS - Universidad Siglo XXI"
echo "=========================================="

# 1. ACTUALIZAR SISTEMA
echo "[1/10] Actualizando sistema..."
apt update && apt upgrade -y

# 2. INSTALAR NODE.JS 20 LTS
echo "[2/10] Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. INSTALAR NGINX
echo "[3/10] Instalando Nginx..."
apt install -y nginx

# 4. INSTALAR PM2
echo "[4/10] Instalando PM2..."
npm install -g pm2

# 5. INSTALAR GIT
echo "[5/10] Instalando Git..."
apt install -y git

# 6. INSTALAR CERTBOT (para SSL)
echo "[6/10] Instalando Certbot..."
apt install -y certbot python3-certbot-nginx

# 7. CONFIGURAR FIREWALL
echo "[7/10] Configurando firewall UFW..."
apt install -y ufw
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 8. CLONAR REPOSITORIO
echo "[8/10] Clonando repositorio..."
cd /opt
git clone https://github.com/fmontoya08/sistema_cevvi.git plataforma
cd plataforma/server

# 9. INSTALAR DEPENDENCIAS
echo "[9/10] Instalando dependencias del servidor..."
npm install

# 10. COPIAR .env (lo haces manualmente o lo subes)
echo "[10/10] Copia tu archivo .env manualmente:"
echo "  nano /opt/plataforma/server/.env"
echo ""

echo "=========================================="
echo "  INSTALACION BASE COMPLETADA"
echo "=========================================="
echo ""
echo "SIGUIENTES PASOS MANUALES:"
echo ""
echo "1. Copia tu archivo .env al servidor:"
echo "   nano /opt/plataforma/server/.env"
echo ""
echo "2. Configura Nginx:"
echo "   nano /etc/nginx/sites-available/api"
echo "   ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/"
echo "   rm /etc/nginx/sites-enabled/default"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "3. Configura el DNS en Neubox:"
echo "   Registro A: api -> IP_DE_TU_VPS"
echo ""
echo "4. Genera SSL con Certbot:"
echo "   certbot --nginx -d api.universidadsigloxxi.com"
echo ""
echo "5. Inicia la API con PM2:"
echo "   cd /opt/plataforma/server"
echo "   pm2 start index.js --name api-universidad"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "6. Sube los archivos uploads (si los tienes en local):"
echo "   rsync -avz uploads/ root@IP_VPS:/opt/plataforma/server/uploads/"
echo ""
