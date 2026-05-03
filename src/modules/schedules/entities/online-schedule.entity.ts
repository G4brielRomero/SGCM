import { ChildEntity, Column } from 'typeorm';
import { Schedule, ScheduleType } from './schedule.entity';

@ChildEntity(ScheduleType.ONLINE)
export class OnlineSchedule extends Schedule {
  @Column({ nullable: true })
  accessLink: string;

  @Column({ nullable: true })
  platform: string;

  constructor() {
    super();
    this.type = ScheduleType.ONLINE;
  }
}
