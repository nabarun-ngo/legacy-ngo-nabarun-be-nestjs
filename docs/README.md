# Finance Module

## Overview

The Finance Module manages all financial operations including donations, expenses, earnings, transactions, and accounts. It supports both regular monthly donations (subscriptions) and one-time donations from guests or members.

gh

## Features

### 💰 Donations
- **Regular Donations**: Monthly subscription donations for internal users
- **One-Time Donations**: Single donations from guests or internal members
- **Automatic Monthly Raising**: Cron job raises donations on 1st of every month
- **Payment Processing**: Links donations to transactions and accounts
- **Status Tracking**: RAISED → PAID → COMPLETED workflow

### 💳 Transactions
- **Multi-Type Support**: DONATION, EXPENSE, EARNING, TRANSFER
- **Account Linking**: All transactions linked to accounts
- **Reference Tracking**: Links to source (donation, expense, or earning)
- **Immutable Records**: Transactions cannot be modified after creation
- **Metadata Support**: JSON metadata for additional information

### 🏦 Accounts
- **Account Types**: MAIN, PROJECT, EVENT, RESERVE
- **Balance Tracking**: Real-time balance updates
- **Credit/Debit Operations**: Automatic balance management
- **Account Status**: ACTIVE, INACTIVE, CLOSED

### 📊 Expenses
- **Categories**: PROJECT, EVENT, ADHOC, OPERATIONAL, ADMINISTRATIVE
- **Approval Workflow**: PENDING → APPROVED → PAID
- **Receipt Management**: URL storage for receipts/invoices
- **Reference Tracking**: Links to projects/events
- **Multi-User**: Requested by, Approved by tracking

### 📈 Earnings
- **Categories**: SERVICE, PRODUCT, GRANT, SPONSORSHIP, OTHER
- **Source Tracking**: Record earning sources
- **Status Management**: PENDING → RECEIVED
- **Account Integration**: Automatic account crediting

## Architecture

```
finance/
├── domain/                    # Business logic
│   ├── model/                # Domain entities
│   │   ├── donation.model.ts
│   │   ├── transaction.model.ts
│   │   ├── account.model.ts
│   │   ├── expense.model.ts
│   │   └── earning.model.ts
│   ├── repositories/         # Repository interfaces
│   ├── events/               # Domain events
│   └── value-objects/        # Value objects
│
├── application/              # Use cases
│   ├── use-cases/
│   │   ├── create-regular-donation.use-case.ts
│   │   ├── create-one-time-donation.use-case.ts
│   │   └── process-donation-payment.use-case.ts
│   ├── dto/                  # Data transfer objects
│   └── handlers/
│       └── monthly-donations-job.handler.ts
│
├── infrastructure/           # External concerns
│   ├── persistence/
│   │   ├── donation.repository.ts
│   │   ├── transaction.repository.ts
│   │   ├── account.repository.ts
│   │   ├── expense.repository.ts
│   │   └── earning.repository.ts
│   ├── types/
│   │   └── finance-persistence.types.ts
│   └── finance-infra.mapper.ts
│
└── presentation/             # API layer
    └── controllers/
        └── donation.controller.ts
```

## Database Schema

### Donations Table
- Regular donations (monthly subscriptions)
- One-time donations (guests or members)
- Links to UserProfile for internal users
- Optional guest information (name, email)

### Transactions Table
- All financial transactions
- Links to Account
- References source (Donation, Expense, Earning)
- Immutable audit trail

### Accounts Table
- Different account types (MAIN, PROJECT, EVENT, RESERVE)
- Real-time balance tracking
- Multi-currency support

### Expenses Table
- Expense requests with approval workflow
- Links to projects/events
- Receipt URL storage
- Approval tracking

### Earnings Table
- Income tracking from various sources
- Category-based organization
- Account integration

## API Endpoints

### Donations

```typescript
// Create regular donation (monthly subscription)
POST /finance/donations/regular
Body: {
  amount: number,
  currency: string,
  donorId: string,        // User ID
  description?: string
}

// Create one-time donation
POST /finance/donations/one-time
Body: {
  amount: number,
  currency: string,
  donorId?: string,       // Optional for internal users
  donorName?: string,     // Required for guests
  donorEmail?: string,    // Required for guests
  description?: string
}

// Process donation payment
POST /finance/donations/:id/process-payment
Body: {
  accountId: string       // Account to credit
}
```

## Usage Examples

### Creating a Regular Donation

