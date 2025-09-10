# TODO: Implement Per-User Financial Tables

## Tasks
- [x] Update subscribeTransactions() to filter by userId
- [x] Add userId to new transaction documents when adding
- [x] Add userId to transaction documents when updating
- [x] Ensure delete operations are scoped to user's transactions (handled by filtering)
- [x] Create Firestore composite index for query (userId ==, createdAt desc)
- [ ] Test with multiple users to verify separation

## Completed
- [x] Analyze current code and plan changes
- [x] Create TODO.md
- [x] Fix table not reading data by creating required index
- [x] Add confirmation alert for logout in profile menu
