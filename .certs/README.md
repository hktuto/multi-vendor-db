# Self-Signed SSL Certificates

This directory contains self-signed SSL certificates for local HTTPS development.

## Files

- `cert.pem` - Self-signed certificate
- `key.pem` - Private key

## Usage

### Option 1: Using package.json scripts

```bash
# HTTPS development server
pnpm dev:https
```

### Option 2: Using nuxt.config.ts

The `nuxt.config.ts` has HTTPS configured automatically when running dev server.

### Option 3: Manual CLI

```bash
# Set environment variable for self-signed cert
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"

# Run dev server with HTTPS
npx nuxt dev --https --https.cert ./.certs/cert.pem --https.key ./.certs/key.pem
```

## Trust Certificate (Optional)

To avoid browser warnings, you can trust the certificate:

### Windows
1. Double-click `cert.pem`
2. Click "Install Certificate"
3. Select "Local Machine" (or "Current User")
4. Choose "Place all certificates in the following store"
5. Browse to "Trusted Root Certification Authorities"
6. Complete the wizard

### macOS
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./.certs/cert.pem
```

### Linux
```bash
sudo cp ./.certs/cert.pem /usr/local/share/ca-certificates/localhost.crt
sudo update-ca-certificates
```

## Security Warning

⚠️ **Never use these self-signed certificates in production!**

These certificates are for local development only. They provide encryption but no identity verification.

## Regenerating Certificates

If the certificate expires or you need a new one:

```bash
# Delete old certificates
Remove-Item .certs/*.pem

# Generate new ones
cd .certs
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```