```typescript
// Regular donation for internal user (monthly subscription)
const donation = await createRegularDonationUseCase.execute({
  amount: 100.00,
  currency: 'USD',
  donorId: 'user-123',
  description: 'Monthly membership donation'
});
```

### Creating a One-Time Donation (Guest)

```typescript
// One-time donation from guest
const donation = await createOneTimeDonationUseCase.execute({
  amount: 50.00,
  currency: 'USD',
  donorName: 'John Doe',
  donorEmail: 'john@example.com',
  description: 'Support for community project'
});
```

### Processing Donation Payment

```typescript
// Process payment and create transaction
await processDonationPaymentUseCase.execute({
  donationId: 'donation-123',
  accountId: 'main-account-id'
});

// This will:
// 1. Mark donation as PAID
// 2. Create a DONATION transaction
// 3. Credit the account balance
// 4. Link donation to transaction
```

### Monthly Auto-Raise (Cron Job)

```typescript
// Automatically runs on 1st of every month at 00:00 UTC
// Raises all pending regular donations for active subscribers
@Cron('0 0 1 * *')
async handleMonthlyDonations() {
  // Gets all active subscriptions
  // Creates RAISED donations for each
  // Sends notification to users
}
```

## Domain Events

The module emits the following domain events:

- `DonationRaisedEvent` - When a donation is created/raised
- `DonationPaidEvent` - When a donation payment is processed
- `TransactionCreatedEvent` - When a transaction is recorded
- `ExpenseRecordedEvent` - When an expense is submitted

## Business Rules

### Donations
1. Regular donations are auto-raised monthly for active users
2. Guest donations require name and email
3. Donations must be paid before creating transaction
4. Cannot cancel paid donations
5. Failed payments can be retried

### Transactions
6. Transactions are immutable once created
7. Must link to a valid account
8. Amount must be positive
9. Reference ID tracks source entity

### Accounts
10. Cannot debit more than current balance
11. Only active accounts can receive credits/debits
12. Accounts with non-zero balance cannot be closed

### Expenses
13. Expenses require approval before payment
14. Only approved expenses can be paid
15. Payment creates transaction and debits account

## Configuration

### Cron Schedule

The monthly donation job runs on the 1st of every month at midnight UTC. To modify:

```typescript
@Cron('0 0 1 * *', {  // minute hour day month dayOfWeek
  name: 'raise-monthly-donations',
  timeZone: 'UTC',
})
```

### Currency

Default currency is USD. To change:

```typescript
// In domain models
const DEFAULT_CURRENCY = 'USD';
```

## Testing

```bash
# Run all finance module tests
npm test -- finance

# Run specific test file
npm test -- donation.repository.spec.ts

# E2E tests
npm run test:e2e -- finance
```

## Next Steps

### TODO: Additional Use Cases Needed
- [ ] Get Account Balance
- [ ] List Transactions by Account
- [ ] Create Expense
- [ ] Approve Expense
- [ ] Pay Expense
- [ ] Record Earning
- [ ] Receive Earning Payment
- [ ] Transfer Between Accounts
- [ ] Generate Financial Reports

### TODO: Additional Controllers
- [ ] TransactionController - Transaction history and queries
- [ ] AccountController - Account management
- [ ] ExpenseController - Expense submission and approval
- [ ] EarningController - Earning tracking

### TODO: Additional Features
- [ ] Recurring expense tracking
- [ ] Budget management
- [ ] Financial reports (monthly, yearly)
- [ ] Export to CSV/Excel
- [ ] Payment gateway integration
- [ ] Email notifications for donations
- [ ] SMS notifications for payment reminders

## Dependencies

- `@nestjs/schedule` - For cron jobs (monthly donations)
- `@nestjs/event-emitter` - For domain events
- Prisma - Database ORM

## Migration

To create database tables:

```bash
# Run migration (if not done already)
npx prisma migrate dev --name add_finance_module

# Generate Prisma client
npx prisma generate
```

## Security Considerations

1. **Authorization**: Implement proper role-based access control
2. **Validation**: All monetary amounts validated
3. **Audit Trail**: Immutable transaction records
4. **Data Protection**: Sensitive donor information encrypted
5. **Rate Limiting**: Prevent abuse of donation endpoints

## Support

For issues or questions about the Finance module:
- Check the main project documentation
- Review domain models for business rules
- Examine use cases for workflows
- Check Prisma schema for data structure

---

**Module Status**: ✅ Core features implemented, ready for testing
**Last Updated**: November 8, 2025
