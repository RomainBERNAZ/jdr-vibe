import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string' && authorization.match(/^Bearer ([^\s]+)$/i);
  const token = req.cookies?.accessToken || match?.[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'aether-rpg' }, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

