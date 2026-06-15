# Business Requirements Document (BRD)
## Finance Module - NGO Nabarun Backend (NestJS)

**Document Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Active  
**Module:** Finance  
**Technology Stack:** NestJS, Prisma ORM, TypeScript

---

## 1. Executive Summary

The Finance Module is a comprehensive financial management system designed for NGO operations. It provides end-to-end financial tracking and management capabilities including donation management, expense tracking, income/earnings management, and transaction reconciliation. The module follows Domain-Driven Design (DDD) principles with clear separation of concerns across application, domain, and infrastructure layers.

**Key Capabilities:**
- Donation management (Regular & One-time) Including Guest Donation
- Expense tracking and approval workflows
- Income/earnings management
- Financial transaction management
- Account management with active (PRINCIPAL, WALLET, COLLECTION) and legacy account types
- Comprehensive financial reporting
- Legacy account support for historical data

---

## 2. Business Objectives

### 2.1 Primary Objectives
1. **Centralized Financial Tracking** - Maintain a single source of truth for all financial transactions
2. **Donation Management** - Support both regular (subscription) and one-time donations from members and guests
3. **Expense Control** - Track expenses with multi-level approval workflows and status transitions
4. **Financial Visibility** - Provide comprehensive reporting and audit trails for financial activities
5. **Operational Efficiency** - Automate recurring donation processing and expense workflows

### 2.2 Strategic Goals
- Enable transparent financial management for NGO stakeholders
- Support compliance and audit requirements through comprehensive logging
- Facilitate financial decision-making through analytics and reporting
- Reduce manual financial processing overhead

---

## 4. Core Entities & Domain Models

### 4.1 Account Model
**Purpose:** Represents financial accounts where money flows in and out.

**Account Types:**
| Type | Purpose | Status | Notes |
|------|---------|--------|-------|
| PRINCIPAL | Main operational account | Active | Production account type |
| GENERAL | General purpose account | Legacy | ⚠️ Deprecated - No new creations allowed |
| DONATION | Donation collection account | Legacy | ⚠️ Deprecated - No new creations allowed |
| PUBLIC_DONATION | Public donation account | Legacy | ⚠️ Deprecated - No new creations allowed |
| WALLET | Digital wallet | Active | Quick transaction wallet |
| COLLECTION | Flexible collection account | Active | New account type - One per holder, any authorized user |

**Account Status:**
- `ACTIVE` - Operational account
- `CLOSED` - Deactivated account

**Key Attributes:**
- Account ID (unique identifier)
- Account Name
- Account Holder Name & ID
- Account Type
- Account Status
- Currency
- Bank Details (Optional)
  - Bank Account Holder Name
  - Bank Name & Branch
  - Account Number
  - Account Type (Savings/Current)
  - IFSC Code
- UPI Details (Optional)
  - Payee Name
  - UPI ID
  - Mobile Number
  - QR Code Data
- Description
- Balance (Calculated from transactions)

**Business Rules:**
- Account type determines the purpose and transaction rules
- An account must be ACTIVE to receive/send transactions
- Multiple accounts can exist for the same holder (but only ONE active account per type-holder combination)
- Account closure should be audited
- Account type cannot be changed after creation
- Account name cannot be empty or whitespace
- Currency cannot be changed after creation
- Cannot close account with remaining balance (must be zero)
- Cannot activate a CLOSED account

**Account Holder Immutability:**
- Account Holder ID: Immutable once set at creation - cannot be changed after account creation
- Account Holder Name: Can be updated to reflect name changes (e.g., marriage, legal name change)
- Holder change audit trail: If holder details need to change, new account should be created with new holder (maintains audit trail)
- For PRINCIPAL accounts: No specific holder (system-wide account)
- For all other types: Holder must be explicitly set and cannot be transferred to another holder

**Account Name Uniqueness:**
- Account names must be unique within the organization
- Duplicate name validation: System prevents creation of accounts with same name (case-insensitive)
- Purpose: Prevents confusion in UI dropdowns and reporting
- Error handling: "Account with this name already exists" - BusinessException thrown
- Name update validation: When updating account name, must check uniqueness against all other active accounts
- Legacy accounts: Names of closed/legacy accounts are excluded from uniqueness check (allowing reuse after closure)

**Concurrent Transaction Handling:**
- Optimistic Locking: Implement version-based concurrency control
- Transaction Isolation: All transactions processed with SERIALIZABLE isolation level
- Race condition prevention:
  - Balance calculations atomic: Single transaction computes balance from all prior transactions
  - Concurrent debit operations: Locked at account level during balance validation and transaction creation
  - Account lock during closure: Account locked to prevent concurrent operations during close process
- Error handling: If concurrent modification detected, throw ConcurrencyException with retry guidance
- Best practice: UI should prevent double-submit of transaction forms

**Minimum Balance Rules:**
- PRINCIPAL account: Minimum balance of 0 (no minimum enforced)
- COLLECTION account: Minimum balance of 0 (no minimum enforced)
- WALLET account: Minimum balance of 0 (no minimum enforced)
- All account types: Cannot go negative (enforced via debit validation)
- Reserved balance: No reserved/blocked balance mechanism (all available balance is free)
- Future enhancement: Optional minimum balance thresholds can be configured per account type

**Type-Specific Business Rules:**

| Account Type | Authorization | Uniqueness | Holder | Purpose | Status |
|--------------|---------------|-----------|--------|---------|--------|
| **PRINCIPAL** | TREASURER role required | One system-wide | Organization | Main operational account for fund management | ✅ Active |
| **GENERAL** | ❌ Creation Disabled | Archived | Legacy | General purpose (deprecated) | 🚫 Legacy |
| **DONATION** | ❌ Creation Disabled | Archived | Legacy | Donation account (deprecated) | 🚫 Legacy |
| **PUBLIC_DONATION** | ❌ Creation Disabled | Archived | Legacy | Public donation (deprecated) | 🚫 Legacy |
| **WALLET** | Any authorized user | One per holder | User/Organization | Digital wallet for quick transactions | ✅ Active |
| **COLLECTION** | Any authorized user | One per holder | User/Organization | Flexible collection account for fund management | ✅ Active (New) |

**Authorization Rules:**
- PRINCIPAL accounts: Only users with TREASURER role can create
- GENERAL, DONATION, PUBLIC_DONATION: ⚠️ **Creation Disabled** - Legacy accounts cannot be created (existing accounts remain for historical purposes)
- WALLET accounts: Any authorized finance personnel can create (one per holder)
- COLLECTION accounts: Any authorized finance personnel can create (one per holder) - **Recommended for new implementations**
- Creating duplicate active account of same type-holder combination: Throws BusinessException
- Attempting to create GENERAL/DONATION/PUBLIC_DONATION: Throws BusinessException (legacy prevention)

**Transaction Business Rules:**
- Cannot credit/debit CLOSED or INACTIVE accounts
- Debit requires sufficient balance (no overdraft allowed by default)
- All transactions must specify amount > 0
- All transactions must reference a currency matching the account currency
- Transaction created with unique reference: TXN-XXXXXX
- Both IN (credit) and OUT (debit) transactions tracked with:
  - Transaction reference type (DONATION, EXPENSE, EARNING, TXN_REVERSE, NONE)
  - Reference ID (links to source: donation ID, expense ID, etc.)
  - Particulars describing the transaction
  - Metadata for additional context (payment method, gateway reference, etc.)

**Account Details Management:**
- Bank Details are optional but if provided:
  - Can be updated after account creation
  - Used for bank transfers and fund settlements
  - Stored securely and accessible only to authorized personnel
  
- UPI Details are optional but if provided:
  - Can be updated after account creation
  - Used for digital payments and quick fund transfers
  - Includes QR code for payment convenience
  
