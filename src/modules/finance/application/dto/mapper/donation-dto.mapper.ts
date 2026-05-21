import { UserDtoMapper } from 'src/modules/user/application/dto/user-dto.mapper';
import { Donation } from '../../../domain/model/donation.model';
import { DonationDto } from '../donation.dto';
import { AccountDtoMapper } from '../mapper/account-dto.mapper';
import { User } from 'src/modules/user/domain/model/user.model';
import { Account } from '../../../domain/model/account.model';

/**
 * Donation DTO Mapper
 */
export class DonationDtoMapper {
  static toDto(donation: Donation): DonationDto {
    return {
      id: donation.id,
      type: donation.type,
      amount: donation.amount,
      currency: donation.currency,
      status: donation.status,
      donorId: donation.donorId!,
      donorName: donation.donorName,
      donorEmail: donation.donorEmail,
      donorNumber: donation.donorNumber,
      // Legacy fields
      isGuest: donation.isGuest,
      startDate: donation.startDate,
      endDate: donation.endDate,
      raisedOn: donation.raisedOn,
      paidOn: donation.paidOn,
      confirmedBy: donation.confirmedBy ? UserDtoMapper.toUserDTO(donation.confirmedBy as User) : undefined,
      confirmedOn: donation.confirmedOn,
      paymentMethod: donation.paymentMethod,
      paidToAccount: donation.paidToAccount ? AccountDtoMapper.toDto(donation.paidToAccount as Account, { includeBankDetail: false, includeUpiDetail: false }) : undefined,
      paidUsingUPI: donation.paidUsingUPI,
      isPaymentNotified: donation.isPaymentNotified,
      transactionRef: donation.transactionRef,
      remarks: donation.remarks,
      cancelletionReason: donation.cancelletionReason,
      laterPaymentReason: donation.laterPaymentReason,
      paymentFailureDetail: donation.paymentFailureDetail,
      nextStatuses: donation.nextStatus(),
      activityId: donation.forEventId,
      activityName: donation.activityName,
    };
  }

  static toDomain(dto: DonationDto): Donation {
    // This is a simplified version - in practice, you'd use factory methods
    throw new Error('Use factory methods to create domain entities');
  }
}





