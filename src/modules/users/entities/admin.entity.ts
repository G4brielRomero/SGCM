import { ChildEntity } from 'typeorm';
import { User, UserType } from './user.entity';

@ChildEntity(UserType.ADMIN)
export class Admin extends User {
  constructor() {
    super();
    this.type = UserType.ADMIN;
  }
}
