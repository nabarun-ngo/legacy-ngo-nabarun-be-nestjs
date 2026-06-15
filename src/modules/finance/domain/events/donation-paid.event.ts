import { DomainEvent } from "src/shared/models/domain-event";
import { Donation } from "../model/donation.model";

export class DonationPaidEvent extends DomainEvent {
  constructor(public readonly donation: Donation) {
    super(donation.id, donation);
  }
}
