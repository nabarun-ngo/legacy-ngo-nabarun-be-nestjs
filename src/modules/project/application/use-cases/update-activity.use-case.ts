import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import { Activity, ActivityStatus } from '../../domain/model/activity.model';
import { ACTIVITY_REPOSITORY } from '../../domain/repositories/activity.repository.interface';
import type { IActivityRepository } from '../../domain/repositories/activity.repository.interface';
import { UpdateActivityDto } from '../dto/activity.dto';
import { BusinessException } from '../../../../shared/exceptions/business-exception';
import { EXPENSE_REPOSITORY, type IExpenseRepository } from 'src/modules/finance/domain/repositories/expense.repository.interface';
import { DONATION_REPOSITORY, type IDonationRepository } from 'src/modules/finance/domain/repositories/donation.repository.interface';
import { ExpenseStatus } from 'src/modules/finance/domain/model/expense.model';
import { DonationStatus } from 'src/modules/finance/domain/model/donation.model';
import { EventEmitter } from 'stream';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UpdateActivityUseCase implements IUseCase<{ activityId: string; data: UpdateActivityDto }, Activity> {
    constructor(
        @Inject(ACTIVITY_REPOSITORY)
        private readonly activityRepository: IActivityRepository,
        @Inject(EXPENSE_REPOSITORY)
        private readonly expenseRepository: IExpenseRepository,
        @Inject(DONATION_REPOSITORY)
        private readonly donationRepository: IDonationRepository,
        private readonly eventBus: EventEmitter2,
    ) { }

    async execute(request: { activityId: string; data: UpdateActivityDto }): Promise<Activity> {
        const activity = await this.activityRepository.findById(request.activityId);
        if (!activity) {
            throw new BusinessException('Activity not found');
        }

        // Update domain entity
        activity.update(request.data);

        // Handle status update separately if provided
        if (request.data.status) {
            if (request.data.status == ActivityStatus.COMPLETED) {
                const expenses = await this.expenseRepository.findAll({
                    expenseRefId: request.activityId
                });
                const allowedExpenseStatus = [ExpenseStatus.SETTLED, ExpenseStatus.REJECTED];
                if (expenses.filter(e => !allowedExpenseStatus.includes(e.status)).length > 0) {
                    throw new BusinessException('Cannot close activity because there are unsettled expenses.');
                }
                const donations = await this.donationRepository.findAll({
                    forEventId: request.activityId
                });
                const allowedDonationStatus = [DonationStatus.PAID, DonationStatus.CANCELLED];
                if (donations.filter(f => !allowedDonationStatus.includes(f.status)).length > 0) {
                    throw new BusinessException('Cannot close activity because there are unsettled donations.');
                }
            }
            activity.updateStatus(request.data.status);
        }

        const savedActivity = await this.activityRepository.update(request.activityId, activity);
        for (const event of activity.domainEvents) {
            this.eventBus.emit(event.constructor.name, event);
        }
        return savedActivity;
    }
}
