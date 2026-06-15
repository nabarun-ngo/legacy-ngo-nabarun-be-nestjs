import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { formatDate } from "src/shared/utilities/common.util";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
Donation,
DonationStatus,
DonationType,
} from "../../domain/model/donation.model";
import type { IDonationRepository } from "../../domain/repositories/donation.repository.interface";
import { DONATION_REPOSITORY } from "../../domain/repositories/donation.repository.interface";

export class CreateDonation {
  donorId?: string;
  donorName?: string;
  donorNumber?: string;
  donorEmail?: string;
  isGuest: boolean;
  type: DonationType;
  amount: number;
  startDate?: Date;
  endDate?: Date;
  forEventId?: string;
}

@Injectable()
export class CreateDonationUseCase
  implements IUseCase<CreateDonation, Donation>
{
  constructor(
    @Inject(DONATION_REPOSITORY)
    private readonly donationRepository: IDonationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(request: CreateDonation): Promise<Donation> {
    const donation = Donation.create({
      type: request.type,
      amount: request.amount,
      donorId: request.donorId!,
      startDate: request.startDate,
      endDate: request.endDate,
      donorName: request.donorName!,
      donorNumber: request.donorNumber,
      donorEmail: request.donorEmail,
      isGuest: request.isGuest,
    });

    // Apply additional fields from DTO
    if (request.forEventId) {
      donation.update({ forEventId: request.forEventId });
    }

    if (request.type == DonationType.REGULAR) {
      const donations = await this.donationRepository.findAll({
        type: [DonationType.REGULAR],
        donorId: request.donorId,
        startDate_lte: request.endDate,
        endDate_gte: request.startDate,
        status: [...Donation.outstandingStatus, DonationStatus.PAID],
      });
      if (donations.length > 0) {
        throw new BusinessException(
          `Donation already exists for this donor between ${formatDate(request.startDate!)} and ${formatDate(request.endDate!)} `,
        );
      }
    }

    // Save to repository
    const savedDonation = await this.donationRepository.create(donation);
    // Emit domain events
    for (const event of donation.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    donation.clearEvents();
    return savedDonation;
  }
}
