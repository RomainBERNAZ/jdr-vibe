import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const dummyPasswordHash = bcrypt.hashSync('unknown-account-password', 12);
const cookieSecurityOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api'
};

export const createAuthHandlers = ({ database = pool, getJwtSecret = () => process.env.JWT_SECRET } = {}) => ({
  register: async (req, res) => {
    try {
      const { email, password } = req.body;
      const hash = await bcrypt.hash(password, 12);
      const result = await database.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, hash]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'An account already exists for this email' });
      console.error('Registration failed:', error);
      res.status(500).json({ error: 'Unable to create account' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await database.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? dummyPasswordHash);

      if (!user || !passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        getJwtSecret(),
        { algorithm: 'HS256', expiresIn: '7d', issuer: 'aether-rpg' }
      );
      res.cookie('accessToken', token, { ...cookieSecurityOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
      console.error('Login failed:', error);
      res.status(500).json({ error: 'Unable to log in' });
    }
  }
});

const authHandlers = createAuthHandlers();
export const register = authHandlers.register;
export const login = authHandlers.login;

export const logout = (_req, res) => {
  res.clearCookie('accessToken', cookieSecurityOptions);
  res.sendStatus(204);
};

