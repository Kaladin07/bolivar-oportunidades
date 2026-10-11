import { Module } from '@nestjs/common';
import { CartagenaImportService } from './sources/cartagena/cartagena-import.js';
import { ExternalImportService } from './sources/himalayas/himalayas-import.js';

@Module({
  providers: [CartagenaImportService, ExternalImportService],
})
export class ImportsModule {}
