import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { formatDate } from "src/shared/utilities/common.util";
import { toKeyValueDto } from "src/shared/utilities/kv-config.util";
import { Donation,DonationType } from "../../domain/model/donation.model";
import type { IDonationRepository } from "../../domain/repositories/donation.repository.interface";
import { DONATION_REPOSITORY } from "../../domain/repositories/donation.repository.interface";
import { MetadataService } from "../../infrastructure/external/metadata.service";
import {
CreateDonationDto,
CreateGuestDonationDto,
DonationDetailFilterDto,
DonationDto,
DonationRefDataDto,
DonationSummaryDto,
UpdateDonationDto,
} from "../dto/donation.dto";
import { DonationDtoMapper } from "../dto/mapper/donation-dto.mapper";
import { CreateDonationUseCase } from "../use-cases/create-donation.use-case";
import { ProcessDonationPaymentUseCase } from "../use-cases/process-donation-payment.use-case";
import { UpdateDonationUseCase } from "../use-cases/update-donation.use-case";

@Injectable()
export class DonationService {
  constructor(
    @Inject(DONATION_REPOSITORY)
    private readonly donationRepository: IDonationRepository,
    private readonly createDonationUseCase: CreateDonationUseCase,
    private readonly updateDonationUseCase: UpdateDonationUseCase,
    private readonly processPaymentUseCase: ProcessDonationPaymentUseCase,
    private readonly metadataService: MetadataService,
  ) {}

  async list(
    filter: BaseFilter<DonationDetailFilterDto>,
  ): Promise<PagedResult<DonationDto>> {
    const result = await this.donationRepository.findPaged({
      pageIndex: filter.pageIndex,
      pageSize: filter.pageSize,
      props: {
        donationId: filter.props?.donationId,
        donorId: filter.props?.donorId,
        donorName: filter.props?.donorName,
        status: filter.props?.status,
        type: filter.props?.type,
        isGuest: filter.props?.isGuest
          ? filter.props?.isGuest === "Y"
          : undefined,
        startDate_raisedOn: filter.props?.startDate,
        endDate_raisedOn: filter.props?.endDate,
      },
    });
    return new PagedResult(
      result.content.map((d) => DonationDtoMapper.toDto(d)),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }

  async getById(id: string): Promise<DonationDto> {
    const donation = await this.donationRepository.findById(id);
    if (!donation) {
      throw new BusinessException(`Donation not found with id: ${id}`);
    }
    return DonationDtoMapper.toDto(donation);
  }

  async create(dto: CreateDonationDto): Promise<DonationDto> {
    const donation = await this.createDonationUseCase.execute({
      type: dto.type,
      amount: dto.amount,
      isGuest: false,
      endDate: dto.endDate,
      startDate: dto.startDate,
      donorId: dto.donorId,
      forEventId: dto.type == DonationType.ONETIME ? dto.forEventId : undefined,
    });
    return DonationDtoMapper.toDto(donation);
  }

  async createGuest(dto: CreateGuestDonationDto): Promise<DonationDto> {
    const donation = await this.createDonationUseCase.execute({
      type: DonationType.ONETIME,
      amount: dto.amount,
      isGuest: true,
      donorName: dto.donorName,
      donorEmail: dto.donorEmail,
      donorNumber: dto.donorNumber,
      forEventId: dto.forEventId,
    });
    return DonationDtoMapper.toDto(donation);
  }

  async update(
    id: string,
    dto: UpdateDonationDto,
    userId: string,
  ): Promise<DonationDto> {
    const donation = await this.updateDonationUseCase.execute({
      status: dto.status,
      remarks: dto.remarks,
      amount: dto.amount,
      forEvent: dto.forEvent,
      id: id,
      paidToAccountId: dto.paidToAccountId,
      confirmedById: userId,
      paidUsingUPI: dto.paidUsingUPI,
      paymentMethod: dto.paymentMethod,
      paidOn: dto.paidOn,
    });
    return DonationDtoMapper.toDto(donation);
  }

  async processPayment(id: string, dto: any): Promise<DonationDto> {
    const donation = await this.processPaymentUseCase.execute({
      donationId: id,
      ...dto,
    });
    return DonationDtoMapper.toDto(donation);
  }

  async getSummary(donorId: string): Promise<DonationSummaryDto> {
    const donations = await this.donationRepository.findAll({
      donorId: donorId,
      status: Donation.outstandingStatus,
      type: [DonationType.REGULAR],
    });
    return {
      outstandingAmount: donations.reduce(
        (total, donation) => total + donation.amount,
        0,
      ),
      hasOutstanding: donations.length > 0,
      outstandingMonths: donations
        .filter((d) => d.startDate)
        .map((d) =>
          formatDate(d.startDate!, {
            format: "MMMM yyyy",
          }),
        ),
    };
  }

  async getReferenceData(): Promise<DonationRefDataDto> {
    const data = await this.metadataService.getReferenceData();
    return {
      donationStatuses: data.donationStatus.map(toKeyValueDto),
      donationTypes: data.donationType.map(toKeyValueDto),
      paymentMethods: data.paymentMethod.map(toKeyValueDto),
      upiOptions: data.upiOption.map(toKeyValueDto),
    };
  }
}
