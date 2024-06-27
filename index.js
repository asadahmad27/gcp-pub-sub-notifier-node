const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const admin = require("firebase-admin");
const cors = require("cors"); // Import CORS
// const serviceAccount = require("./firebase-private-keys.json");
const serviceAccount = {
  type: "service_account",
  project_id: "gcp-pub-sub-notifier",
  private_key_id: "6464adda503e74c7bdd3dc9d5e1828fc6f386c8f",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCLEVv71B+ctyOZ\n+9wCoKr3QxiutkTnF8FglGtZG7cxpazC6sEHCdZk+OO/1YqbOcaOQ/VIRPUPbX1K\nDqDlHBC/9bclDMSPuMb1+hv8AzZxIbPEjP2NnrOIjC/9PktiotMLSuX104Cmh4OQ\ngwb0LUfbrP727qQrqTnE1B8KKi6WXQ0PaZ/LRVYtWl34m/IsRAmoUlLtmkPyATk5\nvBPEY/0FrRjlWpJ5AfPeb93p8zu9aCe0hhYDu3Ma+3lBNxUJY79eHLSZFetPNH0a\njXV7yXcPPIEPQFSGt0u5YcS4CyEYdDHg7Z2mKCTtal7C96cAcP9+PZvF1mmiAOMB\nOD9sgdoHAgMBAAECggEAGl6pTYA0mlfTxWAPoOPsZ0Ruyro/KH7FqVWbYWMzApQC\nxVcUUQxZff3/2aFZTgPPlaxnN1P0D//X8RIDCk6fEnc6Sik4oHQOLhhF9Cx7x0n3\nt35wmckNDAhhFSkZzFNJp2uFXW7Eh09M8DsYN3bamFoeYp5vvOOy05LRa/EBsnsc\n58NHABVqBIUn/wmB7YzISxBIID94CjvbGusVvnqGeYWp0UltBRd6QQpgrwAQb2u4\nF3lZiNO21VJS2PDS1P6z6JOM0UtaUOPFIDabIXjK1xQGRg/wIfrprzFsL+uz1p2Y\nIGbLdF6DSkBZTvET/Gz+DTxUUNOnQBu37pOxklgxGQKBgQDCNCWxqGaBU4BiCQaD\n1glZQWxySursHbEjr3tO3JVWv6l/pcGeW5q3IZK2JD2Vq6m46uIi4Sd/CHBFWI50\n/HWZtA//Q6eeg3GX+z4Znsx7bZwJH18Eqp58fq+ctucaNZGNAf5crhSQiS8eg9U7\neKR33sDK6X7kF3RUm7cA1UxflQKBgQC3UdZCUn1j0YaARKxW2e7Xi7LojkH9oHGC\n7qzyxVEXc1o8jE7ZE5ud4Mxkc/kF+W6trSll+mb4Josd7D/69qE0/DG4DmB8Nn1e\nYESuSJCJV/E8LHtbZcnVt1iel+Vi5rqKYQGsZXG1n+sAUWDcbiwwESb2iRN6LLxj\nqlaUBPOcKwKBgHwA/jylkeZsYiK3LqDJ76g9fTixm7Xu86gcqfjeIsGEmn92YN50\nEaNz3ZFOLMDAHxyDZqfs6uJTihTNihErDxB5CGnvUj2GIudvtuR3IIyDncm5bVu2\ncoJ+BjZkF8cFg43tQvT89wafgiXS+joCO8qKwsIOPEb6rv5De6QdjqnNAoGAR+Hd\nJBB4foWQOgezlDLMhtSOiMYPdkZNfEveoStiCtH+ljNmT5RytsuJGfKnuQH/tjZq\nP0Saz789WbRjuiKvP7mMPWHVz58GNdWF2Nk3Y8OKIlBG5qXZKOZF55okJk3W45/6\nKgF1PwS//1Xpp0XEKezv3EgPzR5xmJsYa94tMBUCgYEAvwWZP6nkhebjoJvZH2I/\nCRcWHvY4m0KAYxvi0TiQac6Yn7kJIOTdd61q3dlEv1yjrWtLuAhbk1lKMvF9/B0f\n7GvG7HjBX0DFCBP19VlStiLEvlS3Eow0TkXvcAplDlW27sfNzsDrYng5QvW3FcQl\neV9g+N5eyzDO2sprkXNP46Q=\n-----END PRIVATE KEY-----\n",
  client_email:
    "firebase-adminsdk-s465n@gcp-pub-sub-notifier.iam.gserviceaccount.com",
  client_id: "109091742434522102518",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-s465n%40gcp-pub-sub-notifier.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gcp-pub-sub-notifier-default-rtdb.firebaseio.com/",
});

