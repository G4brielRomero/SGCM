import { UserType } from '../../users/entities/user.entity';

export interface UserPayload {
  sub: number;
  email: string;
  type: UserType;
  jti: string;
  tokenType: 'access' | 'refresh';
}