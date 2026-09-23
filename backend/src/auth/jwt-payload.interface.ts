export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: 'ORGANIZADOR' | 'STAFF_PORTA';
}