const app = express();
const PORT = process.env.PORT || 8080;

// Configure CORS
const corsOptions = {
  origin: "*", // Replace with your frontend URL
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Use body-parser to parse JSON bodies into JS objects
app.use(bodyParser.json());

const db = admin.database();

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOPIC_NAME = "projects/gcp-pub-sub-notifier/topics/gmail-notifiier";

const oauth2Client = new google.auth.OAuth2(
  "226341879966-a1nf9tfijbfkjqrlmqpdephpjd5ilquh.apps.googleusercontent.com",
  "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",
  "http://localhost:3001"
);

const sanitizeKey = (key) => {
  return key.replace(/[.#$/\[\]]/g, "_");
};

const getHistoryId = async (userId) => {
  try {
    const ref = db.ref(`users/${userId}/historyId`);
    const snapshot = await ref.once("value");
    const historyId = snapshot.val();

    return historyId;
  } catch (error) {
    console.error("Error retrieving historyId:", error);
    return null;
  }
};

const setHistoryId = async (historyId, userId) => {
  const ref = db.ref(`users/${userId}/historyId`);
  await ref.set(historyId);
};

// Function to list unread messages for a user
async function getMessage(auth, messageId) {
  try {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    const message = res.data;
    const headers = message.payload.headers;
    const emailData = {};

    // List of keys to remove
    const keysToRemove = [
      "Received",
      "Received-SPF",
      "ARC-Message-Signature",
      "ARC-Authentication-Results",
      "ARC-Seal",
      "X-Received",
      "X-Gm-Message-State",
      "X-Google-Smtp-Source",
      "DKIM-Signature",
      "X-Google-DKIM-Signature",
      "Return-Path",
      "Authentication-Results",
    ];

    headers.forEach((header) => {
      if (!keysToRemove.includes(header.name)) {
        emailData[header.name] = header.value;
      }
    });

    // Function to decode base64url encoding
    const decodeBase64Url = (encoded) => {
      encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
      let decoded = Buffer.from(encoded, "base64").toString("utf8");
      return decoded;
    };

    const parts = message.payload.parts || [];
    parts.forEach((part) => {
      const sanitizedMimeType = sanitizeKey(part.mimeType);
      if (
        sanitizedMimeType === "text_plain" ||
        sanitizedMimeType === "text_html"
      ) {
        const decodedBody = decodeBase64Url(part.body.data);
        emailData[sanitizedMimeType] = decodedBody;
      }
    });

    return emailData;
  } catch (e) {
    console.log("no mesg for", messageId);
  }
}

// const storeMailsInDB = (mails, userId) => {
//   try {
//     // Store the email data in Firebase using messageId as the key
//     const ref = db.ref(`users/${userId}/mails`);

//     ref.update(mails, (error) => {
//       if (error) {
//         console.log("Data could not be saved.", error);
//       } else {
//         console.log("Data saved successfully.");
//       }
//     });
//   } catch (e) {
//     console.log("error in firebase", e);
//   }
// };

// const storeMailsInDB = (mails, userId) => {
//   try {
//     // Reference to the user's mails in the database
//     const ref = db.ref(`users/${userId}/mails`);

//     // Push each mail to the mails key
//     mails.forEach((mail) => {
//       ref.push(mail, (error) => {
//         if (error) {
//           console.log("Data could not be saved.", error);
//         } else {
//           console.log("Data saved successfully.");
//         }
//       });
//     });
//   } catch (e) {
//     console.log("Error in firebase", e);
//   }
// };

const storeMailsInDB = async (mails, userId) => {
  try {
    const ref = db.ref(`users/${userId}/mails`);

    // Retrieve existing mails data
    ref.once("value", (snapshot) => {
      const existingMails = snapshot.val() || [];

      // Combine existing mails with new mails
      const updatedMails = existingMails.concat(mails);

      // Update the mails key with combined data
      ref.set(updatedMails, (error) => {
        if (error) {
          console.log("Data could not be saved.", error);
        } else {
          console.log("Data saved successfully.");
        }
      });
    });
  } catch (e) {
    console.log("Error in firebase", e);
  }
};

async function fetchInitialMessages(auth, userId) {
  const gmail = google.gmail({ version: "v1", auth });
  try {
    const res = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX", "UNREAD"],
      maxResults: 10, // Adjust this number as needed
    });

    const messages = [];
    for (const message of res.data.messages) {
      const messageDetails = await getMessage(auth, message.id);
      messages.push(messageDetails);
    }

    console.log("Initial messages retrievd...");
    storeMailsInDB(messages, userId);

    // Fetch the current history ID
    const profile = await gmail.users.getProfile({ userId: "me" });
    const initialHistoryId = profile.data.historyId;

    await setHistoryId(initialHistoryId, userId);
    return initialHistoryId;
  } catch (error) {
    console.error("Error fetching initial messages:", error);
  }
}

async function listUnreadMessages(auth, historyId, userId) {
  const gmail = google.gmail({ version: "v1", auth });
  try {
    const res = await gmail.users.history.list({
      userId: "me",
      // q: "is:unread", // Query for unread messages
      startHistoryId: historyId,
      historyTypes: ["messageAdded"],
    });

    const histories = res.data.history;
    const messages = [];

    if (histories && histories.length > 0) {
      for (const history of histories) {
        if (history.messagesAdded) {
          for (const message of history.messagesAdded) {
            const messageDetails = await getMessage(auth, message.message.id);
            messages.push(messageDetails);
          }
        }
      }
    } else {
      console.log("No new messages found.");
    }

    console.log(messages, "messages");
    storeMailsInDB(messages, userId);
    // if (messages.length > 0) {
    //   await storeMessages(messages, userId);
    // }
  } catch (error) {
    console.error("Error listing unread messages:", error);
  }
}

app.get("/", (req, res) => {
  res.send("GCP is working fine on server");
});

async function createGmailWatch(auth, email) {
  try {
    const gmail = google.gmail({ version: "v1", auth });

    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX", "UNREAD"],
        topicName: TOPIC_NAME,
      },
    });
    console.log("Pubsub Created for ", email);
  } catch (e) {
    console.log("Error in gmail watch", e);
  }
}

