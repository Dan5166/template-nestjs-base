import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token (send as `Authorization: Bearer <token>`)' })
  accessToken: string;

  @ApiProperty({ default: 'Bearer' })
  tokenType: string;

  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;
}
