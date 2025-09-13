# TODO: Add Export and Import Excel Features for Transaction Table

## Tasks
- [x] Add SheetJS (xlsx) library script import in index.html head
- [x] Add export button in #menuExportImport modal
- [x] Implement export logic in JavaScript to generate and download .xlsx file from transactionData
- [x] Test the export functionality to ensure it works correctly
- [x] Add import button and file input in #menuExportImport modal
- [x] Implement import logic in JavaScript to read .xlsx file, parse data, validate, and add to Firestore
- [x] Handle data mapping: Date (parse to YYYY-MM-DD), Type ('Income' -> 'pemasukan', 'Expense' -> 'pengeluaran'), Amount as number
- [x] Add error handling for invalid data and show feedback to user
- [x] Test the import functionality to ensure it works correctly

## Notes
- Export data includes: Date, Transaction Name, Category, Division, Payment Method, Type, Amount
- Use XLSX.utils.json_to_sheet and XLSX.writeFile for client-side Excel generation
- Amount exported as number for Excel formatting
- Import expects same columns; optional fields can be empty
- Validate required fields: Transaction Name, Type, Amount, Date
- Use batch add for multiple transactions