- Account Holder Details:
  - Account Holder Name: Captured at creation, can be updated
  - Account Holder ID: Links to User entity for authorization
  - For PRINCIPAL: No specific holder (system-wide)
  - For others: Holder ID mandatory

**Balance Calculation Rules:**
- Balance calculated as: SUM(IN transactions) - SUM(OUT transactions)
- Balance After: Tracked on each transaction for audit trail
- Cannot go negative (no overdraft)
- Zero balance required before account closure
- Balance recalculated from transactions (no direct modification)

**Balance Reconciliation Rules:**
- Daily reconciliation process: System recalculates balance from all transactions
- Discrepancy detection: If stored balance ≠ calculated balance, flag as discrepancy
- Handling discrepancies:
  - Log discrepancy event with details (stored balance, calculated balance, missing/extra transactions)
  - Send alert to finance team for investigation
  - Block new transactions until discrepancy resolved
  - Create audit record documenting resolution (manual correction with justification)
- Causes for discrepancies:
  - Data corruption (rare with Prisma ACID compliance)
  - Concurrent transaction race conditions (prevented by locking)
  - Manual database interventions (should never occur)
  - Transaction reversal without reversal transaction created
- Reconciliation frequency: Daily at off-peak hours (e.g., 2 AM)
- Reconciliation report: Generated monthly for audit purposes

**Account Lifecycle:**
```
CREATE (ACTIVE)
    ↓
UPDATE (Name, Description, Bank/UPI details)
    ↓
CLOSE (Must have zero balance)
    ↓
CLOSED (No transactions allowed)
```

**Legacy Account Deprecation Policy:**
- GENERAL, DONATION, PUBLIC_DONATION accounts are deprecated
- Existing accounts remain active for historical data and reporting purposes
- ⚠️ **No new accounts of these types can be created**
- Use COLLECTION account type for all new fund collection requirements
- Migration path:
  - DONATION → COLLECTION (for donation collection)
  - PUBLIC_DONATION → COLLECTION (for public fund collection)
  - GENERAL → COLLECTION or WALLET (based on usage)
- Legacy accounts are read-only for transactions (new transactions must use active account types)
- System blocks creation attempts with clear error: "Legacy account type cannot be created. Use COLLECTION type instead."

**COLLECTION Account Type Specifications:**
- **Purpose:** Flexible, multi-purpose collection account for various fund collection needs
- **Authorization:** Any authorized finance personnel (no special role required)
- **Uniqueness:** One per account holder
- **Holder Type:** User/Organization
- **Use Cases:**
  - Primary donation collection account
  - Public fund collection
  - Event-based collections
  - Special campaign collections
  - General purpose fund collection
- **Features:**
  - Supports all payment methods (Cash, NetBanking, UPI)
  - Full transaction history and audit trail
  - Bank and UPI details support
  - Flexible for various organizational needs
- **Restrictions:**
  - Cannot have multiple COLLECTION accounts per holder
  - Must be ACTIVE for transactions
  - Zero balance required for closure
- **Recommendation:** Use COLLECTION for all new account setups going forward

**Payable Account Rules:**
- Default payable account: `PRINCIPAL` is the default account used for any payment.
- For **Donation**: If Donation Type is `ONETIME` then return all `COLLECTION` + `PRINCIPAL` account, else return `PRINCIPAL`. (configurable)
- For **Account Transfers**: This will be driven by the source account type (configurable)
   | Src_Account_Type | Dest_Accounts | 
   |-----------------|----------------|
   | PRINCIPAL | WALLET |
   | COLLECTION | PRINCIPAL |
   | WALLET | PRINCIPAL, WALLET |
   | GENERAL | PRINCIPAL |
   | DONATION | PRINCIPAL |
   | PUBLIC_DONATION | PRINCIPAL |
- For Expense Settlement: `WALLET` will be used. We have send the expense amount from `PRINCIPAL` or another `WALLET` to the expense payer `WALLET` to settle a expense.
- Filter applied: Only `ACTIVE` status accounts
- Legacy accounts (GENERAL, DONATION, PUBLIC_DONATION): Available for viewing only, cannot be used for new transactions
- Used when selecting account for expense settlement or fund transfers
- `COLLECTION` account is the recommended type for new fund collection setups

**Advanced Account Features & Constraints:**

**Account Holder Immutability & Audit:**
- Account Holder ID (accountHolderId): Set at creation, immutable throughout account lifecycle
- Immutability enforcement: Throws BusinessException if update attempted on holder ID
- Audit trail: All access to account maintains user audit trail
- Account transfer not supported: If holder changes, close old account and create new one
- Historical tracking: Closed accounts with old holder remain for audit purposes

**Account Name Uniqueness & Validation:**
- Uniqueness scope: Within organization (not globally)
- Case-insensitive check: "Principal Account" and "principal account" treated as same
- Validation timing: At account creation and update
- UI display: Account names used in dropdowns, reports, and dashboards
- Duplicate prevention: Repository enforces unique constraint at database level

**Concurrent Transaction Handling & Locking:**
- Locking strategy: Pessimistic locking at account level for transaction operations
- Lock scope: When crediting or debiting account
- Lock duration: Duration of transaction creation and balance update (typically < 100ms)
- Retry mechanism: Client should implement exponential backoff (100ms, 200ms, 400ms, 800ms)
- Deadlock prevention: Always lock accounts in consistent order (by account ID)
- Testing: Load tests with 100+ concurrent transactions to validate locking behavior
- Monitoring: Track lock contention metrics in production

**Minimum Balance & Reserve Policies:**
- Current implementation: No minimum balance enforced
- Overdraft prevention: Debit validation ensures sufficient funds
- Future feature: Optional per-account-type minimum balance rules
- Configuration: Admin can set minimum balance per account type
- Violation handling: Debit attempt blocked if result would go below minimum
- Buffer zone: Optional warn-on-low-balance notification (e.g., when balance < 2x minimum)

**Data Validation & Format Enforcement:**
- Validation layer: All validations performed in Account domain model (not at DB level only)
- Error messages: Specific, actionable messages for each validation failure
- Regex patterns: Defined as constants in codebase for consistency
- Localization ready: Validation messages support i18n for multi-language support
- Test coverage: Comprehensive unit tests for all regex patterns with edge cases

---

### 4.2 Donation Model
**Purpose:** Tracks all financial donations to the organization.

**Donation Types:**
| Type | Frequency | Users | Process |
|------|-----------|-------|---------|
| REGULAR | Monthly | Internal Users | Scheduled creation for current month |
| ONETIME | Single | Members/Guests | Manual creation or guest form |

**Donation Status Lifecycle:**
```
RAISED → PENDING → PAID ✓
      → PAYMENT_FAILED → PAID (retry)
      → PAY_LATER (deferred)
      → CANCELLED (before payment)
      → UPDATE_MISTAKE (correction)
```

**Payment Methods:**
- CASH
- NETBANKING
- UPI (GPAY, PAYTM, PHONEPE, BHARATPAY, UPI_OTH)

**Key Attributes:**
- Donation ID (unique identifier: `NDONXXXXXX`)
- Donation Type (REGULAR/ONETIME)
- Amount & Currency
- Status
- Donor ID & Name
- Donor Email
- Donor Number
- Is Guest (boolean)
- Payment Method
- UPI Payment Type
- Paid To Account
- Raised Date
- Paid Date
- Confirmed By & Confirmed On
- Start/End Date (for regular donations)
- Related Event ID (optional)
- Transaction Reference
- Remarks
- Payment Failure Detail
- Later Payment Reason

