import { ChildEntity, Column } from 'typeorm';
import { Schedule, ScheduleType } from './schedule.entity';

@ChildEntity(ScheduleType.HOME)
export class HomeSchedule extends Schedule {
  @Column({ type: 'text', nullable: true })
  fullAddress: string;

  @Column({ type: 'text', nullable: true })
  accessNotes: string;

  constructor() {
    super();
    this.type = ScheduleType.HOME;
  }
}
