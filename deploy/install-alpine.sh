#!/bin/sh
# Install (or update) System7 Clicker on Alpine Linux, served by Caddy.
#
# Run as root from anywhere inside the repository:
#   sh deploy/install-alpine.sh clicker.example.com   # public domain, automatic HTTPS
#   sh deploy/install-alpine.sh :80                   # plain HTTP, e.g. on your LAN
#
# Environment overrides:
#   WEBROOT=/srv/clicker sh deploy/install-alpine.sh :8080
#   SKIP_CADDYFILE=1 sh deploy/install-alpine.sh      # only copy files, leave Caddy config alone
set -eu

SITE="${1:-:80}"
WEBROOT="${WEBROOT:-/var/www/system7-clicker}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
CADDYFILE=/etc/caddy/Caddyfile
MARKER="# System7 Clicker - Caddy site config"

if [ "$(id -u)" -ne 0 ]; then
	echo "Please run this as root (for example: doas sh $0 $SITE)" >&2
	exit 1
fi

if [ ! -f "$SRC/index.html" ]; then
	echo "Could not find index.html in $SRC" >&2
	exit 1
fi

echo "==> Installing Caddy (from the Alpine community repository)"
if ! apk add --no-cache caddy; then
	echo "Could not install caddy. Make sure the 'community' repository is enabled in /etc/apk/repositories." >&2
	exit 1
fi

echo "==> Copying game files to $WEBROOT"
mkdir -p "$WEBROOT"
rm -rf "$WEBROOT/css" "$WEBROOT/js" "$WEBROOT/fonts"
cp "$SRC/index.html" "$WEBROOT/"
cp -R "$SRC/css" "$SRC/js" "$SRC/fonts" "$WEBROOT/"
chmod -R a+rX "$WEBROOT"

if [ "${SKIP_CADDYFILE:-0}" != "1" ]; then
	echo "==> Writing $CADDYFILE for site '$SITE'"
	mkdir -p /etc/caddy
	if [ -f "$CADDYFILE" ] && ! grep -qF "$MARKER" "$CADDYFILE"; then
		BACKUP="$CADDYFILE.bak.$(date +%Y%m%d%H%M%S)"
		cp "$CADDYFILE" "$BACKUP"
		echo "    Your previous Caddyfile was backed up to $BACKUP"
	fi
	sed -e "s|^clicker\.example\.com {|$SITE {|" \
		-e "s|/var/www/system7-clicker|$WEBROOT|" \
		"$SRC/deploy/Caddyfile" > "$CADDYFILE"
	caddy validate --config "$CADDYFILE" --adapter caddyfile
fi

echo "==> Enabling and starting Caddy"
rc-update add caddy default >/dev/null 2>&1 || true
if rc-service caddy status >/dev/null 2>&1; then
	rc-service caddy reload || rc-service caddy restart
else
	rc-service caddy start
fi

case "$SITE" in
	:80) echo "Done! Open http://<this-machine-ip>/ in a browser." ;;
	:*) echo "Done! Open http://<this-machine-ip>$SITE/ in a browser." ;;
	*) echo "Done! Open https://$SITE in a browser (DNS must point at this machine, ports 80 and 443 open)." ;;
esac