**Business Rules:**
- Donation amount must be positive and greater than zero.
- Regular donations require `donorId`, `startDate`, and `endDate`.
- Guest one-time donations require `donorName` when created via the guest endpoint.
- One-time donations can be created by authorized users or by guests.
- Regular donations are created by a scheduled monthly process using the first and last day of the current calendar month.
- Recurring donation creation prevents duplicate date-range overlaps for the same donor across outstanding and paid donations.
- Donations are created in `RAISED` status by default.
- Regular donations are only created if the donor is not in a donation pause period.
- Raised donations may be moved to `PENDING` through a dedicated job.
- Donations can only be paid from `RAISED`, `PENDING`, or `PAY_LATER` status.
- `PAID` donations cannot be cancelled, marked failed, or paid again.
- `PAYMENT_FAILED` donations may be retried and can transition to `PAID`.
- `PAY_LATER` donations may transition to `PAID`, `PAYMENT_FAILED`, or `CANCELLED`.
- `UPDATE_MISTAKE` is only allowed after a donation is `PAID` and triggers reversal of linked payment documents and transaction references.
- `CANCELLED` is a terminal status.
- Payment confirmation requires `paidToAccountId`, `paymentMethod`, `confirmedById`, and `paidOn`.
- `isPaymentNotified` is a notification flag and does not by itself complete the payment or transaction flow.
- Donation updates are allowed before payment confirmation; amount updates are prohibited after payment.
- Pending donations support reminder notifications.
- If currency is omitted, default currency is `INR`.
- Guest donations that may receive follow-up must provide either `donorEmail` or `donorNumber` for contact.
- Donations created using legacy account types remain historical only and cannot be used for new payment-related operations.
- Guest donation payable flow: For guest donations, payments should be deposited into the donor's `COLLECTION` account (if available) and subsequently settled to the `PRINCIPAL` account; both accounts must be `ACTIVE` for settlement operations.

**Status Transitions:**
- `RAISED` → `PENDING`, `PAID`, `PAYMENT_FAILED`, `PAY_LATER`, `CANCELLED`
- `PENDING` → `PAID`, `PAYMENT_FAILED`, `PAY_LATER`, `CANCELLED`
- `PAY_LATER` → `PAID`, `PAYMENT_FAILED`, `CANCELLED`
- `PAYMENT_FAILED` → `PAID`
- `PAID` → `UPDATE_MISTAKE`
- `UPDATE_MISTAKE` → `PENDING`
- `CANCELLED` → terminal

**Key Workflows:**
1. **Regular Donation Workflow**
   - A monthly job triggers creation of regular donations for each active user.
   - The job uses the current month period and skips users in a donation pause window.
   - Raised donations can later be marked as pending by a separate scheduled job.
   - Paid donations are confirmed through the update flow, which creates a linked transaction.
   - Paid donations can be flagged as `UPDATE_MISTAKE` for reversal and correction.

2. **One-Time Donation Workflow**
   - Authorized users create one-time donations via the standard creation endpoint.
   - Donations are created in `RAISED` status.
   - Payment confirmation is applied through the donation update flow.
   - A linked transaction is created when status is updated to `PAID`.

3. **Guest Donation Workflow**
   - Guests submit donations through the guest donation endpoint.
   - Guest donations are created as one-time `RAISED` donations with `isGuest` set.
   - Payment confirmation and notification are handled via update and notification flows.
   - The system tracks whether payment notification has been sent.

---

### 4.3 Expense Model
**Purpose:** Tracks and manages organizational expenses through structured request, approval, payment and audit workflows.

**Expense Status Lifecycle:**
```
DRAFT → SUBMITTED → FINALIZED → SETTLED ✓
                 ↓
               REJECTED
                 ↓
               DRAFT (re-open)
```

**Expense Reference Types:**
- OPERATIONAL - Day-to-day operational expenses
- ADMINISTRATIVE - Administrative overhead expenses
- EVENT - Expenses for specific events or programs
- ADHOC - One-off unplanned expenses
- OTHER - Miscellaneous or uncategorized expenses

**Expense Item:**
Value object containing:
- Item Name (required)
- Description (optional)
- Amount (must be positive)
- Quantity (optional)
- Unit / category (optional)

**Key Attributes:**
- Expense ID (unique identifier: `NEX-XXXXXX`)
- Name & Description
- Total Amount & Currency
- Status
- Reference ID & Type (Project/Event/Activity)
- Activity Name
- Requested By (User ID/Name)
- Requested On / Expense Date
- Submitted By & Date
- Finalized By & Date
- Settled By & Date
- Rejected By & Date
- Approval Remarks
- Rejection Reason
- Account ID (payment source)
- Transaction ID (after settlement)
- Expense Items (itemized breakdown)
- Is Delegated (boolean)
- Payment Method / Mode (optional)
- Metadata / Comments

**Expense Status Transitions:**
| From | To | Condition |
|------|----|-----------|
| DRAFT | SUBMITTED | Valid items and total amount confirmed |
| SUBMITTED | FINALIZED | Approved by authorized approver |
| FINALIZED | SETTLED | Payment executed and transaction created |
| SUBMITTED/FINALIZED | REJECTED | Rejected with remarks |
| REJECTED | DRAFT | Re-opened after correction |

**Business Rules:**
- Expense requests must contain at least one expense item.
- Each expense item amount must be a positive value.
- Total expense amount must equal the sum of all item amounts.
- Expense name must be present and not empty or whitespace.
- Currency must be specified, with default currency fallback as needed.
- Expense status transitions must follow the lifecycle; direct SETTLED from DRAFT is not allowed.
- Each approval or rejection must record the responsible user and timestamp.
- Finalized expenses require authorization before settlement.
- Settlement requires an active payment account and creates a linked transaction of type `EXPENSE`.
- Rejected expenses may be re-opened to `DRAFT` for correction, but closed settled records are immutable.
- Account changes after submission require resubmission or a new expense request.
- Delegated expense requests must still follow the same approval and settlement rules.
- Expenses must be linked to an active account for payment execution.
- Settlement transactions are retained for audit; expenses are never deleted.
- The system must capture remarks for approval, rejection, and settlement events.

**Approval Rules:**
- Approvers must have the necessary authorization scope for the expense reference type and amount.
- Expense requests exceeding configured thresholds may require higher-level approval.
- Finalization must be performed by a finance or designated approver role.
- Approvals must include a review of expense items, amount, and account assignment.

**Audit & Reporting:**
- All status changes are audited with user, timestamp, and remarks.
- Expense itemization enables line-level reporting.
- Settled expenses are included in financial reports and transaction reconciliation.
- Rejected and re-opened expenses remain available for audit and traceability.

**Expense Lifecycle:**
```
CREATE (DRAFT)
    ↓
UPDATE (DRAFT)
    ↓
SUBMIT (SUBMITTED)
    ↓
APPROVE (FINALIZED)
    ↓
PAY (SETTLED)
    ↓
ARCHIVE / REPORTING
```

**Key Use Cases:**
- **CreateExpenseUseCase** - Create a new expense request in DRAFT.
- **UpdateExpenseUseCase** - Edit expense details and item breakdown while in DRAFT.
- **SubmitExpenseUseCase** - Move a request from DRAFT to SUBMITTED for approval.
- **FinalizeExpenseUseCase** - Approve a submitted expense and prepare it for payment.
- **SettleExpenseUseCase** - Execute payment and record the resulting expense transaction.
- **RejectExpenseUseCase** - Reject a submitted or finalized expense with remarks.
- **ReopenExpenseUseCase** - Return a rejected expense to DRAFT for correction.

---

### 4.4 Earning Model
**Purpose:** Tracks and manages income sources other than donations including interest, services, grants, sponsorships, and product sales through a recognition and receipt workflow.

**Earning Status Lifecycle:**
```
PENDING → RECEIVED ✓
    ↓
  CANCELLED
```

**Earning Categories:**
- INTEREST - Investment or financial instrument interest income
- SERVICE - Income from services provided by the organization
- PRODUCT - Revenue from product sales or retail offerings
- GRANT - Grant money received from institutions or donors
- SPONSORSHIP - Sponsorship income from corporate or individual sponsors
- OTHER - Miscellaneous or uncategorized income sources

