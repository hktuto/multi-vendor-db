# SSL Certificates (Development Only)

Self-signed certificates for local HTTPS development.

## Usage

```bash
# Start dev server (always HTTPS via PM2)
pnpm dev

# Stop dev server
pnpm dev:stop

# Restart dev server
pnpm dev:restart

# View logs
pnpm dev:logs
```

## Trust Certificate (Optional)

To avoid browser warnings:

**Windows (Admin PowerShell):**
```powershell
certutil -addstore -f "ROOT" .certs\cert.pem
```

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./.certs/cert.pem
```

## Regenerate

```powershell
cd .certs
Remove-Item *.pem
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

> ⚠️ Never use in production!
