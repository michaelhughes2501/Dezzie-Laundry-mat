# Security Specification - Smart Laundromat Operations Portal

## 1. Data Invariants

1. **Identity Integrity**: User balance top-ups, loyalty profile updates, and booking requests must belong to the authenticated user's ID (`request.auth.uid`). A user cannot book or debit someone else's wallet files.
2. **Read Restrictiveness**: Financial ledgers (Transactions) and membership profiles (Loyalty Profiles) with virtual credit properties are confidential and isolated; users may only fetch their own files.
3. **Transaction Immutability**: Financial records (`transactions`) are ledger receipts and must be completely immutable once written (no updates or deletions allowed).
4. **Maintenance Sentry Access**: Machine configurations can be requested or read globally to display store statuses, but technical overrides and repair states must adhere to authorized configurations.

---

## 2. The "Dirty Dozen" Threat Payloads

Here are twelve highly malicious mock payloads designed to test and breach our Firestore attribute security rule fences:

| Target Path | Threat Intent | Violations / Payload Attributes |
| :--- | :--- | :--- |
| `machines/M1` | Shadow Update injection | Attempt to append a spoofed boolean `isManagerVerified: true` into telemetry fields. |
| `machines/M1` | Invalid pricing injection | Inject massive negative rates inside standard machine pricing. |
| `bookings/B1001` | Alternate user identity hijacking | Booking created with user ID `auth_user_A` while user is authenticated as `auth_user_B`. |
| `bookings/B1001` | Unauthorized price override | Booking payload declaring `amountPaid: 0.00` bypasses dynamic price engine requirements. |
| `loyaltyProfiles/userA` | Privilege escalation | User A attempts to write `discountTier: "VIP"` and `discountRate: 0.99` directly on profile creation. |
| `loyaltyProfiles/userA` | Wallet state hijacking | Modifying another player's balance pool directly through client-side query manipulation. |
| `transactions/T55` | Ledger modification | Unauthorized update to historical wash/dry payment receipts to decrease spending values. |
| `transactions/T55` | Ledger deletion | Removing a transaction entry from the database to mask unpaid wash actions. |
| `pricingRules/current` | Price manipulation | Unauthenticated user setting peak surge multiplier to `0.0` or extremely high surges. |
| `maintenanceTasks/M-1` | Spoofed assignment | Changing tasks assigned technician to untrusted characters or malicious actors. |
| `notifications/N-1` | Broadcast poisoning | Injecting junk HTML payload alerts to spoof technical warnings to managers. |
| `notifications/N-1` | System state bypass | Normal client bypasses read constraints to clear entire alerts database history. |

---

## 3. Test Runner Specifications (`firestore.rules.test.ts`)

The ruleset guarantees that all attempts to perform the "Dirty Dozen" malicious writes or spoofing operations will result in a strict `PERMISSION_DENIED` status, validating the zero-trust paradigm.
