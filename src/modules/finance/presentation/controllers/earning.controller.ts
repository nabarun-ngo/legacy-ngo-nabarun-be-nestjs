import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiAutoPagedResponse, ApiAutoResponse } from 'src/shared/decorators/api-auto-response.decorator';
import { SuccessResponse, } from 'src/shared/models/response-model';
import {
  EarningDetailDto,
  EarningDetailFilterDto,
  CreateEarningDto,
  UpdateEarningDto,
  EarningRefDataDto,
} from '../../application/dto/earning.dto';
import { EarningService } from '../../application/services/earning.service';
import { PagedResult } from 'src/shared/models/paged-result';
import { RequirePermissions } from 'src/modules/shared/auth/application/decorators/require-permissions.decorator';
import { CurrentUser } from 'src/modules/shared/auth/application/decorators/current-user.decorator';
import { type AuthUser } from 'src/modules/shared/auth/domain/models/api-user.model';

/**
 * Earning Controller - matches legacy endpoints
 * Base path: /api/earning
 */
@ApiTags(EarningController.name)
@Controller('earning')
@ApiBearerAuth('jwt') // Matches the 'jwt' security definition from main.ts
@ApiSecurity('api-key')
export class EarningController {
  constructor(
    private readonly earningService: EarningService,
  ) { }

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('create:earning')
  @ApiOperation({ summary: 'Create new earning' })
  @ApiAutoResponse(EarningDetailDto, { status: 200, description: 'OK' })
  async createEarning(@Body() dto: CreateEarningDto): Promise<SuccessResponse<EarningDetailDto>> {
    const earning = await this.earningService.create(dto);
    return new SuccessResponse(earning);
  }

  @Put(':id/update')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('update:earning')
  @ApiOperation({ summary: 'Update earning details' })
  @ApiAutoResponse(EarningDetailDto, { status: 200, description: 'OK' })
  async updateEarning(
    @Param('id') id: string,
    @Body() dto: UpdateEarningDto,
  ): Promise<SuccessResponse<EarningDetailDto>> {
    const earning = await this.earningService.update(id, dto);
    return new SuccessResponse(earning);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('read:earning')
  @ApiOperation({ summary: 'List all earnings' })
  @ApiAutoPagedResponse(EarningDetailDto, { description: 'OK', wrapInSuccessResponse: true })
  async listEarnings(
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @Query() filter?: EarningDetailFilterDto,
  ): Promise<SuccessResponse<PagedResult<EarningDetailDto>>> {
    const result = await this.earningService.list({
      pageIndex,
      pageSize,
      props: { ...filter },
    });
    return new SuccessResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('read:earning')
  @ApiOperation({ summary: 'Get earning by ID' })
  @ApiAutoResponse(EarningDetailDto, { description: 'OK' })
  async getEarningById(@Param('id') id: string): Promise<SuccessResponse<EarningDetailDto>> {
    const earning = await this.earningService.getById(id);
    return new SuccessResponse(earning);
  }

  @Get('static/referenceData')
  @ApiOperation({ summary: 'Get earning reference data' })
  @ApiAutoResponse(EarningRefDataDto, { wrapInSuccessResponse: true, description: 'Reference data retrieved successfully' })
  async getEarningReferenceData(): Promise<SuccessResponse<EarningRefDataDto>> {
    return new SuccessResponse<EarningRefDataDto>(
      await this.earningService.getReferenceData()
    );
  }

}

