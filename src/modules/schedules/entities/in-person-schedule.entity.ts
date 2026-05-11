import { ChildEntity, Column } from 'typeorm';
import { Schedule, ScheduleType } from './schedule.entity';

@ChildEntity(ScheduleType.IN_PERSON)
export class InPersonSchedule extends Schedule {
  @Column({ nullable: true })
  room: string;

  @Column({ nullable: true })
  unit: string;

  constructor() {
    super();
    this.type = ScheduleType.IN_PERSON;
  }
}
