import jwt from 'jsonwebtoken';

interface AuthTokenPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
}

export class JwtService {
  constructor(private readonly secret: string) {}

  sign(user: { id: string; email: string }) {
    return jwt.sign({ email: user.email }, this.secret, {
      subject: user.id,
      expiresIn: '7d',
      issuer: 'maxcanva',
      audience: 'maxcanva-web',
    });
  }

  verify(token: string): AuthTokenPayload {
    const payload = jwt.verify(token, this.secret, {
      issuer: 'maxcanva',
      audience: 'maxcanva-web',
    });
    if (typeof payload === 'string' || !payload.sub || !payload.email) {
      throw new Error('Invalid JWT payload');
    }
    return payload as AuthTokenPayload;
  }
}
