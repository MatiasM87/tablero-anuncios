#!/bin/bash
# Auto-deploy: detecta nuevos commits en origin/main, frena el contenedor,
# sincroniza y vuelve a levantarlo. Usa flock para evitar instancias
# concurrentes del propio script (por si un deploy tarda más de 5 minutos).

APP_DIR="/home/matias/tablero-anuncios"
LOCK="$APP_DIR/autodeploy.lock"
LOG="$APP_DIR/autodeploy.log"

exec 200>"$LOCK"
flock -n 200 || exit 0   # ya hay un deploy corriendo, salir sin hacer nada

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"; }

cd "$APP_DIR" || exit 1

git fetch origin main >> "$LOG" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

log "Nuevo commit detectado: $LOCAL -> $REMOTE. Iniciando deploy..."

sudo docker compose stop >> "$LOG" 2>&1
log "Contenedor detenido."

git pull origin main >> "$LOG" 2>&1
log "Pull completado."

sudo docker compose up -d --build >> "$LOG" 2>&1
log "Contenedor reconstruido y levantado. Deploy finalizado."
