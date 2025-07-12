import jwt from 'jsonwebtoken';
import { config } from '../config/environment.js';

export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    config.jwt.secret,
    { 
      expiresIn: config.jwt.expiresIn,
      issuer: 'travel-ai-backend',
      audience: 'travel-ai-users'
    }
  );
};

export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret, {
    issuer: 'travel-ai-backend',
    audience: 'travel-ai-users'
  });
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};