**Earning Status:**
- PENDING - Income earned or committed but not yet received
- RECEIVED - Income received and confirmed in the account
- CANCELLED - Income cancelled, declined, or not received

**Key Attributes:**
- Earning ID (unique identifier: `NER-XXXXXX`)
- Category (required)
- Amount & Currency (required)
- Status
- Description (optional)
- Source / Provider Name (required, e.g., Bank name for interest, Grant agency name)
- Reference ID & Type (Project, Event, Grant ID, Contract ID, etc.)
- Account ID (credit destination)
- Transaction ID (after receipt confirmation)
- Earning Date / Recognition Date (when income is earned)
- Received On / Confirmation Date (optional, when income is actually received)
- Created By (User ID)
- Received By / Confirmed By (User ID - optional)
- Approval Status / Verification Status (optional)
- Approved By (User ID - optional)
- Expected Receipt Date (optional forecast)
- Remarks / Notes
- Metadata / Additional Details (flexible field for category-specific info)

**Earning Status Transitions:**
| From | To | Condition |
|------|----|-----------| 
| PENDING | RECEIVED | Amount confirmed and credited to account |
| PENDING | CANCELLED | Income cancelled or not received |
| RECEIVED | CANCELLED | Reversal or error correction (creates reversal earning) |

**Business Rules:**
- Earning amount must be a positive value greater than zero.
- Source must be specified and documented (e.g., bank name, grant issuer, sponsor name).
- Category must be one of the allowed earning categories.
- Currency must be consistent with the receiving account currency.
- Earning date must be present; future-dated earnings are allowed for forecasting.
- Pending earnings can be tracked separately from received earnings for cash flow projection.
- Receipt creates a corresponding transaction of type `IN` linked to the earning.
- Receiving account must be active to accept credited earnings.
- Status transitions must follow the defined lifecycle; direct cancellation from PENDING is allowed.
- Received status is final unless cancelled for reversal.
- Cancelled earnings should create a reversal entry for audit trail.
- CreatedBy field is mandatory and maintains audit trail.
- ReceivedBy field is mandatory when status changes to RECEIVED.
- Earnings may be linked to projects or events for tracking and reporting.
- Earnings are never deleted; cancellations remain as historical records.
- Verification / approval may be required for earnings above configured thresholds.
- Metadata captures category-specific information (e.g., interest rate for INTEREST, grant agency details for GRANT).

**Approval Rules:**
- Earnings above a configured threshold may require verification by a finance or approver role.
- Received status transition should be authorized by finance personnel.
- Cancellation of received earnings requires documented reason.

**Audit & Reporting:**
- All status changes are tracked with user, timestamp, and remarks.
- Pending earnings appear in cash flow projections and income forecasts.
- Received earnings are included in financial reports and transaction reconciliation.
- Cancelled earnings remain auditable with reversal documentation.

**Earning Lifecycle:**
```
CREATE (PENDING)
    ↓
UPDATE (PENDING) - Modify details before receipt
    ↓
RECEIVE / CONFIRM
    ↓
RECEIVED - Transaction created
    ↓
ARCHIVE / REPORTING
```

**Key Use Cases:**
- **CreateEarningUseCase** - Record a new PENDING earning.
- **UpdateEarningUseCase** - Edit earning details while in PENDING status.
- **ReceiveEarningUseCase** - Confirm receipt of earnings and create transaction.
- **CancelEarningUseCase** - Cancel a pending or received earning with documentation.
- **ReverseEarningUseCase** - Create a reversal entry for received earnings (correction flow).

---

### 4.5 Transaction Model
**Purpose:** Represents atomic financial transactions - money movements in/out of accounts.

**Transaction Types:**
- IN - Money coming into account (income)
- OUT - Money going out of account (expense)

**Transaction Status:**
- SUCCESS - Transaction completed successfully
- REVERSED - Transaction has been reversed/cancelled

**Transaction Reference Type:**
- DONATION - Transaction from donation payment
- EXPENSE - Transaction from expense settlement
- EARNING - Transaction from earning receipt
- TXN_REVERSE - Reverse/cancellation transaction
- NONE - No specific reference

**Key Attributes:**
- Transaction ID (unique identifier)
- Transaction Ref (unique reference: `TXN-XXXXXX`)
- Type (IN/OUT)
- Amount & Currency
- Status
- Reference ID & Type (links to Donation/Expense/Earning)
- Description
- Particulars (specific details)
- Metadata (flexible additional data)
- Transaction Date
- Account ID (account affected)
- Ref Account ID (counter account - optional)
- Balance After (post-transaction balance)
- Created/Updated timestamps

**Business Rules:**
- Each transaction affects exactly one account
- Transaction amount must be positive
- Type determines direction (IN increases, OUT decreases balance)
- Transactions can be reversed but not deleted
- Reference links enable traceability
- Transaction reference is immutable once created
- Metadata captures additional context (payment method, confirmation ref, etc.)

---

## 5. Business Processes & Workflows

### 5.1 Donation Management Process

#### 5.1.1 Regular Donation Cycle
**Actors:** System, Donor (Internal User), Finance Team

**Process Flow:**
```
1. Scheduled Job (1st of month)
   ↓
2. Auto-raise Regular Donations
   - Query all active regular donations
   - Create new RAISED donation records
   - Set status to PENDING
   ↓
3. Notify Donors
   - Send payment reminder/invoice
   ↓
4. Await Payment Confirmation
   - Donor makes payment (UPI/Cash/Bank)
   ↓
5. Payment Notification Received
   - Finance team marks as PAID
   - Or system receives confirmation from payment gateway
   ↓
6. Create Transaction
   - Generate IN transaction to donation account
   ↓
7. Archive/Close Donation Record
   - Mark status as PAID
   - Record confirmation details
```

**Key Use Cases:**
- **CreateDonationUseCase** - Setup regular donation for user
- **UpdateDonationUseCase** - Modify donation amount/details
- **ProcessDonationPaymentUseCase** - Record payment confirmation
- **DonationAmountUpdateHandler** - Handle workflow-triggered updates
- **DonationPauseUpdateHandler** - Handle donation pause/resume

**Validation Rules:**
- Amount must be positive
- Donor must exist or be guest
- Start date must be valid
- End date (if set) must be after start date

---

#### 5.1.2 One-Time Donation Process
**Actors:** Donor/Guest, System, Finance Team

**Process Flow:**
```
1. Donor/Guest Initiates Donation
   ↓
2. Create Donation Record
   - Status: RAISED
   - Set payment method
   - Donor information captured
   ↓
3. Generate Payment Link/Invoice
   - Via payment gateway or manual reference
   ↓
4. Donor Makes Payment
   ↓
5. Payment Confirmation
   - Finance team confirms payment
   - Status: PAID
   ↓
6. Create Transaction
   - IN transaction to donation account
   ↓
7. Send Receipt & Thank You
   - Auto-generated receipt
   - Thank you notification
```

**Key Use Cases:**
- **CreateDonationUseCase** - One-time donation creation
- **CreateGuestDonationUseCase** - Guest donation (workflow-triggered)
- **ProcessDonationPaymentUseCase** - Payment confirmation

---

#### 5.1.3 Guest Donation Workflow
**Actors:** Guest (External), System, Finance Team

**Trigger:** Guest donation form submission (workflow integration)

**Process Flow:**
```
1. Guest Submits Donation Form
   ↓
2. GuestDonationCreationHandler triggered
   ↓
3. Create Guest Donation Record
   - donorId: null
   - donorName: from form
   - donorEmail: from form
   - isGuest: true
   ↓
4. Store Guest Information
   - Via DMS (Document Management System)
   ↓
5. Send Payment Link
   - Email payment link to guest
   ↓
6. Finance Team Confirms Payment
   - Mark as PAID
   - Record payment details
   ↓
7. Generate Receipt & Thank You Email
```

