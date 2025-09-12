# Firebase Firestore Setup for KendaliKas App

## 1. Firestore Database Rules

Set your Firestore rules to allow authenticated users to read and write their own data securely. Use the following example rules in the Firebase Console under Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow read/write access only to authenticated users on their own data
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    match /collaborators/{collaboratorId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    match /tables/{tableId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
    
    match /accessRequests/{requestId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.requesterId;
    }
    
    // Default deny all other requests
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 2. Create Required Collections and Sample Documents

You can create the following collections manually in Firestore Console or programmatically:

- **transactions**
  - Fields: userId (string), tableId (string), nama (string), jenis (string), jumlah (number), tanggal (string), kategori (string), proofUrl (string, optional), uploader (string), createdAt (timestamp), updatedAt (timestamp, optional)
  
- **collaborators**
  - Fields: userId (string), tableId (string), name (string), email (string), photoURL (string), role (string: viewer/editor)
  
- **tables**
  - Fields: ownerId (string), name (string), createdAt (timestamp)
  
- **accessRequests**
  - Fields: requesterId (string), tableId (string), name (string), email (string), photoURL (string), tableOwnerId (string)

## 3. Additional Firebase Setup

- Enable **Google Sign-In** in Firebase Authentication > Sign-in method.
- Ensure your Firebase project API keys and config in `index.html` and `login.html` match your Firebase project.

## 4. Testing

After setup, test the app by:

- Logging in with Google.
- Adding transactions.
- Viewing and editing transactions.
- Managing collaborators and tables.

---

If you want, I can help you create scripts to initialize sample data or guide you through testing steps.

Please confirm if you want me to proceed with testing or further setup assistance.
