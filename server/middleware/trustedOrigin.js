const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const requireTrustedOrigin = (req, res, next) => {
  const origin = req.get('origin');
  if (!origin) return next();

  const configuredOrigins = (process.env.CORS_ORIGINS ?? (process.env.NODE_ENV === 'production'
    ? ''
    : developmentOrigins.join(',')))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = `${req.protocol}://${req.get('host')}`;

  if (origin === requestOrigin || configuredOrigins.includes(origin)) return next();
  return res.status(403).json({ error: 'Untrusted request origin' });
};