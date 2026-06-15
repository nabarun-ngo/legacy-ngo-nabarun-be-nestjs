# Test Scenarios — Finance Module

This document lists concise API and UI test scenarios derived from the Finance BRD ([docs/FINANCE_MODULE_BRD.md](docs/FINANCE_MODULE_BRD.md)). Use these for manual testing, automated test cases, or QA acceptance checks.

## Scope
 - Accounts, Transactions, Donations (Regular, One-time, Guest), Reconciliation, Concurrency, Authorization, Validation.

---

**API Test Scenarios**

 - **Account Creation - Valid PRINCIPAL**: Precondition: user has `TREASURER` role. Steps: call create account API with type `PRINCIPAL`, valid name, currency. Expect: 201 Created, account `status=ACTIVE`, account type `PRINCIPAL`, unique ID returned.

 - **Account Creation - Legacy Type Rejection**: Precondition: authenticated user. Steps: attempt create account with type `GENERAL` (or `DONATION`/`PUBLIC_DONATION`). Expect: 4xx BusinessException, message contains "Legacy account type cannot be created".

 - **Account Name Uniqueness (Case-insensitive)**: Precondition: an ACTIVE account named "Fund A" exists. Steps: create account with name "fund a". Expect: 4xx validation error "Account with this name already exists".

 - **Account Close With Non-zero Balance**: Precondition: account has balance > 0. Steps: call close account endpoint. Expect: 4xx BusinessException, cannot close until balance is zero.

 - **Immutable Holder ID Enforcement**: Precondition: existing account. Steps: call update account endpoint attempting to change `accountHolderId`. Expect: 4xx BusinessException, holder ID immutable.

 - **Transaction Create - Debit With Insufficient Funds**: Precondition: account balance = 50. Steps: create OUT transaction amount 100. Expect: 4xx validation error prohibiting negative balance.

 - **Transaction Create - Credit/ Debit Valid**: Steps: create IN transaction then OUT transaction respecting balance and currency. Expect: 201 Created, `balanceAfter` reflects summed operations, transaction reference `TXN-xxxxx` present.

 - **Transaction Currency Mismatch**: Steps: create transaction with currency != account.currency. Expect: 4xx validation error.

 - **Donation Workflow - One-time Raised → Paid**: Steps: create one-time donation (RAISED), update donation status to PAID with `paidToAccountId`, `paymentMethod`, `paidOn`, `confirmedById`. Expect: 200, donation status `PAID`, linked transaction created, account balances updated.

 - **Donation Workflow - Regular Creation Job**: Precondition: scheduled job runner. Steps: run monthly donation creation job for active users (simulate). Expect: donations created in `RAISED` for period start..end; skip users with donation pause flag; no duplicate overlapping donations for same donor/date-range.

 - **Guest Donation - Contact Requirement**: Steps: create guest one-time donation without `donorEmail` and `donorNumber`. Expect: 4xx validation error requiring contact info for follow-ups (if follow-up flag present). Steps: create with `donorEmail` or `donorNumber` → 201 Created.

 - **Status Transition Guardrails**: Steps: attempt invalid transition (e.g., `PAID` → `PAID` again, or `PAID` → `CANCELLED`). Expect: 4xx preventing invalid transitions; `PAID` only allows `UPDATE_MISTAKE` per BRD.

 - **Reconciliation - Balance Discrepancy Detection**: Steps: run daily reconciliation job where stored balance != SUM(transactions). Expect: discrepancy event logged, new transactions blocked, alert created and reconciliation record persisted.

 - **Concurrency - Optimistic/Pessimistic Locking**: Steps: simulate concurrent debit requests reducing same balance (100 concurrent requests). Expect: no negative balance; some requests fail with ConcurrencyException or retry guidance; database remains consistent.

 - **Audit Trail - Account Closure**: Steps: close account (with zero balance). Expect: closure audit record with actor, timestamp, previous balance, and no further transactions allowed.

 - **Payable Account Selection Logic**: Steps: query payable accounts for donation `ONETIME` and `REGULAR`. Expect: `ONETIME` returns `COLLECTION + PRINCIPAL`, `REGULAR` returns `PRINCIPAL` per configurable rules; filter only `ACTIVE` accounts.

 - **Validation - Account Name Not Blank**: Steps: create/update account with name "   " (whitespace). Expect: 4xx validation error.

---

**UI Test Scenarios**

 - **Create Account UI - PRINCIPAL flow (TREASURER)**: Preconditions: user logged in as TREASURER. Steps: open Accounts page → click Create → fill required fields (name, type PRINCIPAL, currency) → submit. Expected: success toast, account appears in list with `ACTIVE` status.

 - **Prevent Legacy Account Creation in UI**: Steps: open Create Account modal → attempt selecting `DONATION` or `GENERAL`. Expected: legacy types disabled or selecting them shows explanatory tooltip/error preventing creation.

 - **Account Name Uniqueness UI Validation**: Steps: enter name that differs only by case from existing account. Expected: inline validation error before submit.

 - **Close Account UI - Non-zero Balance Block**: Steps: try to close an account with non-zero balance via UI. Expected: modal shows error and prevents closure; suggests steps to transfer/zero balance first.

 - **Transaction Entry UI - Prevent Double Submit**: Steps: fill transaction form and click Submit twice quickly. Expected: UI disables submit on first click; only one transaction created; show success once.

 - **Donation Creation - Guest Flow**: Steps: open guest donation form (public) → submit with name + contact + amount → confirm payment flow. Expected: donation created with `isGuest=true`, confirmation UI shown, notification sent if contact provided.

 - **Donation Payment Confirmation UI**: Preconditions: donation in `RAISED`. Steps: finance UI mark donation PAID, supply `paidToAccount`, `paymentMethod`, `paidOn`, `confirmedBy`. Expected: donation status updates to `PAID`, linked transaction visible, UI audit log entry.

 - **Donation List Filters & Statuses**: Steps: apply filters (status=RAISED, donor=XYZ, date range). Expected: list correctly filters, counts update, pagination works.

 - **Reconciliation Dashboard - Discrepancy Indicator**: Steps: navigation to Reconciliation page after discrepancy logged. Expected: visual flag/alert, link to reconciliation report and details, block new transaction button disabled while unresolved.

 - **Concurrent Action UX**: Steps: two finance users open same transaction form; one completes and submits. Expected: second user receives clear conflict message if action conflicts (e.g., insufficient funds) and form revalidated.

---

## How to convert to automated tests
 - API: translate each API scenario into an integration test (SuperTest, Jest, or Postman/Newman). Use fixtures to seed accounts, donations, and transactions; mock scheduled jobs where needed.
 - UI: translate flows to Cypress or Playwright scripts; use seeded test data and test accounts with roles (TREASURER, finance user).

## File references
 - BRD: [docs/FINANCE_MODULE_BRD.md](docs/FINANCE_MODULE_BRD.md)

---

If you want, I can: generate runnable Postman collections for the API scenarios, or scaffold Cypress tests for the top UI flows. Which would you like next?
