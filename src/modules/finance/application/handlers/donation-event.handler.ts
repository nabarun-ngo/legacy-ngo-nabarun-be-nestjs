import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { CorrespondenceRequestEvent } from "src/modules/shared/correspondence/application/events/correspondence-request.event";
import { UserDeletedEvent } from "src/modules/user/domain/events/user-deleted.event";
import { CorrespondenceKey } from "src/shared/correspondence-key.enum";
import { formatDate } from "src/shared/utilities/common.util";
import { DonationPaidEvent } from "../../domain/events/donation-paid.event";
import { DonationRaisedEvent } from "../../domain/events/donation-raised.event";
import { Donation } from "../../domain/model/donation.model";
import {
  DONATION_REPOSITORY,
  type IDonationRepository,
} from "../../domain/repositories/donation.repository.interface";

@Injectable()
export class DonationsEventHandler {
  constructor(
    @Inject(DONATION_REPOSITORY)
    private readonly donationRepository: IDonationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── DonationRaisedEvent — PATH A (needs DB lookup to resolve donorEmail) ──

  @OnEvent(DonationRaisedEvent.name, { async: true })
  async handleDonationRaisedEvent(event: DonationRaisedEvent) {
    event.log(`Donation raised event start: ${event.donation.id}`);
    try {
      const donation = await this.donationRepository.findById(
        event.donation.id,
      );
      if (!donation?.donorEmail) {
        event.log(`No donor email found for donation ${donation?.id}`);
        return;
      }

      this.eventEmitter.emit(
        CorrespondenceRequestEvent.name,
        new CorrespondenceRequestEvent({
          key: CorrespondenceKey.DONATION_CREATED,
          targetUsers: [
            { id: donation.donorId ?? "", email: donation.donorEmail },
          ],
          data: {
            donation: donation.toJson(),
            donationPeriod:
              donation.startDate && donation.endDate
                ? `${formatDate(donation.startDate)} - ${formatDate(donation.endDate)}`
                : "Not Applicable",
          },
          referenceId: donation.id,
          referenceType: "donation",
        }),
      );
    } catch (error) {
      event.error(
        `Failed to process donation raised event for ${event.donation.id}`,
        error,
      );
      throw error;
    }
    event.log(`Donation raised event end: ${event.donation.id}`);
  }

  // ── DonationPaidEvent — PATH A (needs DB lookup to resolve donorEmail) ────

  @OnEvent(DonationPaidEvent.name, { async: true })
  async handleDonationPaidEvent(event: DonationPaidEvent) {
    event.log(`Donation paid event start: ${event.donation.id}`);
    try {
      const donation = await this.donationRepository.findById(
        event.donation.id,
      );
      if (!donation?.donorEmail) {
        event.warn(`No donor email found for donation ${donation?.id}`);
        return;
      }

      this.eventEmitter.emit(
        CorrespondenceRequestEvent.name,
        new CorrespondenceRequestEvent({
          key: CorrespondenceKey.DONATION_PAID,
          targetUsers: [
            { id: donation.donorId ?? "", email: donation.donorEmail },
          ],
          data: {
            paidOn: donation?.paidOn
              ? formatDate(donation?.paidOn)
              : "Not Applicable",
            confirmedByName: donation?.confirmedBy?.fullName,
            donation: donation.toJson(),
            donationPeriod:
              donation?.startDate && donation?.endDate
                ? `${formatDate(donation.startDate)} - ${formatDate(donation.endDate)}`
                : "Not Applicable",
          },
          referenceId: donation.id,
          referenceType: "donation",
        }),
      );
    } catch (error) {
      event.error(
        `Failed to process donation paid event for ${event.donation.id}`,
        error,
      );
      throw error;
    }
    event.log(`Donation paid event end: ${event.donation.id}`);
  }

  // ── UserDeletedEvent — cancel outstanding donations ───────────────────────

  @OnEvent(UserDeletedEvent.name, { async: true })
  async handleUserDeletedEvent(event: UserDeletedEvent) {
    const user = event.user;
    event.log(`Processing user deletion for user: ${user.id}`);
    const donations = await this.donationRepository.findAll({
      donorId: user.id,
      status: Donation.outstandingStatus,
    });
    event.log(
      `Found ${donations.length} outstanding donations for user: ${user.id}`,
    );
    for (const donation of donations) {
      donation.cancel();
      await this.donationRepository.update(donation.id, donation);
      event.log(`Cancelled donation: ${donation.id}`);
    }
    event.log(`Processed user deletion for user: ${user.id}`);
  }
}
