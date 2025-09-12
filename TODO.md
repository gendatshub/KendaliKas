# TODO for Adding Multiple Tables Feature

- [ ] Add 'tables' collection in Firestore with fields: userId, name, createdAt
- [ ] Modify transactions to include tableId field, default to 'default' table
- [ ] Add currentTable variable to track active table
- [ ] Update subscribeTransactions to filter by tableId
- [ ] Populate #menuTable modal with list of tables, create new table button
- [ ] Add switch table functionality (pindah tabel)
- [ ] Add delete table functionality (hapus tabel), with option to move transactions
- [ ] Update transaction creation to use currentTable
- [ ] Test creating, switching, deleting tables
