import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import { Earning, EarningCategory, EarningStatus } from '../../domain/model/earning.model';
import { EARNING_REPOSITORY } from '../../domain/repositories/earning.repository.interface';
import type { IEarningRepository } from '../../domain/repositories/earning.repository.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { TransactionRefType, TransactionType } from '../../domain/model/transaction.model';
import { CreateEarningDto } from '../dto/earning.dto';


@Injectable()
export class CreateEarningUseCase implements IUseCase<{ userId: string, dto: CreateEarningDto }, Earning> {
  constructor(
    @Inject(EARNING_REPOSITORY)
    private readonly earningRepository: IEarningRepository,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(request: { userId: string, dto: CreateEarningDto }): Promise<Earning> {
    const earning = Earning.create({
      category: request.dto.category,
      amount: request.dto.amount,
      currency: request.dto.currency,
      source: request.dto.source,
      description: request.dto.description ?? '',
      createdById: request.userId,
    });

    const savedEarning = await this.earningRepository.create(earning);

    // Emit domain events
    for (const event of earning.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    earning.clearEvents();

    return savedEarning;
  }
}

