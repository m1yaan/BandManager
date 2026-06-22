import helmet from 'helmet';

const isProduction = process.env.NODE_ENV === 'production';

export function getAllowedOrigins(): string[] {
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
  if (isProduction) {
    return clientUrl ? [clientUrl] : [];
  }
  return [
    clientUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];
}

function getConnectSrc(): string[] {
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
  if (isProduction) {
    return ["'self'", clientUrl];
  }
  return [
    "'self'",
    'http://localhost:*',
    'ws://localhost:*',
    'http://127.0.0.1:*',
    'ws://127.0.0.1:*',
    clientUrl,
  ];
}

export function getHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: getConnectSrc(),
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      },
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: isProduction
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  });
}
