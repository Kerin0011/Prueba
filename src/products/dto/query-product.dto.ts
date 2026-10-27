import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class QueryProductDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'teclado' })
  @IsOptional()
  @IsString()
  search?: string;
}
