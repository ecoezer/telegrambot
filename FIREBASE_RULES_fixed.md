# How to Fix "Permission Denied" Error

The error you are seeing happens because your database is currently **private**. You need to make the `bets` and `messages` collections **public** so your dashboard and chat can work for everyone.

Since I cannot log in to your Google account, you must do this manually in the Firebase Console.

## Step-by-Step Instructions

1.  **Go to Firebase Console**
    *   Click here: [https://console.firebase.google.com/](https://console.firebase.google.com/)
    *   Select your project (`telegrambot` or similar).

2.  **Navigate to Firestore Database**
    *   In the left sidebar, click on **Build** > **Firestore Database**.

3.  **Open the "Rules" Tab**
    *   Click on the **Rules** tab at the top of the main pane.

4.  **Paste the New Rules**
    *   Delete everything currently in the editor.
    *   Copy and paste the code block below exactly as is:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. Allow public to READ bets (so dashboard works)
    match /bets/{betId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 2. Allow public to READ and WRITE chat messages
    match /messages/{messageId} {
      allow read, write: if true;
    }
    
    // 3. Allow public to WRITE status (Typing indicator)
    match /typing/{userId} {
      allow read, write: if true;
    }

    // 4. Keep everything else private (require login)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5.  **Publish**
    *   Click the **Publish** button at the top right of the editor.

## Verification
Once you click Publish, refresh your website. The error should disappear immediately, and the chat + dashboard will load!