---

### 5.2 Expense Management Process

#### 5.2.1 Complete Expense Workflow

**Actors:** Requester, Approvers, Finance Team, Payer, Auditor

**Status Transitions with Business Logic:**

```
DRAFT (Initial Creation)
  ├─ Actions: Add items, edit description and account assignment
  ├─ Validation: Must have ≥1 item, valid currency, positive totals
  └─ Next: SUBMITTED when ready
    
SUBMITTED (Approval Stage)
  ├─ Actions: Review, approve or reject
  ├─ Tracked: submittedBy, submittedOn, review remarks
  ├─ Validation: authorized approver, amount thresholds
  └─ Next: FINALIZED or REJECTED
    
FINALIZED (Payment Ready)
  ├─ Actions: Confirm payment account, add settlement details
  ├─ Tracked: finalizedBy, finalizedOn, approval remarks
  └─ Next: SETTLED or REJECTED
    
SETTLED (Paid)
  ├─ Actions: Execute payment, create transaction, close expense
  ├─ Created: Transaction OUT from selected account
  └─ Archived: Expense available for reporting
    
REJECTED (Returned)
  ├─ Actions: Record rejection reason and remarks
  ├─ Tracked: rejectedBy, rejectedOn
  └─ Next: DRAFT if reopened for correction
```

**Primary Process Flow:**
```
1. Requester Creates Expense
   - Status: DRAFT
   - Adds expense name, reference type, items, total amount
   - Assigns payment account and optional payment method
   ↓
2. Requester Submits Expense
   - Status: SUBMITTED
   - Validates itemization, totals, and required fields
   - Triggers workflow for approver assignment
   ↓
3. Approver Reviews and Finalizes
   - Status: FINALIZED
   - Approver verifies amount, account, and business purpose
   - Adds approval remarks or conditions
   ↓
4. Finance Team Processes Payment
   - Creates expense payment transaction OUT
   - Sets status to SETTLED
   - Records transactionId and balance-after details
   ↓
5. Close Expense for Reporting
   - Expense remains immutable after settlement
   - Included in financial reports, audit trails, and reconciliation
```

**Key Use Cases:**
- **CreateExpenseUseCase** - Create a new DRAFT expense request.
- **UpdateExpenseUseCase** - Edit expense details while in DRAFT.
- **SubmitExpenseUseCase** - Submit a DRAFT expense for approval.
- **FinalizeExpenseUseCase** - Approve a SUBMITTED expense and make it payment-ready.
- **SettleExpenseUseCase** - Execute the payment and record the expense transaction.
- **RejectExpenseUseCase** - Reject expenses at SUBMITTED or FINALIZED stages.
- **ReopenExpenseUseCase** - Return a rejected expense back to DRAFT for correction.

**Validation Rules:**
- Expense name is required and must not be empty or whitespace.
- Each expense item must have a positive amount.
- At least one expense item is required to create an expense.
- Total amount must equal the sum of itemized amounts.
- Currency must be specified and consistent across the expense.
- Reference type must be one of the allowed expense categories.
- Assigned account must be active and eligible for expense payment.
- Expense cannot be settled unless it is FINALIZED.
- Rejected expenses may be reopened only by authorized users.

**Additional Business Requirements:**
- Expense amounts must never be negative.
- Expense requests above configured thresholds should require senior authorization.
- Expense item details must be preserved for audit and reporting.
- Settlement must create a transaction entry linked by `expenseId` and account.
- Expense updates after submission should preserve audit history and require resubmission if material changes occur.
- The system should prevent payment from closed or inactive accounts.
- Rejected and reopened expenses should preserve rejection remarks.
- Settled expenses are immutable except by correction workflows that create new requests.

---

#### 5.2.2 Expense Status Transition Rules

| From | To | Conditions | Who | Effect |
|------|----|-----------|----|--------|
| DRAFT | SUBMITTED | ≥1 valid item, required fields complete | Requester | Submit for approval |
| SUBMITTED | FINALIZED | Authorized approval granted | Approver | Ready for payment |
| SUBMITTED | REJECTED | Rejection reason recorded | Approver | Returned for correction |
| FINALIZED | SETTLED | Payment executed, transaction created | Finance | Expense closed |
| FINALIZED | REJECTED | Payment denied or revised | Finance / Approver | Returned for correction |
| DRAFT | REJECTED | Invalid request or early cancellation | Approver | Not submitted |
| REJECTED | DRAFT | Re-open after remediation | Requester | Correct and resubmit |

---

### 5.3 Earning Management Process

#### 5.3.1 Complete Earning Workflow

**Actors:** Finance Team, Income Coordinator, Approvers, Accountant, Auditor

**Status Transitions with Business Logic:**

```
PENDING (Income Recognized)
  ├─ Actions: Record earning, add source details and metadata
  ├─ Validation: Category, source, amount > 0, account assignment
  └─ Next: RECEIVED or CANCELLED
    
RECEIVED (Income Confirmed)
  ├─ Actions: Confirm receipt, create transaction, verify amount
  ├─ Created: Transaction IN to designated account
  ├─ Tracked: receivedBy, receivedOn
  └─ Next: CANCELLED (if reversal needed)
    
CANCELLED (Returned/Reversed)
  ├─ Actions: Document reason, create reversal entry
  ├─ Tracked: cancelledBy, cancelledOn, reason
  └─ Archived: Earning retained for audit trail
```

**Primary Process Flow:**
```
1. Earning Source Identified
   - Interest accrued, grant awarded, product sold, sponsorship confirmed
   - Finance team recognizes income event
   ↓
2. Create Earning Record
   - Status: PENDING
   - Record category, source, amount, recognition date
   - Assign to receiving account
   ↓
3. Validate Earning
   - Amount must be positive and valid
   - Source/provider must be documented
   - Account must be active
   ↓
4. Track Pending Earnings
   - Available in cash flow projections and income forecasts
   - Optional: Threshold-based approval workflow
   ↓
5. Confirm Receipt
   - Finance team confirms funds received
   - Status: RECEIVED
   - Record receipt date and confirming officer
   ↓
6. Create Transaction
   - Automatic IN transaction to designated account
   - Links earning ID and account ID
   - Updates account balance
   ↓
7. Close Earning for Reporting
   - Earning remains immutable after receipt
   - Included in financial reports and transaction reconciliation
```

**Key Use Cases:**
- **CreateEarningUseCase** - Record a new PENDING earning.
- **UpdateEarningUseCase** - Edit earning details while in PENDING status.
- **ReceiveEarningUseCase** - Confirm receipt and trigger transaction creation.
- **CancelEarningUseCase** - Cancel a pending earning.
- **ReverseEarningUseCase** - Create reversal entry for received earnings (error correction).

**Validation Rules:**
- Earning amount must be positive and non-zero.
- Source must be specified (bank name, grant agency, sponsor, etc.).
- Category must be one of the allowed earning types.
- Receiving account must exist and be in ACTIVE status.
- Earning date cannot be in the future (unless configured for forecasting).
- Receipt confirmation requires authorization.
- Currency must match the receiving account currency.

**Additional Business Requirements:**
- Pending earnings should appear in separate cash flow reports.
- Received earnings should be reconciled with bank statements or external confirmations.
- Cancelled earnings should document the reason and retain reversal records.
- Earnings exceeding configured thresholds may require manual verification.
- All receipt confirmations must be audit-logged with responsible personnel.
- Reversal of received earnings should create a corresponding reversal earning record.
- Earnings can be linked to projects or events for segmented reporting.
- The system should support batch import of earnings (e.g., monthly interest calculations).

---

#### 5.3.2 Earning Status Transition Rules

| From | To | Conditions | Who | Effect |
|------|----|-----------|----|--------|
| PENDING | RECEIVED | Amount confirmed, account verified | Finance | Creates IN transaction |
| PENDING | CANCELLED | Income not received or cancelled | Finance / Approver | Cancelled with reason |
| RECEIVED | CANCELLED | Reversal or correction needed | Accountant / Auditor | Creates reversal entry |

