import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.backofficeUser.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    const token = await this.jwt.signAsync(payload);

    return {
      accessToken: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
