import dotenv from 'dotenv';
dotenv.config();

export const jwtSecret = process.env.JWT_SECRET;
export const jwtExpire = process.env.JWT_EXPIRE || '1h';
export const accessTokenSecrete = process.env.ACCESS_TOKEN_SECRET;
export const accessTokenExpires = process.env.ACCESS_TOKEN_EXPIRES || '7d';
export const refreshTokenExpires = process.env.REFRESH_TOKEN_EXPIRES || '10d';
export const refreshTokenSecrete = process.env.REFRESH_TOKEN_SECRET;