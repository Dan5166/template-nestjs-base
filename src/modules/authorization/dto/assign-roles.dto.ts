import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({
    type: [String],
    example: ['admin', 'editor'],
    description: 'Role names to assign to the user.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  roles: string[];
}
