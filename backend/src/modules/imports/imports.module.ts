import { Module } from '@nestjs/common';
import { CartagenaImportService } from './sources/cartagena/cartagena-import.js';
import { FreeCodeCampImportService } from './sources/freecodecamp/freecodecamp-import.js';
import { ExternalImportService } from './sources/himalayas/himalayas-import.js';
import { ExternalLearningImportService } from './sources/learning/external-learning-import.js';

@Module({
  providers: [
    CartagenaImportService,
    ExternalImportService,
    FreeCodeCampImportService,
    ExternalLearningImportService,
  ],
})
export class ImportsModule {}
