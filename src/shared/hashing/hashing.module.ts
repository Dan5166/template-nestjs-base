import { Global, Module } from '@nestjs/common';
import { HashingService } from './hashing.service';

/** Global so any module can inject {@link HashingService} without re-importing. */
@Global()
@Module({
  providers: [HashingService],
  exports: [HashingService],
})
export class HashingModule {}
