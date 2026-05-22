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
import { ApiAutoPagedResponse, ApiAutoPrimitiveResponse, ApiAutoResponse } from 'src/shared/decorators/api-auto-response.decorator';
import { SuccessResponse } from 'src/shared/models/response-model';
import {
  AccountDetailDto,
  CreateAccountDto,
  UpdateAccountDto,
  UpdateAccountSelfDto,
  AccountDetailFilterDto,
  TransferDto,
  AddFundDto,
  FixTransactionDto,
  AccountRefDataDto,
} from '../../application/dto/account.dto';
import { ReverseTransactionDto, TransactionDetailDto, TransactionDetailFilterDto } from '../../application/dto/transaction.dto';
import { AccountService } from '../../application/services/account.service';
import { PagedResult } from 'src/shared/models/paged-result';
import { RequirePermissions } from 'src/modules/shared/auth/application/decorators/require-permissions.decorator';
import { CurrentUser } from 'src/modules/shared/auth/application/decorators/current-user.decorator';
import { type AuthUser } from 'src/modules/shared/auth/domain/models/api-user.model';
import { FixTransactionUseCase } from '../../application/use-cases/fix-transaction.use-case';
import { deprecate } from 'node:util';

/**
 * Account Controller - matches legacy endpoints
 * Base path: /api/account
 */
