# TODO: Add Uploader and Last Edited to More Information Modal

- [x] Remove "Uploader" and "Last Edited" columns from the table header in HTML
- [x] Update displayTransactions function to remove uploader and lastEdited td, adjust colspan to 8
- [x] Update displayFilteredTransactions function to remove uploader and lastEdited td, adjust colspan to 6 (since it was missing division and paymentMethod)
- [x] Update showMoreInfo function to populate the modal with uploader and last edited information for the selected transaction
- [x] Test the UI to ensure columns are removed and modal shows the info correctly
