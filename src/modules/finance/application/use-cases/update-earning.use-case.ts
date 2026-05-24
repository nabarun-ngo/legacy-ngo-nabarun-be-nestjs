import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import { Earning, EarningStatus } from '../../domain/model/earning.model';
import { EARNING_REPOSITORY } from '../../domain/repositories/earning.repository.interface';
import type { IEarningRepository } from '../../domain/repositories/earning.repository.interface';
import { BusinessException } from '../../../../shared/exceptions/business-exception';
import { UpdateEarningDto } from '../dto/earning.dto';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { TransactionRefType, TransactionType } from '../../domain/model/transaction.model';

@Injectable()
export class UpdateEarningUseCase implements IUseCase<{ id: string; dto: UpdateEarningDto, userId: string }, Earning> {
  constructor(
    @Inject(EARNING_REPOSITORY)
    private readonly earningRepository: IEarningRepository,
    private readonly createTransactionUseCase: CreateTransactionUseCase,
  ) { }

  async execute(request: { id: string; dto: UpdateEarningDto, userId: string }): Promise<Earning> {
    const earning = await this.earningRepository.findById(request.id);
    if (!earning) {
      throw new BusinessException(`Earning not found with id: ${request.id}`);
    }
    earning.update({
      amount: request.dto.amount,
      category: request.dto.category,
      description: request.dto.description,
      earningDate: request.dto.earningDate,
      source: request.dto.source,
    });

    if (request.dto.status == EarningStatus.RECEIVED) {
      if (!request.dto.accountId) {
        throw new BusinessException('Account ID is required to mark earning as received');
      }
      if (!request.dto.earningDate) {
        throw new BusinessException('Earning Date is required to mark earning as received');
      }

      earning.markAsReceived(request.dto.accountId, request.dto.earningDate, request.userId);
      const transactionRef = await this.createTransactionUseCase.execute({
        txnAmount: earning.amount,
        currency: earning.currency,
        txnDescription: `Earning - ${earning.category} - ${earning.description}`,
        txnRefId: earning.id,
        txnRefType: TransactionRefType.EARNING,
        accountId: request.dto.accountId,
        txnDate: earning.earningDate,
        txnType: TransactionType.IN,
      });
      earning.setTransactionId(transactionRef);
    }

    if (request.dto.status == EarningStatus.CANCELLED) {
      earning.cancel();
    }


    const updatedEarning = await this.earningRepository.update(request.id, earning);
    return updatedEarning;
  }
}

