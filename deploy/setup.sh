#!/bin/bash

# Script de instalación inicial para EC2
# Ejecutar como: sudo bash setup.sh

echo "🚀 Iniciando configuración del servidor..."

# Actualizar sistema
apt-get update
apt-get upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Instalar git y nginx
apt-get install -y git nginx

# Instalar PM2 globalmente
npm install -g pm2

# Crear directorio para la aplicación
mkdir -p /opt/location-tracker
cd /opt/location-tracker

# Clonar el repositorio (reemplazar con tu URL)
echo "📦 Clonando repositorio..."
read -p "Ingresa la URL del repositorio de GitHub: " REPO_URL
git clone $REPO_URL .

# Configurar Backend
echo "⚙️ Configurando Backend..."
cd backend
npm install

# Crear archivo .env para backend
echo "Configurando variables de entorno del backend..."
read -p "DB_HOST (RDS endpoint): " DB_HOST
read -p "DB_NAME: " DB_NAME
read -p "DB_USER: " DB_USER
read -sp "DB_PASSWORD: " DB_PASSWORD
echo

cat > .env <<EOL
DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
HTTP_PORT=3001
UDP_PORT=6001
EOL

# Iniciar backend con PM2
pm2 start server.js --name location-backend
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Configurar Frontend
echo "⚙️ Configurando Frontend..."
cd ../frontend

# Instalar dependencias y crear .env
npm install

# Obtener IP pública de la instancia
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)

cat > .env <<EOL
VITE_API_URL=http://$PUBLIC_IP:3001
VITE_POLLING_INTERVAL=5000
EOL

# Construir frontend
npm run build

# Configurar Nginx
echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/location-tracker <<'EOL'
server {
    listen 80;
    server_name _;
    
    root /opt/location-tracker/frontend/dist;
    index index.html;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Proxy para API (opcional si quieres usar puerto 80)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Habilitar el sitio
ln -sf /etc/nginx/sites-available/location-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Reiniciar Nginx
nginx -t && systemctl restart nginx

# Configurar firewall
echo "🔒 Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 3001/tcp
ufw allow 6001/udp
ufw --force enable

# Crear script de actualización
cat > /opt/location-tracker/update-frontend.sh <<'EOL'
#!/bin/bash
cd /opt/location-tracker
git pull
cd frontend
npm install
npm run build
echo "✅ Frontend actualizado"
EOL

chmod +x /opt/location-tracker/update-frontend.sh

# Configurar webhook listener para GitHub
cat > /opt/location-tracker/webhook-server.js <<'EOL'
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

app.post('/webhook', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const body = JSON.stringify(req.body);
    
    if (!signature) {
        return res.status(401).send('No signature');
    }
    
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(body).digest('hex');
    
    if (signature !== digest) {
        return res.status(401).send('Invalid signature');
    }
    
    // Ejecutar actualización
    exec('/opt/location-tracker/update-frontend.sh', (error, stdout, stderr) => {
        if (error) {
            console.error('Error updating:', error);
            return res.status(500).send('Update failed');
        }
        console.log('Update output:', stdout);
        res.status(200).send('Updated successfully');
    });
});

app.listen(3002, () => {
    console.log('Webhook server listening on port 3002');
});
EOL

# Instalar dependencias del webhook server
cd /opt/location-tracker
npm install express

echo "✅ Instalación completada!"
echo ""
echo "📝 Notas importantes:"
echo "1. El backend está corriendo en PM2 (puerto 3001 para API, 6001 UDP)"
echo "2. El frontend está servido por Nginx en el puerto 80"
echo "3. Para ver logs del backend: pm2 logs location-backend"
echo "4. Para actualizar frontend manualmente: /opt/location-tracker/update-frontend.sh"
echo "5. IP pública de tu servidor: $PUBLIC_IP"
echo ""
echo "🔑 Configuración de seguridad AWS:"
echo "Asegúrate de abrir estos puertos en el Security Group de tu EC2:"
echo "- 22 (SSH)"
echo "- 80 (HTTP)"
echo "- 3001 (API Backend)"
echo "- 6001 (UDP)"
echo "- 3002 (Webhook - solo si usas GitHub Actions)"