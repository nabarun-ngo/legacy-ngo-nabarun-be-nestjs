import { AggregateRoot } from 'src/shared/models/aggregate-root';
import { ReportApprovedEvent } from '../events/report-approved.event';
import { generateUniqueNDigitNumber } from 'src/shared/utilities/password-util';
import { User } from 'src/modules/user/domain/model/user.model';

export enum ReportStatus {
    DRAFT = 'DRAFT',
    APPROVED = 'APPROVED',
}

export class ReportFilter {
    reportCode?: string;
    status?: ReportStatus[];
    requestedById?: string;
}

/**
 * ReportExecution Domain Model (Aggregate Root)
 * Tracks the lifecycle and metadata of each report generation request.
 */
export class Report extends AggregateRoot<string> {

    #approvedAt: Date | undefined;
    #approvedBy: Partial<User> | undefined;
    #status: ReportStatus;
    #dmsDocumentId: string | undefined;
    #version: number = 0;
    #parameters: Record<string, any> | undefined;
    #approvers: string[];
    #viewers: string[];
    #needApproval: boolean;
    #requestedBy: Partial<User> | undefined;
    #reportCode: string;
    #workflowId: string | undefined;
    #reportName: string;

    constructor(
        id: string,
        reportCode: string,
        reportName: string,
        requestedBy: Partial<User> | undefined,
        status: ReportStatus,
        parameters: Record<string, any> | undefined,
        needApproval: boolean,
        approvedBy: Partial<User> | undefined,
        approvedAt: Date | undefined,
        approvers: string[] | undefined,
        viewers: string[] | undefined,
        dmsDocumentId: string | undefined,
        workflowId: string | undefined,
        version: number = 0,
        createdAt?: Date,
        updatedAt?: Date,
    ) {
        super(id, createdAt, updatedAt);
        this.#reportCode = reportCode;
        this.#reportName = reportName;
        this.#requestedBy = requestedBy;
        this.#status = status;
        this.#parameters = parameters;
        this.#needApproval = needApproval;
        this.#approvedBy = approvedBy;
        this.#approvedAt = approvedAt;
        this.#approvers = approvers ?? [];
        this.#viewers = viewers ?? [];
        this.#dmsDocumentId = dmsDocumentId;
        this.#version = version;
        this.#workflowId = workflowId;
    }

    /**
     * Factory method to create a new ReportExecution in DRAFT state.
     */
    static create(props: {
        reportCode: string;
        reportName: string;
        requestedById?: string;
        parameters?: Record<string, any>;
        needApproval: boolean;
        approvers: string[] | undefined;
        viewers: string[] | undefined;
    }): Report {
        return new Report(
            `NRP${generateUniqueNDigitNumber(6)}`,
            props.reportCode,
            props.reportName,
            { id: props.requestedById },
            ReportStatus.DRAFT,
            props.parameters,
            props.needApproval,
            undefined,
            undefined,
            props.approvers ?? [],
            props.viewers ?? [],
            undefined,
            undefined,
            0,
            new Date(),
            new Date(),
        );
    }

    /**
     * Mark execution as completed with the DMS document ID.
     */
    markApproved(approvedBy: string): void {
        this.#status = ReportStatus.APPROVED;
        this.#approvedBy = { id: approvedBy };
        this.#approvedAt = new Date();
        this.addDomainEvent(new ReportApprovedEvent(this));
    }

    incrementVersion(): void {
        this.#version++;
    }

    markDraft() {
        this.#status = ReportStatus.DRAFT;
        this.#approvedBy = undefined;
        this.#approvedAt = undefined;
    }

    set dmsDocumentId(id: string) {
        this.#dmsDocumentId = id;
    }

    get reportName(): string {
        return this.#reportName;
    }

    set workflowId(id: string) {
        this.#workflowId = id;
    }

    get workflowId(): string | undefined {
        return this.#workflowId;
    }

    get reportCode(): string {
        return this.#reportCode;
    }
    get requestedBy(): Partial<User> | undefined {
        return this.#requestedBy;
    }
    get status(): ReportStatus {
        return this.#status;
    }
    get parameters(): Record<string, any> | undefined {
        return this.#parameters;
    }
    get needApproval(): boolean {
        return this.#needApproval;
    }
    get approvedBy(): Partial<User> | undefined {
        return this.#approvedBy;
    }
    get approvedAt(): Date | undefined {
        return this.#approvedAt;
    }
    get approvers(): string[] {
        return this.#approvers;
    }
    get viewers(): string[] {
        return this.#viewers;
    }
    get dmsDocumentId(): string | undefined {
        return this.#dmsDocumentId;
    }
    get version(): number {
        return this.#version;
    }
}
