import {
Body,
Controller,
Get,
HttpCode,
HttpStatus,
Param,
Post,
Put,
Query,
} from "@nestjs/common";
import {
ApiBearerAuth,
ApiOperation,
ApiSecurity,
ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/modules/shared/auth/application/decorators/current-user.decorator";
import { RequirePermissions } from "src/modules/shared/auth/application/decorators/require-permissions.decorator";
import { type AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import {
ApiAutoPagedResponse,
ApiAutoResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { PagedResult } from "src/shared/models/paged-result";
import { SuccessResponse } from "src/shared/models/response-model";
import {
CreateExpenseDto,
ExpenseDetailDto,
ExpenseDetailFilterDto,
ExpenseRefDataDto,
UpdateExpenseDto,
} from "../../application/dto/expense.dto";
import { ExpenseService } from "../../application/services/expense.service";

/**
 * Expense Controller - matches legacy endpoints
 * Base path: /api/expense
 */
@ApiTags(ExpenseController.name)
@Controller("expense")
@ApiBearerAuth("jwt") // Matches the 'jwt' security definition from main.ts
@ApiSecurity("api-key")
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post("create")
  @RequirePermissions("create:expense")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Create new expense" })
  @ApiAutoResponse(ExpenseDetailDto, { status: 200, description: "OK" })
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<ExpenseDetailDto>> {
    const expense = await this.expenseService.create(dto, user);
    return new SuccessResponse(expense);
  }
  @Put(":id/update")
  @RequirePermissions("update:expense")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update expense details" })
  @ApiAutoResponse(ExpenseDetailDto, { status: 200, description: "OK" })
  async updateExpense(
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<ExpenseDetailDto>> {
    const expense = await this.expenseService.update(id, dto, user.profile_id!);
    return new SuccessResponse(expense);
  }

  @Post(":id/finalize")
  @RequirePermissions("create:expense_final")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Finalize expense" })
  @ApiAutoResponse(ExpenseDetailDto, { status: 200, description: "OK" })
  async finalizeExpense(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<ExpenseDetailDto>> {
    const expense = await this.expenseService.finalize(id, user.profile_id!);
    return new SuccessResponse(expense);
  }

  @Post(":id/settle")
  @RequirePermissions("create:expense_settle")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Settle expense" })
  @ApiAutoResponse(ExpenseDetailDto, { status: 200, description: "OK" })
  async settleExpense(
    @Param("id") id: string,
    @Query("accountId") accountId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<ExpenseDetailDto>> {
    const expense = await this.expenseService.settle(
      id,
      accountId,
      user.profile_id!,
    );
    return new SuccessResponse(expense);
  }

  @Get("list")
  @RequirePermissions("read:expenses")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List all expenses" })
  @ApiAutoPagedResponse(ExpenseDetailDto, {
    description: "OK",
    wrapInSuccessResponse: true,
  })
  async listExpenses(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: ExpenseDetailFilterDto,
  ): Promise<SuccessResponse<PagedResult<ExpenseDetailDto>>> {
    const result = await this.expenseService.list({
      pageIndex,
      pageSize,
      props: { ...filter },
    });
    return new SuccessResponse(result);
  }

  @Get("list/me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List own expenses" })
  @ApiAutoPagedResponse(ExpenseDetailDto, {
    description: "OK",
    wrapInSuccessResponse: true,
  })
  async listSelfExpenses(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: ExpenseDetailFilterDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<SuccessResponse<PagedResult<ExpenseDetailDto>>> {
    const result = await this.expenseService.list({
      pageIndex,
      pageSize,
      props: { ...filter, payerId: user?.profile_id },
    });
    return new SuccessResponse(result);
  }

  @Get(":id")
  @RequirePermissions("read:expenses")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get expense by ID" })
  @ApiAutoResponse(ExpenseDetailDto, { description: "OK" })
  async getExpenseById(
    @Param("id") id: string,
  ): Promise<SuccessResponse<ExpenseDetailDto>> {
    const expense = await this.expenseService.getById(id);
    return new SuccessResponse(expense);
  }

  @Get("static/referenceData")
  @ApiOperation({ summary: "Get expense reference data" })
  @ApiAutoResponse(ExpenseRefDataDto, {
    wrapInSuccessResponse: true,
    description: "Reference data retrieved successfully",
  })
  async getExpenseReferenceData(): Promise<SuccessResponse<ExpenseRefDataDto>> {
    return new SuccessResponse<ExpenseRefDataDto>(
      await this.expenseService.getReferenceData(),
    );
  }
}