---

### 5.4 Account Management Process

**Process Flow:**
```
1. Create Account
   - Set type, holder, currency
   - Optional: Add bank/UPI details
   - Status: ACTIVE
   ↓
2. Store Account Details
   - Bank details for transfers
   - UPI details for digital payments
   ↓
3. Track Transactions
   - All transactions reference account
   - Balance calculated from transactions
   ↓
4. View Account Details
   - Query account by type, holder, status
   ↓
5. Close Account (Optional)
   - Set status: CLOSED
   - No new transactions allowed
```

**Key Use Cases:**
- **CreateAccountUseCase** - Setup new account
- **UpdateAccountUseCase** - Modify account details
- Query by type, holder, currency

---

## 6. Data Entities & Attributes

### 6.1 Database Schema (Prisma Models)

#### Account Table
```prisma
model Account {
  id                String
  name              String
  type              AccountType      // PRINCIPAL, GENERAL, DONATION, PUBLIC_DONATION, WALLET
  currency          String
  status            AccountStatus    // ACTIVE, CLOSED
  description       String?
  accountHolderName String?
  accountHolderId   String?
  bankAccountHolderName String?
  bankName          String?
  bankBranch        String?
  bankAccountNumber String?
  bankAccountType   String?
  IFSCNumber        String?
  payeeName         String?
  upiId             String?
  mobileNumber      String?
  qrData            String?
  createdAt         DateTime
  updatedAt         DateTime
  transactions      Transaction[]
  donations         Donation[]
  expenses          Expense[]
  earnings          Earning[]
}
```

#### Donation Table
```prisma
model Donation {
  id                String
  donationId        String          // NND-XXXXXX
  type              DonationType    // REGULAR, ONETIME
  amount            BigInt
  currency          String
  status            DonationStatus  // RAISED, PAID, PENDING, PAYMENT_FAILED, PAY_LATER, CANCELLED, UPDATE_MISTAKE
  donorId           String?         // User ID for registered donors
  donorName         String
  donorEmail        String?
  isGuest           Boolean
  startDate         DateTime?       // For regular donations
  endDate           DateTime?       // For regular donations
  raisedOn          DateTime        // When donation was raised
  paidOn            DateTime?       // When payment received
  confirmedBy       String?         // User ID
  confirmedOn       DateTime?
  paymentMethod     PaymentMethod?  // CASH, NETBANKING, UPI
  upiPaymentType    UPIPaymentType? // For UPI payments
  paymentReference  String?         // Payment gateway reference
  forEventId        String?         // Linked event
  accountId         String?         // Account for deposit
  createdAt         DateTime
  updatedAt         DateTime
  account           Account?
  transaction       Transaction?
}
```

#### Expense Table
```prisma
model Expense {
  id                String
  expenseId         String          // NEX-XXXXXX
  name              String
  amount            BigInt
  currency          String
  status            ExpenseStatus   // DRAFT, SUBMITTED, FINALIZED, SETTLED, REJECTED
  description       String
  referenceId       String?         // Project/Event ID
  referenceType     ExpenseRefType? // OPERATIONAL, ADMINISTRATIVE, EVENT, ADHOC, OTHER
  activityName      String?
  requestedBy       String          // User ID
  paidBy            String          // User ID
  expenseDate       DateTime
  submittedBy       String?         // User ID
  submittedDate     DateTime?
  finalizedBy       String?         // User ID
  finalizedDate     DateTime?
  settledBy         String?         // User ID
  settledDate       DateTime?
  rejectedBy        String?         // User ID
  rejectedDate      DateTime?
  remarks           String?         // For rejection/approval notes
  accountId         String?         // Payment from account
  transactionId     String?         // Transaction after settlement
  isDelegated       Boolean
  expenseItems      ExpenseItem[]   // JSON array
  createdAt         DateTime
  updatedAt         DateTime
  account           Account?
  transaction       Transaction?
}
```

#### Earning Table
```prisma
model Earning {
  id                String
  earningId         String          // NER-XXXXXX
  category          EarningCategory // INTEREST, SERVICE, PRODUCT, GRANT, SPONSORSHIP, OTHER
  amount            BigInt
  currency          String
  status            EarningStatus   // PENDING, RECEIVED, CANCELLED
  description       String
  source            String          // Source of earning
  referenceId       String?         // Project/Event/Grant ID
  referenceType     String?         // 'Project', 'Event', etc.
  accountId         String?         // Account to be credited
  transactionId     String?         // Transaction after receipt
  earningDate       DateTime?
  createdBy         String          // User ID
  receivedBy        String?         // User ID
  createdAt         DateTime
  updatedAt         DateTime
  account           Account?
  transaction       Transaction?
}
```

#### Transaction Table
```prisma
model Transaction {
  id                String
  transactionRef    String          // TXN-XXXXXX
  type              TransactionType // IN, OUT
  amount            BigInt
  currency          String
  status            TransactionStatus // SUCCESS, REVERSED
  referenceId       String?         // Donation/Expense/Earning ID
  referenceType     TransactionRefType // DONATION, EXPENSE, EARNING, TXN_REVERSE, NONE
  description       String
  particulars       String?
  metadata          Json?
  transactionDate   DateTime
  accountId         String?
  refAccountId      String?         // Counter account
  balanceAfter      BigInt?         // Post-transaction balance
  createdAt         DateTime
  updatedAt         DateTime
  account           Account?
  donation          Donation?
  expense           Expense?
  earning           Earning?
}
```

---

## 7. API Endpoints & Operations

### 7.1 Donation Endpoints

| Method | Endpoint | Description | Permission | Status |
|--------|----------|-------------|-----------|--------|
| POST | `/donation/create` | Create new donation | `create:donation` | 201 |
| POST | `/donation/create/guest` | Create guest donation | `create:donation_guest` | 201 |
| PATCH | `/donation/:id/update` | Update donation details | `update:donation` | 200 |
| POST | `/donation/:id/notify` | Process payment notification | - | 200 |
| GET | `/donation/:memberId/list` | Get member donations (paginated) | `read:user_donations` | 200 |
| GET | `/donation/:donorId/summary` | Get donation summary | - | 200 |
| GET | `/donation/list/me` | Get own donations (paginated) | - | 200 |

**Request/Response DTO:**
- `CreateDonationDto` - Create regular donation
- `CreateGuestDonationDto` - Guest donation creation
- `UpdateDonationDto` - Update existing donation
- `ProcessDonationPaymentDto` - Payment confirmation
- `DonationDto` - Response model
- `DonationSummaryDto` - Summary aggregation
- `DonationDetailFilterDto` - Query filters

---

### 7.2 Account Endpoints

**Expected Endpoints:**
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|-----------|
| POST | `/account/create` | Create new account | `create:account` |
| GET | `/account/:id` | Get account details | `read:account` |
| PATCH | `/account/:id/update` | Update account | `update:account` |
| GET | `/account/list` | List accounts (filtered) | `read:account` |
| POST | `/account/:id/close` | Close account | `update:account` |

---

### 7.3 Expense Endpoints

**Expected Endpoints:**
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|-----------|
| POST | `/expense/create` | Create expense | `create:expense` |
| PATCH | `/expense/:id/update` | Update expense | `update:expense` |
| PATCH | `/expense/:id/submit` | Submit for approval | `submit:expense` |
| PATCH | `/expense/:id/finalize` | Approve/Finalize expense | `approve:expense` |
| PATCH | `/expense/:id/settle` | Settle/Pay expense | `settle:expense` |
| PATCH | `/expense/:id/reject` | Reject expense | `reject:expense` |
| GET | `/expense/:id` | Get expense details | `read:expense` |
| GET | `/expense/list` | List expenses (filtered) | `read:expense` |

