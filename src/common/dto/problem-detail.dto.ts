import { ApiProperty } from '@nestjs/swagger';

export class ProblemDetailDto {
  @ApiProperty({ example: 'https://sgcm.example.com/problems/not-found' })
  type: string;

  @ApiProperty({ example: 'Recurso não encontrado' })
  title: string;

  @ApiProperty({ example: 404 })
  status: number;

  @ApiProperty({ example: 'Médico com id 15 não foi encontrado.' })
  detail: string;

  @ApiProperty({ example: '/doctors/15' })
  instance: string;

  @ApiProperty({ example: 'GET' })
  method: string;

  @ApiProperty({ example: '2026-05-10T14:00:00.000Z' })
  timestamp: string;
}
