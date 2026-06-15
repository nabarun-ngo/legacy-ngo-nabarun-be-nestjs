import { Module } from "@nestjs/common";
//import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { AccountController } from "./presentation/controllers/account.controller";
import { DonationController } from "./presentation/controllers/donation.controller";
import { ExpenseController } from "./presentation/controllers/expense.controller";

// Use Cases
import { CreateAccountUseCase } from "./application/use-cases/create-account.use-case";
import { CreateDonationUseCase } from "./application/use-cases/create-donation.use-case";
import { CreateEarningUseCase } from "./application/use-cases/create-earning.use-case";
import { CreateExpenseUseCase } from "./application/use-cases/create-expense.use-case";
import { CreateTransactionUseCase } from "./application/use-cases/create-transaction.use-case";
import { FinalizeExpenseUseCase } from "./application/use-cases/finalize-expense.use-case";
import { ProcessDonationPaymentUseCase } from "./application/use-cases/process-donation-payment.use-case";
import { SettleExpenseUseCase } from "./application/use-cases/settle-expense.use-case";
import { UpdateAccountUseCase } from "./application/use-cases/update-account.use-case";
import { UpdateDonationUseCase } from "./application/use-cases/update-donation.use-case";
import { UpdateEarningUseCase } from "./application/use-cases/update-earning.use-case";
import { UpdateExpenseUseCase } from "./application/use-cases/update-expense.use-case";

// Services
import { AccountService } from "./application/services/account.service";
import { DonationService } from "./application/services/donation.service";
import { EarningService } from "./application/services/earning.service";
import { ExpenseService } from "./application/services/expense.service";
import { FinanceQueryService } from "./application/services/finance-query.service";

// Repositories
import { ACCOUNT_REPOSITORY } from "./domain/repositories/account.repository.interface";
import { DONATION_REPOSITORY } from "./domain/repositories/donation.repository.interface";
import { EARNING_REPOSITORY } from "./domain/repositories/earning.repository.interface";
import { EXPENSE_REPOSITORY } from "./domain/repositories/expense.repository.interface";
import { TRANSACTION_REPOSITORY } from "./domain/repositories/transaction.repository.interface";

import AccountRepository from "./infrastructure/persistence/account.repository";
import DonationRepository from "./infrastructure/persistence/donation.repository";
import EarningRepository from "./infrastructure/persistence/earning.repository";
import ExpenseRepository from "./infrastructure/persistence/expense.repository";
import TransactionRepository from "./infrastructure/persistence/transaction.repository";

// Handlers
import { DMSModule } from "../shared/dms/dms.module";
import { DocumentGeneratorModule } from "../shared/document-generator/document-generator.module";
import { FirebaseModule } from "../shared/firebase/firebase.module";
import { UserModule } from "../user/user.module";
import { DonationsEventHandler } from "./application/handlers/donation-event.handler";
import { DonationJobsHandler } from "./application/handlers/donation-jobs.handler";
import { DonationAmountUpdateHandler } from "./application/handlers/workflow/donation-amount-update.handler";
import { DonationPauseUpdateHandler } from "./application/handlers/workflow/donation-pause-update.handler";
import { GuestDonationCreationHandler } from "./application/handlers/workflow/guest-donation-creation.handler";
import { AuditReportProvider } from "./application/providers/reports/audit-report.provider";
import { DonationSummaryReportProvider } from "./application/providers/reports/donation-summary.provider";
import { FixTransactionUseCase } from "./application/use-cases/fix-transaction.use-case";
import { ReverseTransactionUseCase } from "./application/use-cases/reverse-transaction.use-case";
import { MetadataService } from "./infrastructure/external/metadata.service";
import { EarningController } from "./presentation/controllers/earning.controller";

/**
 * Finance Module
 * Manages donations, expenses, earnings, transactions, and accounts
 *
 * Features:
 * - Regular donations (monthly subscriptions for internal users)
 * - One-time donations (from guests or members)
 * - Automated monthly donation raising (1st of each month)
 * - Expense tracking and approval workflow
 * - Earning/income tracking
 * - Transaction management
 * - Account management
 */
@Module({
  controllers: [
    DonationController,
    AccountController,
    ExpenseController,
    EarningController,
  ],
  imports: [UserModule, FirebaseModule, DocumentGeneratorModule, DMSModule],
  providers: [
    // ===== DONATION =====
    CreateDonationUseCase,
    UpdateDonationUseCase,
    ProcessDonationPaymentUseCase,
    DonationSummaryReportProvider,
    AuditReportProvider,
    DonationService,
    {
      provide: DONATION_REPOSITORY,
      useClass: DonationRepository,
    },

    // ===== ACCOUNT =====
    CreateAccountUseCase,
    UpdateAccountUseCase,
    AccountService,
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: AccountRepository,
    },

    // ===== EXPENSE =====
    CreateExpenseUseCase,
    UpdateExpenseUseCase,
    SettleExpenseUseCase,
    FinalizeExpenseUseCase,
    ReverseTransactionUseCase,
    ExpenseService,
    FinanceQueryService,
    {
      provide: EXPENSE_REPOSITORY,
      useClass: ExpenseRepository,
    },

    // ===== TRANSACTION =====
    CreateTransactionUseCase,
    FixTransactionUseCase,
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: TransactionRepository,
    },

    // ===== EARNING =====
    CreateEarningUseCase,
    UpdateEarningUseCase,
    EarningService,
    {
      provide: EARNING_REPOSITORY,
      useClass: EarningRepository,
    },

    // ===== HANDLERS =====
    MetadataService,
    DonationsEventHandler,
    DonationJobsHandler,
    GuestDonationCreationHandler,
    DonationAmountUpdateHandler,
    DonationPauseUpdateHandler,
  ],
  exports: [FinanceQueryService],
})
export class FinanceModule {}