// Function to decode the JWT and extract the payload
function decodeJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
  return JSON.parse(jsonPayload);
}

// Endpoint to receive Google OAuth tokens
app.post("/store-tokens", async (req, res) => {
  const { code } = req.body;

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Extract the tokens
    const { access_token, refresh_token, id_token } = tokens;
    // Verify the ID token and get user info
    const ticket = await oauth2Client.verifyIdToken({
      idToken: id_token,
      audience:
        "226341879966-a1nf9tfijbfkjqrlmqpdephpjd5ilquh.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();

    const userId = payload["sub"]; // User ID
    const email = payload["email"]; // User email

    const ref = db.ref(`users/${userId}`);
    await ref.set({ tokens, email });

    await createGmailWatch(oauth2Client, email);

    // Send tokens to the client or store them in your database
    res.status(200).send({ access_token, refresh_token, id_token });
  } catch (error) {
    console.error("Error exchanging authorization code for tokens:", error);
    res.status(400).send("Error exchanging authorization code for tokens");
  }
});

const getCurrentUserTokens = async (emailAddress) => {
  try {
    const userRef = db.ref("users");
    const snapshot = await userRef.once("value");
    const users = snapshot.val();
    let userId, tokens;

    for (const key in users) {
      if (users[key].email === emailAddress) {
        userId = key;
        tokens = users[key].tokens;
        break;
      }
    }

    if (!tokens) {
      console.error("No tokens found for email:", emailAddress);
      // return res.status(400).send('No tokens found');
    } else {
      return tokens;
    }
  } catch (e) {}
};
app.post("/webhook", async (req, res) => {
  try {
    console.log("Webhook received:", req.body); // Log the incoming request

    const pubSubMessage = req.body.message;
    const messageData = Buffer.from(pubSubMessage.data, "base64").toString(
      "utf-8"
    );
    const messageJson = JSON.parse(messageData);
    const historyId = messageJson.historyId;

    console.log(`Received webhook for historyId: ${historyId}`, messageJson);

    const userTokens = await getCurrentUserTokens(messageJson.emailAddress);

    oauth2Client.setCredentials(userTokens);

    const decodedToken = decodeJwt(userTokens?.id_token);
    const userId = decodedToken.sub;
    console.log("userId", userId);

    // // Get the last stored history ID
    let lastHistoryId = await getHistoryId(userId);

    if (!lastHistoryId) {
      // Fetch initial messages and set the initial historyId
      lastHistoryId = await fetchInitialMessages(oauth2Client, userId);
    } else {
      // Fetch and store new unread messages since the last history ID
      await listUnreadMessages(oauth2Client, lastHistoryId, userId);
      // Update the history ID in Firebase
      await setHistoryId(historyId, userId);
    }

    res.status(204).send(); // Acknowledge the message
  } catch (error) {
    console.error("Error handling webhook", error);
    res.status(500).send("Error handling webhook");
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
