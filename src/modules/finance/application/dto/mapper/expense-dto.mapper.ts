import { UserDtoMapper } from "src/modules/user/application/dto/user-dto.mapper";
import { User } from "src/modules/user/domain/model/user.model";
import { Expense,ExpenseItem } from "../../../domain/model/expense.model";
import { ExpenseDetailDto,ExpenseItemDetailDto } from "../expense.dto";

/**
 * Expense DTO Mapper
 */
export class ExpenseDtoMapper {
  static toDto(expense: Expense): ExpenseDetailDto {
    return {
      id: expense.id,
      name: expense.name,
      description: expense.description,
      expenseDate: expense.expenseDate,
      createdBy: UserDtoMapper.toUserDTO(expense.requestedBy as User), // UserDetail reference
      createdOn: expense.createdAt,
      isDeligated: expense.isDelegated,
      paidBy: UserDtoMapper.toUserDTO(expense.paidBy as User), // UserDetail reference
      finalizedBy: expense.finalizedBy
        ? UserDtoMapper.toUserDTO(expense.finalizedBy as User)
        : undefined, // UserDetail reference
      status: expense.status,
      finalizedOn: expense.finalizedDate,
      settledBy: expense.settledBy
        ? UserDtoMapper.toUserDTO(expense.settledBy as User)
        : undefined, // UserDetail reference
      settledOn: expense.settledDate,
      expenseItems: expense.expenseItems.map((item) =>
        this.expenseItemToDto(item),
      ),
      finalAmount: expense.amount,
      expenseRefType: expense.referenceType,
      expenseRefId: expense.referenceId,
      txnNumber: expense.transactionId,
      settlementAccountId: expense.accountId!, // Would need to fetch account
      rejectedBy: expense.rejectedBy
        ? UserDtoMapper.toUserDTO(expense.rejectedBy as User)
        : undefined, // UserDetail reference
      rejectedOn: expense.rejectedDate,
      remarks: expense.remarks,
      activityId: expense.activityId,
      activityName: expense.activityName,
    };
  }

  private static expenseItemToDto(item: ExpenseItem): ExpenseItemDetailDto {
    return {
      itemName: item.itemName,
      amount: item.amount,
    };
  }
}
