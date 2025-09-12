# TODO for Adding Multiple Tables Feature

- [x] Add 'tables' collection in Firestore with fields: userId, name, createdAt
- [x] Modify transactions to include tableId field, default to 'default' table
- [x] Add currentTable variable to track active table
- [x] Update subscribeTransactions to filter by tableId
- [x] Populate #menuTable modal with list of tables, create new table button
- [x] Add switch table functionality (pindah tabel)
- [x] Add delete table functionality (hapus tabel), with option to move transactions
- [x] Update transaction creation to use currentTable
- [ ] Test creating, switching, deleting tables
