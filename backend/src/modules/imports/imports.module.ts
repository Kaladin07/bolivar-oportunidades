import { Module } from '@nestjs/common';
import { CartagenaImportService } from './sources/cartagena/cartagena-import.js';
import { FreeCodeCampImportService } from './sources/freecodecamp/freecodecamp-import.js';
import { ExternalImportService } from './sources/himalayas/himalayas-import.js';
import { CuratedLearningImportService } from './sources/learning/curated-learning-import.js';

@Module({
  providers: [
    CartagenaImportService,
    ExternalImportService,
    FreeCodeCampImportService,
    CuratedLearningImportService,
  ],
})
export class ImportsModule {}
