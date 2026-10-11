import { Modality, OpportunityType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SearchOpportunitiesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(OpportunityType)
  type?: OpportunityType;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(Modality)
  modality?: Modality;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsIn(['recent', 'closing'])
  sort?: 'recent' | 'closing';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page = 1;
}
