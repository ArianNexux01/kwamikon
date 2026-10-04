#!/usr/bin/env bash
# Configura o nginx do servidor para o Kwamikon Nexus e emite o certificado HTTPS
# (Let's Encrypt). Pode ser corrido mais do que uma vez: só pede um certificado novo
# quando ainda não existe um válido.
#
#   sudo ./deploy/setup-server.sh <dominio> <email> [--no-www] [--staging]
#
#   --no-www    não inclui www.<dominio> no certificado (usar se o www não tiver DNS)
#   --staging   usa o ambiente de testes do Let's Encrypt (certificado não confiável,
#               sem limites de pedidos); correr depois sem esta opção para o definitivo
set -euo pipefail

usage() {
  echo "Uso: sudo $0 <dominio> <email> [--no-www] [--staging]" >&2
  exit 1
}

[ $# -ge 2 ] || usage
DOMAIN="$1"
EMAIL="$2"
shift 2

WITH_WWW=1
STAGING=0
for arg in "$@"; do
  case "$arg" in
    --no-www) WITH_WWW=0 ;;
    --staging) STAGING=1 ;;
    *) usage ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBROOT=/var/www/certbot
LIVE_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
RENEWAL_CONF="/etc/letsencrypt/renewal/$DOMAIN.conf"

log() { echo "==> $*"; }
die() { echo "Erro: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "corre com sudo."
command -v nginx >/dev/null || die "nginx não está instalado."

if ! command -v certbot >/dev/null; then
  log "A instalar o certbot"
  if command -v apt-get >/dev/null; then
    apt-get update -q && apt-get install -y -q certbot
  elif command -v dnf >/dev/null; then
    dnf install -y certbot
  else
    die "instala o certbot manualmente (https://certbot.eff.org) e volta a correr."
  fi
fi

# Debian/Ubuntu usam sites-available/sites-enabled; outras distribuições, conf.d.
if [ -d /etc/nginx/sites-available ]; then
  SITE_FILE=/etc/nginx/sites-available/kwamikon.conf
  SITE_LINK=/etc/nginx/sites-enabled/kwamikon.conf
else
  SITE_FILE=/etc/nginx/conf.d/kwamikon.conf
  SITE_LINK=""
fi

# nginx >= 1.25.1 usa "http2 on;"; as versões anteriores (ex.: 1.24 do Ubuntu 24.04)
# só aceitam o http2 no "listen".
NGINX_VERSION="$(nginx -v 2>&1 | sed -n 's|.*nginx/\([0-9.]*\).*|\1|p')"
if [ "$(printf '%s\n1.25.1\n' "$NGINX_VERSION" | sort -V | head -n1)" = "1.25.1" ]; then
  HTTP2_SED=(-e 's|# __HTTP2__|http2 on;|')
else
  HTTP2_SED=(-e 's|listen \(.*\)443 ssl;|listen \1443 ssl http2;|' -e '/# __HTTP2__/d')
fi

install_site() {
  sed -e "s/__DOMAIN__/$DOMAIN/g" "${HTTP2_SED[@]}" "$1" >"$SITE_FILE"
  if [ -n "$SITE_LINK" ]; then ln -sf "$SITE_FILE" "$SITE_LINK"; fi
  nginx -t
  systemctl reload nginx
}

mkdir -p "$WEBROOT"

# Um certificado de testes (--staging) é substituído quando se pede o definitivo.
NEED_CERT=0
FORCE=()
if [ ! -f "$LIVE_CERT" ]; then
  NEED_CERT=1
elif [ "$STAGING" -eq 0 ] && grep -q "acme-staging" "$RENEWAL_CONF" 2>/dev/null; then
  NEED_CERT=1
  FORCE=(--force-renewal)
fi

if [ "$NEED_CERT" -eq 1 ]; then
  if [ ! -f "$LIVE_CERT" ]; then
    # Sem certificado a configuração HTTPS não passa no "nginx -t": primeiro só HTTP.
    log "A activar a configuração temporária (HTTP) para o desafio do Let's Encrypt"
    install_site "$SCRIPT_DIR/nginx/kwamikon-bootstrap.conf"
  fi

  DOMAINS=(-d "$DOMAIN")
  if [ "$WITH_WWW" -eq 1 ]; then DOMAINS+=(-d "www.$DOMAIN"); fi
  EXTRA=()
  if [ "$STAGING" -eq 1 ]; then EXTRA+=(--staging); fi

  log "A pedir o certificado para ${DOMAINS[*]}"
  certbot certonly --webroot -w "$WEBROOT" \
    --cert-name "$DOMAIN" "${DOMAINS[@]}" \
    --email "$EMAIL" --agree-tos --no-eff-email --non-interactive \
    --key-type ecdsa "${EXTRA[@]}" "${FORCE[@]}"
else
  log "Já existe um certificado válido para $DOMAIN"
fi

log "A activar a configuração HTTPS"
install_site "$SCRIPT_DIR/nginx/kwamikon.conf"

# O certbot renova sozinho (timer do systemd ou cron do pacote); este hook recarrega
# o nginx sempre que um certificado é renovado.
HOOK=/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
mkdir -p "$(dirname "$HOOK")"
cat >"$HOOK" <<'HOOK_EOF'
#!/bin/sh
nginx -t && systemctl reload nginx
HOOK_EOF
chmod +x "$HOOK"

if ! systemctl list-timers --all 2>/dev/null | grep -q certbot && [ ! -f /etc/cron.d/certbot ]; then
  log "A agendar a renovação automática (cron, duas vezes por dia)"
  echo "0 3,15 * * * root certbot renew --quiet" >/etc/cron.d/certbot-kwamikon
fi

log "A testar a renovação"
certbot renew --dry-run --cert-name "$DOMAIN"

log "Pronto: https://$DOMAIN"
