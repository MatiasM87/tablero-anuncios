# Tablero de Anuncios

Aplicación web para gestionar y proyectar un tablero de anuncios en una TV (imágenes, PDFs, documentos Word y páginas/embeds web como Google Docs, Slides o Sheets), con rotación automática y panel de administración para cargar y ordenar contenido.

- **Cliente**: React + Vite + Tailwind CSS
- **Servidor**: Node.js + Express, almacenamiento en archivos JSON (`server/data/db.json`) y uploads en disco (`server/uploads/`)

## Estructura

```
client/   # SPA en React (build con Vite)
server/   # API Express, sirve también el build del cliente en producción
```

## Desarrollo local

```bash
npm run install:all   # instala dependencias de root, server y client
npm run dev            # levanta cliente (Vite) y servidor (nodemon) en paralelo
```

- Servidor de desarrollo: http://localhost:3001
- Cliente de desarrollo: http://localhost:5173
- Panel de administración: `/admin`

### Acceso al panel de administración

`/admin` está protegido por clave. La clave predeterminada es **`admin123`**; al iniciar sesión por primera vez la aplicación obliga a elegir una clave nueva. La clave se puede volver a cambiar desde **Seguridad** en el panel, donde también se puede cerrar la sesión.

### Título del tablero

Desde **Título del tablero** en `/admin` se puede activar una barra de título en la parte superior de la pantalla principal, eligiendo texto, tipo de fuente, tamaño y colores (texto y barra). Si el título es más largo que la pantalla, se corta con «…».

### Horario programado por página

En `/admin/layout`, cada página puede tener un **horario programado** (días de la semana + hora de inicio y fin). Durante ese horario, el tablero muestra solo esa página, sin rotar a las demás; al terminar, vuelve la rotación normal. Opcionalmente se puede marcar que la página se muestre *solo* en su horario (fuera de él no participa de la rotación). Un rango con fin anterior al inicio (ej. 22:00 → 06:00) cruza la medianoche. Si dos páginas programadas coinciden, gana la primera de la lista.

## Producción con Docker

El proyecto incluye un `Dockerfile` multi-stage (build del cliente + servidor Node) y un `docker-compose.yml` para levantarlo como contenedor.

```bash
sudo docker compose build
sudo docker compose up -d
```

El contenedor expone el puerto **3010** solo en `127.0.0.1` (no público), pensado para ir detrás de un proxy inverso (nginx). Los datos persisten en el host vía volúmenes:

- `./server/data` → base de datos (`db.json`)
- `./server/uploads` → archivos subidos

Para ver logs o reiniciar:

```bash
sudo docker compose logs -f
sudo docker compose restart
```

## Despliegue en este servidor (VM)

- **Dominio**: https://tablero.congregacion.com.ar
- **Puerto interno**: 3010 (elegido para no colisionar con las apps Flask existentes, que usan 5000-5003 y 5010)
- **Proxy inverso**: nginx, config en `/etc/nginx/sites-available/tablero.congregacion.com.ar`
- **SSL**: certificado Let's Encrypt vía certbot, con renovación automática ya configurada (`certbot renew` corre por systemd timer)

### Auto-deploy desde git

El script `autodeploy.sh` corre cada 5 minutos vía cron y despliega automáticamente cuando hay nuevos commits en `origin/main`: detiene el contenedor, sincroniza el código y lo vuelve a levantar (rebuild incluido). Usa un lock (`flock`) para evitar que se solapen dos ejecuciones si un deploy tarda más de 5 minutos.

```bash
# Ver log de deploys
tail -f /home/matias/tablero-anuncios/autodeploy.log

# Ejecutar deploy manual
bash /home/matias/tablero-anuncios/autodeploy.sh
```

### Actualizar la app en el servidor (manual)

```bash
cd /home/matias/tablero-anuncios
git pull
sudo docker compose up -d --build
```

El contenedor tiene `restart: unless-stopped`, por lo que vuelve a levantarse solo si Docker o la VM se reinician.
