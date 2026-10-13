# Security Specification & Threat Model

## 1. Data Invariants
1. **User Identity Invariant**: A user document at `/users/{userId}` can only be created, read, updated, or deleted by the authenticated user whose `request.auth.uid == userId`. Cross-user reading or writing of profiles is strictly denied.
2. **Subcollection Relational Invariant**: Any subdocument under `/users/{userId}/...` (decks and progress) strictly requires `request.auth.uid == userId`.
3. **Owner Integrity Invariant**: The `ownerId` field inside any written document must strictly equal `request.auth.uid`.
4. **Immutability Invariant**: The `ownerId` and `createdAt` fields can never be altered during updates.
5. **Key Whitelist Invariant**: Payloads must strictly contain only allowed keys defined in the schema to prevent ghost/shadow fields.
6. **Path Variable Hardening**: Document IDs such as `{userId}`, `{deckId}`, `{testId}` must conform to safe regex and size constraints (`isValidId`).
7. **Temporal Invariant**: Client-provided timestamps cannot be forged; server timestamp `request.time` is validated.
8. **Size Boundaries**: All strings and lists are strictly bounded by size limits to guard against resource exhaustion and Denial-of-Wallet attacks.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Identity Hijack - Create Foreign Profile)**:
   An attacker with `uid: "attacker_123"` attempts to write to `/users/victim_456` with `{ ownerId: "victim_456", email: "victim@example.com" }`.
   *Expected Result*: `PERMISSION_DENIED`

2. **Payload 2 (Ghost Field Injection - Shadow Update)**:
   A user attempts to add an administrative bypass field `{ isAdmin: true, role: "superadmin" }` to their profile update.
   *Expected Result*: `PERMISSION_DENIED`

3. **Payload 3 (Owner Id Mutability - Privilege Escalation)**:
   User updates deck with an altered `ownerId: "other_user_789"`.
   *Expected Result*: `PERMISSION_DENIED`

4. **Payload 4 (Unauthenticated Blanket Read)**:
   An unauthenticated guest (`request.auth == null`) attempts to read `/users/alice_101/decks/lesson_0`.
   *Expected Result*: `PERMISSION_DENIED`

5. **Payload 5 (Cross-Tenant Deck Tampering)**:
   Authenticated user Bob (`uid: "bob"`) attempts to update Alice's lesson deck at `/users/alice/decks/lesson_1`.
   *Expected Result*: `PERMISSION_DENIED`

6. **Payload 6 (Oversized ID Resource Exhaustion / ID Poisoning)**:
   An attacker attempts to write to `/users/attacker/decks/` with a 2048-character ID containing illegal injection characters (`../../../escape`).
   *Expected Result*: `PERMISSION_DENIED`

7. **Payload 7 (Denial of Wallet - Giant Array Payload)**:
   User attempts to inject a deck `words` array containing 5,000 unbounded items.
   *Expected Result*: `PERMISSION_DENIED`

8. **Payload 8 (Invalid Enum Spoofing)**:
   User attempts to write `spacedSystem: "99_hacked"` (only "3", "4", "5" allowed) to `/users/{userId}/progress/main`.
   *Expected Result*: `PERMISSION_DENIED`

9. **Payload 9 (Test Document Privilege Escalation)**:
   User attempts to write an unauthorized payload to `/test/connection` or arbitrary `/test/malicious`.
   *Expected Result*: `PERMISSION_DENIED`

10. **Payload 10 (Type Poisoning - Number as String)**:
    User attempts to update `lessonNumber` with a string `"not_a_number"` or negative numbers outside 0-30 bounds.
    *Expected Result*: `PERMISSION_DENIED`

11. **Payload 11 (Timestamp Forgery Attack)**:
    User attempts to backdate or forward-date `updatedAt` instead of valid timestamp or server timestamp constraints.
    *Expected Result*: `PERMISSION_DENIED`

12. **Payload 12 (Blanket List Scraping)**:
    User attempts to query the root `/users` collection without scoping to their own UID.
    *Expected Result*: `PERMISSION_DENIED`

---

## 3. Test Runner
Defined in `firestore.rules.test.ts`.