@ApiTags(AccountController.name)
@Controller('account')
@ApiBearerAuth('jwt') // Matches the 'jwt' security definition from main.ts
@ApiSecurity('api-key')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly fixTransaction: FixTransactionUseCase
  ) { }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('create:account')
  @ApiOperation({ summary: 'Create new account' })
  @ApiAutoResponse(AccountDetailDto, { status: 201, description: 'Created' })
  async createAccount(@Body() dto: CreateAccountDto): Promise<SuccessResponse<AccountDetailDto>> {
    const account = await this.accountService.create(dto);
    return new SuccessResponse(account);
  }

  @Put(':id/update')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('update:account')
  @ApiOperation({ summary: 'Update account details' })
  @ApiAutoResponse(AccountDetailDto, { status: 200, description: 'OK' })
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<SuccessResponse<AccountDetailDto>> {
    const account = await this.accountService.update(id, dto);
    return new SuccessResponse(account);
  }

  @Put(':id/update/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own account details' })
  @ApiAutoResponse(AccountDetailDto, { status: 200, description: 'OK' })
  async updateSelf(
    @Param('id') id: string,
    @Body() dto: UpdateAccountSelfDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<AccountDetailDto>> {
    const account = await this.accountService.update(id, dto, user.profile_id);
    return new SuccessResponse(account);
  }

  @Get('list')
  @ApiOperation({ summary: 'List all accounts' })
  @RequirePermissions('read:accounts')
  @ApiAutoPagedResponse(AccountDetailDto, { description: 'OK', wrapInSuccessResponse: true })
  @ApiQuery({ name: 'pageIndex', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async listAccounts(
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @Query() filter?: AccountDetailFilterDto): Promise<SuccessResponse<PagedResult<AccountDetailDto>>> {
    const result = await this.accountService.list({
      pageIndex,
      pageSize,
      props: filter,
    });
    return new SuccessResponse(result);
  }

  @Get('list/me')
  @ApiOperation({ summary: 'List own accounts' })
  @ApiQuery({ name: 'pageIndex', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiAutoPagedResponse(AccountDetailDto, { description: 'OK', wrapInSuccessResponse: true })
  async listSelfAccounts(
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @Query() filter?: AccountDetailFilterDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<SuccessResponse<PagedResult<AccountDetailDto>>> {
    const result = await this.accountService.list({
      pageIndex,
      pageSize,
      props: filter,
    }, user?.profile_id);
    return new SuccessResponse(result);
  }


  @Get(':id/transactions')
  @ApiOperation({ summary: 'List transactions for account' })
  @ApiQuery({ name: 'pageIndex', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @RequirePermissions('read:transactions')
  @ApiAutoPagedResponse(TransactionDetailDto, { description: 'OK', wrapInSuccessResponse: true })
  async listAccountTransactions(
    @Param('id') accountId: string,
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @Query() filter?: TransactionDetailFilterDto,
  ): Promise<SuccessResponse<PagedResult<TransactionDetailDto>>> {
    const result = await this.accountService.listTransactions(accountId, {
      pageIndex,
      pageSize,
      props: filter,
    });
    return new SuccessResponse(result);
  }

  @Get(':id/transactions/me')
  @ApiOperation({ summary: 'List own transactions for account' })
  @ApiAutoPagedResponse(TransactionDetailDto, { description: 'OK', wrapInSuccessResponse: true })
  async listSelfAccountTransactions(
    @Param('id') accountId: string,
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @Query() filter?: TransactionDetailFilterDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<SuccessResponse<PagedResult<TransactionDetailDto>>> {
    const result = await this.accountService.listTransactions(accountId, {
      pageIndex,
      pageSize,
      props: filter,
    }, user?.profile_id);
    return new SuccessResponse(result);
  }

  @Post(':id/transfer/me')
  @ApiOperation({ summary: 'Transfer amount to another account' })
  @ApiAutoResponse(String, { description: 'OK', wrapInSuccessResponse: true })
  async transferAmountSelf(
    @Param('id') accountId: string,
    @Body() dto: TransferDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<SuccessResponse<string>> {
    const result = await this.accountService.transferAmount(accountId, dto, user?.profile_id);
    return new SuccessResponse(result);
  }

  @Post(':id/transfer')
  @RequirePermissions('update:accounts', 'update:transactions')
  @ApiOperation({ summary: 'Transfer amount to another account' })
  @ApiAutoResponse(String, { description: 'OK', wrapInSuccessResponse: true })
  async transferAmount(
    @Param('id') accountId: string,
    @Body() dto: TransferDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<SuccessResponse<string>> {
    const result = await this.accountService.transferAmount(accountId, dto, undefined);
    return new SuccessResponse(result);
  }

  @Get('payable-account')
  @ApiOperation({ summary: 'Get account data for payable' })
  @ApiAutoResponse(AccountDetailDto, { status: 200, description: 'OK', isArray: true, wrapInSuccessResponse: true })
  @ApiQuery({ name: 'isTransfer', required: false, type: Boolean })
  async payableAccount(@Query() isTransfer: boolean): Promise<SuccessResponse<AccountDetailDto[]>> {
    const account = await this.accountService.payableAccount(isTransfer);
    return new SuccessResponse(account);
  }

  @Get('static/referenceData')
  @ApiOperation({ summary: 'Get account reference data' })
  @ApiAutoResponse(AccountRefDataDto, { wrapInSuccessResponse: true, description: 'Donation reference data retrieved successfully' })
  async getAccountReferenceData(): Promise<SuccessResponse<AccountRefDataDto>> {
    return new SuccessResponse<AccountRefDataDto>(
      await this.accountService.getReferenceData()
    );
  }



  // @Post('support/transaction-fix')
  // @ApiOperation({ summary: 'Fix transaction for account' })
  // @RequirePermissions('update:transactions')
  // @ApiAutoResponse(String, { description: 'OK', wrapInSuccessResponse: true })
  // async fixTransactions(
  //   @Body() dto: FixTransactionDto,
  // ): Promise<SuccessResponse<string>> {
  //   await this.fixTransaction.execute(dto);
  //   return new SuccessResponse('Transaction fixed successfully');
  // }

  // @Post(':id/addFund/me')
  // @ApiOperation({ summary: 'Add fund to account' })
  // @ApiAutoResponse(String, { description: 'OK', wrapInSuccessResponse: true })
  // async addFundSelf(
  //   @Param('id') accountId: string,
  //   @Body() dto: AddFundDto,
  //   @CurrentUser() user?: AuthUser,
  // ): Promise<SuccessResponse<string>> {
  //   const result = await this.accountService.addFundToAccount(accountId, dto, user?.profile_id);
  //   return new SuccessResponse(result);
  // }

  // @Post(':id/addFund')
  // @RequirePermissions('update:accounts', 'update:transactions')
  // @ApiOperation({ summary: 'Add fund to account' })
  // @ApiAutoResponse(String, { description: 'OK', wrapInSuccessResponse: true })
  // async addFund(
  //   @Param('id') accountId: string,
  //   @Body() dto: AddFundDto,
  // ): Promise<SuccessResponse<string>> {
  //   const result = await this.accountService.addFundToAccount(accountId, dto, undefined);
  //   return new SuccessResponse(result);
  // }

}