---

### 7.4 Earning Endpoints

**Expected Endpoints:**
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|-----------|
| POST | `/earning/create` | Create earning | `create:earning` |
| PATCH | `/earning/:id/update` | Update earning | `update:earning` |
| PATCH | `/earning/:id/receive` | Confirm receipt | `confirm:earning` |
| GET | `/earning/:id` | Get earning details | `read:earning` |
| GET | `/earning/list` | List earnings (filtered) | `read:earning` |

---

## 8. Use Cases & Business Operations

### 8.1 Key Use Cases

#### Donation Management
1. **CreateDonationUseCase** - Create regular or one-time donation
2. **UpdateDonationUseCase** - Modify donation (before payment)
3. **ProcessDonationPaymentUseCase** - Record payment confirmation

#### Expense Management
4. **CreateExpenseUseCase** - Create expense in DRAFT status
5. **UpdateExpenseUseCase** - Modify expense items/details
6. **FinalizeExpenseUseCase** - Submit and approve expense
7. **SettleExpenseUseCase** - Process payment and settle
8. **ReverseTransactionUseCase** - Reverse/cancel transactions

#### Earning Management
9. **CreateEarningUseCase** - Record income source
10. **UpdateEarningUseCase** - Modify earning details
11. **Implicit Receipt** - Auto-create transaction on receipt

#### Account Management
12. **CreateAccountUseCase** - Setup new account
13. **UpdateAccountUseCase** - Modify account details
14. **FixTransactionUseCase** - Correct transaction errors

---

### 8.2 Event Handlers (Workflow Integration)

| Handler | Trigger | Action |
|---------|---------|--------|
| **DonationAmountUpdateHandler** | Workflow event | Update regular donation amount |
| **DonationPauseUpdateHandler** | Workflow event | Pause/Resume regular donation |
| **GuestDonationCreationHandler** | Guest form submission | Create guest donation record |
| **DonationsEventHandler** | Domain event | Process donation confirmations |
| **DonationJobsHandler** | Scheduled job | Auto-raise monthly donations |

---

## 9. Integration Points

### 9.1 External Module Dependencies

**User Module:**
- User existence validation
- User role/permission checks
- User information retrieval

**Workflow Module:**
- Donation update triggers
- Guest donation form submission
- Expense approval workflow

**Document Management System (DMS):**
- Guest information storage
- Expense receipts/documents
- Financial reports generation

**Firebase:**
- Notifications (payment confirmations, expense approvals)
- Real-time updates

**Document Generator:**
- Generate receipts for donations
- Generate expense reports
- Generate financial statements

---

### 9.2 Domain Events Published

| Event | When | Subscribers |
|-------|------|-------------|
| **AccountCreatedEvent** | Account created | Audit logging, Notification |
| **DonationPaidEvent** | Donation marked PAID | Receipt generation, Reporting |
| **DonationRaisedEvent** | Donation auto-raised | Notification, Reporting |
| **ExpenseRecordedEvent** | Expense created | Audit logging, Workflow |
| **TransactionCreatedEvent** | Transaction created | Audit logging, Balance updates |

---

## 10. Data Validation Rules

### 10.1 Donation Validation
- ✓ Amount must be > 0
- ✓ Donor name required
- ✓ Type must be REGULAR or ONETIME
- ✓ Status must be valid enum
- ✓ For REGULAR: startDate required, endDate ≥ startDate
- ✓ Payment method required for payment processing
- ✓ Currency must be specified

### 10.2 Expense Validation
- ✓ Expense name required and non-empty
- ✓ Amount must be > 0 (sum of items)
- ✓ At least 1 expense item required
- ✓ Each item: name required, amount > 0
- ✓ Reference type must be valid enum
- ✓ Status transitions must follow workflow
- ✓ Requester must be valid user
- ✓ Payer must be valid user

### 10.3 Earning Validation
- ✓ Amount must be > 0
- ✓ Category must be valid enum
- ✓ Source required and non-empty
- ✓ Description required
- ✓ Currency specified

