import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { TransportEmail } from './transport-email.js';

@Global()
@Module({
  providers: [EmailService, TransportEmail],
  exports: [EmailService],
})
export class EmailModule {}