### 10.4 Account Validation
- ✓ Account name required and non-empty
- ✓ Account name must be unique within organization (case-insensitive)
- ✓ Account type must be valid enum
- ✓ Account status valid enum
- ✓ Currency specified
- ✓ Account Holder ID: Immutable after creation
- ✓ Account Holder Name format validation:
  - Minimum 2 characters, maximum 100 characters
  - Alphanumeric, spaces, hyphens, and apostrophes allowed
  - Cannot contain special characters (!, @, #, $, %, etc.)
  - Pattern: `^[a-zA-Z\s\-']{2,100}$`
  - Example valid: "John Doe", "Mary-Jane O'Brien", "NGO Foundation"
  
- ✓ Bank Details validation (if provided):
  - All fields must be non-empty if bank details provided
  - IFSC Code (11 characters, Indian Financial System Code):
    - Exactly 11 characters
    - First 4 characters: Bank code (alphabets only)
    - 5th character: Always '0' (reserved)
    - Last 6 characters: Branch code (alphanumeric)
    - Format: `^[A-Z]{4}0[A-Z0-9]{6}$`
    - Example: "SBIN0001234", "HDFC0000001"
  - Bank Account Number validation:
    - Length: 9-18 digits (varies by bank and account type)
    - Numeric only (no special characters)
    - Cannot start with 0
    - Pattern: `^[1-9][0-9]{8,17}$`
    - Example: "123456789012", "0987654321098765"
  - Bank Account Type validation:
    - Must be one of: "Savings", "Current", "NRE", "NRO"
    - Case-insensitive storage (normalized to proper case)
  - Bank Account Holder Name: Same format as Account Holder Name
  - Bank Name & Branch: Min 2 characters, max 100, alphanumeric with spaces
  
- ✓ UPI Details validation (if provided):
  - UPI ID format validation:
    - Format: `username@bankname` (e.g., john.doe@okhdfcbank)
    - Username: 3-60 characters, alphanumeric, dots, and hyphens allowed
    - Bank name: 3-20 characters, alphabets only, no special characters
    - Full pattern: `^[a-zA-Z0-9.-]{3,60}@[a-zA-Z]{3,20}$`
    - Example valid: "john.doe@okhdfcbank", "user-123@upi", "merchant@okaxis"
    - Example invalid: "john@@bank", "john doe@bank", "john@bank123"
  - Mobile Number: 10 digits, must be valid Indian format
    - Pattern: `^[6-9][0-9]{9}$` (starts with 6-9, followed by 9 digits)
    - Example: "9876543210", "6123456789"
  - Payee Name: Same format as Account Holder Name
  - QR Code Data: Base64 encoded string or URL (max 500 characters)

**Account Details Uniqueness:**
- Bank Account Number + Bank Name: Should be unique across all accounts (prevent duplicate bank accounts)
- UPI ID: Should be unique across all accounts (prevent duplicate UPI IDs)
- Validation occurs during create and update operations

### 10.5 Transaction Validation
- ✓ Amount must be > 0
- ✓ Type must be IN or OUT
- ✓ Status must be valid enum
- ✓ Currency specified
- ✓ Account ID required
- ✓ Description required

---

## 11. Security & Permissions

### 11.1 Permission Model
All operations require specific permissions checked via `@RequirePermissions()` decorator:

**Donation Permissions:**
- `create:donation` - Create donations
- `create:donation_guest` - Create guest donations
- `update:donation` - Update donations
- `read:user_donations` - View user donations

**Expense Permissions:**
- `create:expense` - Create expenses
- `update:expense` - Modify expenses
- `approve:expense` - Approve expenses
- `settle:expense` - Settle/pay expenses
- `read:expense` - View expenses

**Account Permissions:**
- `create:account` - Create accounts
- `read:account` - View account details
- `update:account` - Modify accounts

**Earning Permissions:**
- `create:earning` - Create earnings
- `update:earning` - Modify earnings
- `read:earning` - View earnings

### 11.2 Authentication
- JWT Bearer token required for all endpoints
- API key optional security layer
- User context available via `@CurrentUser()` decorator

### 11.3 Data Privacy
- User sensitive data (bank details) only shared with authorized personnel
- Guest donation information stored in DMS with access controls
- Transaction audit trail maintained for compliance

---

## 12. Error Handling & Exception Types

### 12.1 Business Exceptions
- **InvalidAmountException** - Amount validation failure
- **InvalidStatusTransitionException** - Workflow step not allowed
- **InvalidExpenseItemsException** - Expense items validation failure
- **InvalidDonationTypeException** - Donation type not recognized
- **InsufficientFundsException** - Account balance insufficient
- **UserNotFoundException** - Referenced user doesn't exist
- **AccountNotFoundException** - Referenced account doesn't exist

### 12.2 HTTP Status Codes
| Code | Scenario | Example |
|------|----------|---------|
| 201 | Resource created | POST /donation/create |
| 200 | Success | GET, PATCH, PUT operations |
| 400 | Validation error | Invalid amount, missing field |
| 401 | Authentication failed | Missing/invalid JWT |
| 403 | Permission denied | Missing required permission |
| 404 | Resource not found | Non-existent donation ID |
| 409 | Conflict | Invalid status transition |
| 500 | Server error | Unexpected error |

---

## 13. Reporting & Analytics

### 13.1 Report Types

**Donation Reports:**
- Monthly donation summary
- Donor contribution history
- Payment method analysis
- Regular vs one-time breakdown
- Outstanding payments report

**Expense Reports:**
- Expense by category/reference
- Approval pending report
- Settlement status report
- Amount by requester
- Audit trail of approvals

**Financial Reports:**
- Cash flow statement
- Account balance summary
- Income vs expense
- Period-wise analysis

**Providers:**
- `DonationSummaryReportProvider` - Donation aggregation
- `AuditReportProvider` - Audit trail generation

---

## 14. Audit & Compliance

### 14.1 Audit Trail
All financial operations tracked with:
- User ID (who performed action)
- Timestamp (when action performed)
- Operation type (create/update/delete)
- Old value → New value
- IP address (if available)
- Remarks/Comments

### 14.2 Compliance Requirements
- ✓ Immutable transaction records
- ✓ Reversals tracked as separate transactions
- ✓ Status change history maintained
- ✓ Approver audit trail
- ✓ Payment confirmation records
- ✓ Detailed expense itemization

### 14.3 Audit Events
- Account creation/closure
- Donation creation/payment confirmation
- Expense lifecycle transitions
- Earning receipt confirmation
- Transaction creation/reversal

---

## 15. Non-Functional Requirements

### 15.1 Performance
- **Transaction Processing** < 1 second
- **Donation Listing** < 2 seconds (paginated)
- **Report Generation** < 5 seconds (for typical periods)
- **Auto-raise Job** Completes monthly within 5 minutes

### 15.2 Scalability
- Support multiple organizations/tenants
- Handle 1000+ active donors
- Support 10,000+ transactions/month
- Concurrent user operations without conflicts

### 15.3 Reliability
- **Uptime** 99.9% (banking-grade)
- **Data Integrity** ACID compliance via Prisma
- **Backup** Daily automated backups
- **Disaster Recovery** < 4 hour RTO

### 15.4 Usability
- Intuitive workflow status transitions
- Clear error messages
- Responsive UI (mobile-friendly)
- Accessible for users with disabilities

---

## 16. Testing Strategy

### 16.1 Unit Tests
- Domain model validation rules
- Use case business logic
- DTO mapping and transformation
- Repository query filters

### 16.2 Integration Tests
- End-to-end donation workflow
- Expense approval workflow
- Transaction creation from donations/expenses
- Database persistence

### 16.3 API Tests
- Endpoint validation
- Permission checks
- Error handling
- Response structure

### 16.4 Performance Tests
- Donation auto-raise job
- Large dataset queries
- Report generation time

---

## 17. Known Limitations & Future Enhancements

### 17.1 Current Limitations
- Single currency per account (multi-currency planned)
- Manual payment confirmation (payment gateway integration planned)
- No recurring revenue forecasting
- Limited financial analytics

### 17.2 Legacy Account Deprecation (v1.0+)
- GENERAL, DONATION, PUBLIC_DONATION account types are deprecated
- New implementation uses COLLECTION account type instead
- Existing legacy accounts remain for historical purposes only
- No new transactions can be created against legacy account types
- Requires migration of existing systems to use COLLECTION type

### 17.3 Future Enhancements
- **Payment Gateway Integration** - Automated payment confirmation (Razorpay, Stripe)
- **Multi-Currency Support** - Global donation acceptance
- **Budget Forecasting** - AI-powered expense prediction
- **Advanced Analytics** - Financial dashboards and KPIs
- **Document Attachments** - Upload receipts/invoices
- **Split Payments** - Distribute expenses across multiple accounts
- **Donation Pledges** - Track future commitments

---

## 18. Appendices

### 18.1 Glossary of Terms

| Term | Definition |
|------|-----------|
| **Aggregate Root** | Top-level entity maintaining business invariants |
| **Domain Event** | Record of significant business occurrence |
| **Use Case** | Single business operation/scenario |
| **DTO** | Data Transfer Object for API contracts |
| **Repository** | Data access abstraction layer |
| **Value Object** | Immutable object representing domain concept |
| **Donation Cycle** | Complete flow from raising to payment |
| **Expense Workflow** | Multi-step approval and settlement process |
| **Immutability** | Property that cannot be changed after initial creation |
| **Uniqueness Constraint** | Database/application rule enforcing single occurrence of value |
| **Concurrent Transaction** | Multiple transactions executing simultaneously on same resource |
| **Optimistic Locking** | Concurrency control using version numbers without physical locks |
| **Pessimistic Locking** | Concurrency control using physical locks preventing concurrent access |
| **Balance Reconciliation** | Process of verifying calculated balance matches stored balance |
| **IFSC Code** | Indian Financial System Code - 11-character bank/branch identifier |
| **UPI ID** | Unified Payments Interface identifier (username@bankname format) |
| **Holder Immutability** | Account holder cannot be changed after account creation |
| **Account Name Uniqueness** | No two accounts can have identical names within organization |
| **Race Condition** | Unpredictable behavior when concurrent operations access shared resource |
| **Discrepancy** | Mismatch between expected and actual account balance |

### 18.2 Acronyms

| Acronym | Meaning |
|---------|---------|
| **BRD** | Business Requirements Document |
| **DDD** | Domain-Driven Design |
| **DTO** | Data Transfer Object |
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **RTO** | Recovery Time Objective |
| **DMS** | Document Management System |
| **UPI** | Unified Payments Interface |
| **IFSC** | Indian Financial System Code |
| **NGO** | Non-Governmental Organization |

### 18.3 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.2 | Jun 2026 | Added advanced account business rules: Account Holder Immutability, Account Name Uniqueness, Concurrent Transaction Handling with pessimistic locking, Minimum Balance Rules, Balance Reconciliation process, and comprehensive data validation for IFSC codes (Indian format), UPI IDs, Bank Account Numbers, and Account Holder Names |
| 1.1 | Jun 2026 | Deprecated GENERAL/DONATION/PUBLIC_DONATION account types; introduced new COLLECTION type for all fund collection needs; updated authorization rules and payable account specifications |
| 1.0 | Jun 2026 | Initial BRD creation |

---

## 19. Sign-Off & Approval

**Document Prepared By:** AI Assistant  
**Review Date:** June 2026  
**Approval Status:** Pending

**Stakeholders:**
- Finance Module Owner: _____________
- Development Team Lead: _____________
- Business Analyst: _____________
- Finance Department: _____________

---

**End of Document**
