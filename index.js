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
const PORT = process.env.PORT || 5000;

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
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOPIC_NAME = "projects/gcp-pub-sub-notifier/topics/gmail-notifiier";

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
  }
  return client;
}

function logCompleteJsonObject(jsonObject) {
  console.log(JSON.stringify(jsonObject, null, 4), "+======");
}

async function getHistory(auth, historyId) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId: historyId,
  });
  logCompleteJsonObject(res.data);
}

async function connectPubSub(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: TOPIC_NAME,
    },
  });
  console.log(res);
}

const sanitizeKey = (key) => {
  return key.replace(/[.#$/\[\]]/g, "_");
};

const getHistoryId = async () => {
  const ref = db.ref("historyId");
  const snapshot = await ref.once("value");
  return snapshot.val();
};

const setHistoryId = async (historyId) => {
  const ref = db.ref("historyId");
  await ref.set(historyId);
};

async function getMessage(auth, messageId) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
  });

  const message = res.data;
  const headers = message.payload.headers;
  const emailData = {};

  headers.forEach((header) => {
    emailData[header.name] = header.value;
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

    // if (part.mimeType === "text/plain" || part.mimeType === "text/html") {
    //   const decodedBody = decodeBase64Url(part.body.data);
    //   emailData[part.mimeType] = decodedBody;
    // }
  });
  console.log(emailData, "emailsData");

  try {
    // Store the email data in Firebase using messageId as the key
    const ref = db.ref("emails/").child(messageId);

    ref.set(emailData, (error) => {
      if (error) {
        console.log("Data could not be saved.", error);
      } else {
        console.log("Data saved successfully.");
      }
    });
  } catch (e) {
    console.log("error in firebase", e);
  }

  console.log("+======");
}

// Function to list unread messages for a user
async function listUnreadMessages(auth, historyId, userId) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.history.list({
    userId: "me",
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

  if (messages.length > 0) {
    await storeMessages(messages, userId);
  }
}

// async function listUnreadMessages(auth, historyId) {
//     const gmail = google.gmail({ version: "v1", auth });
//     const res = await gmail.users.history.list({
//       userId: "me",
//       startHistoryId: historyId,
//       historyTypes: ["messageAdded"]
//     });
//     const histories = res.data.history;

//     if (histories && histories.length > 0) {
//       for (const history of histories) {
//         if (history.messagesAdded) {
//           for (const message of history.messagesAdded) {
//             await getMessageAndStore(auth, message.message.id);
//           }
//         }
//       }
//     } else {
//       console.log("No new messages found.");
//     }}
app.get("/", (req, res) => {
  res.send("GCP is working fine on server");
});

async function createGmailWatch(auth) {
  try {
    const gmail = google.gmail({ version: "v1", auth });
    console.log(gmail, "gmail", auth);
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName: TOPIC_NAME,
      },
    });
    console.log(res);
  } catch (e) {
    console.log("Error in gmail watch", e);
  }
}

const oauth2Client = new google.auth.OAuth2(
  "226341879966-a1nf9tfijbfkjqrlmqpdephpjd5ilquh.apps.googleusercontent.com",
  "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",
  "http://localhost:3001"
);

const refreshAccessToken = async (refreshToken) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  console.log(credentials, "credentials");
  return credentials;
};

// Endpoint to receive Google OAuth tokens
app.post("/store-tokens", async (req, res) => {
  const { code } = req.body;

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Extract the tokens
    const { access_token, refresh_token, id_token } = tokens;
    console.log(
      access_token,
      "-=-==-=",
      refresh_token,
      "--==--=-=-",
      id_token,
      "tokens"
    );

    // Verify the ID token and get user info
    const ticket = await oauth2Client.verifyIdToken({
      idToken: id_token,
      audience:
        "226341879966-a1nf9tfijbfkjqrlmqpdephpjd5ilquh.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    console.log(payload, "payload");
    const userId = payload["sub"]; // User ID
    const email = payload["email"]; // User email

    const ref = db.ref(`users/${userId}/tokens`);
    await ref.set({ tokens, email });

    await createGmailWatch(oauth2Client);

    // Send tokens to the client or store them in your database
    res.status(200).send({ access_token, refresh_token, id_token });
  } catch (error) {
    console.error("Error exchanging authorization code for tokens:", error);
    res.status(400).send("Error exchanging authorization code for tokens");
  }

  // const { userId, tokens, email } = req.body;
  // console.log(userId, "-=-=-=-===-=-", tokens);

  // const updated = {
  //   ...tokens,
  //   refresh_token:
  //     "1//03KTNE9u8Q52uCgYIARAAGAMSNwF-L9Ir6ZCwB-Hbckucc-BETG4cIf0W1r5zV5crtjzEx5ArJVA_ShVGVLv9UJKycqH4JgG-CtY",
  // };

  // Use the tokens to set up Gmail watch
  // const oauth2Client = new google.auth.OAuth2();
  // try {
  //   const oauth2Client = new google.auth.OAuth2(
  //     "226341879966-a1nf9tfijbfkjqrlmqpdephpjd5ilquh.apps.googleusercontent.com",
  //     "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"
  //   );
  //   oauth2Client.setCredentials(tokens);
  // } catch (e) {
  //   console.log(e, "hre eorror");
  // }
  // const oauth2Client = new google.auth.OAuth2(
  //   "226341879966-a1nf9tfijbfkjqrlmqpdephpjd5ilquh.apps.googleusercontent.com",
  //   "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"
  // );
  // const oauth2Client = new google.auth.OAuth2(
  //   "226341879966-a1nf9tfijbfkjqrlmqpdephpjd5ilquh.apps.googleusercontent.com",
  //   "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",
  //   "http://localhost:8080"
  // );
  // Set the initial credentials
  // ====
  // oauth2Client.setCredentials(updated);

  // Refresh the access token
  // const newTokens = await refreshAccessToken(tokens.refresh_token);
  // await ref.update(newTokens); // Update stored tokens with new access token

  // Set the new credentials
  // oauth2Client.setCredentials(newTokens);

  // oauth2Client.setCredentials(tokens);

  // await createGmailWatch(oauth2Client);

  // res.status(200).send("Tokens stored successfully");
});

// app.post("/webhook", async (req, res) => {
//   try {
//     const pubSubMessage = req.body.message;
//     const messageData = Buffer.from(pubSubMessage.data, "base64").toString(
//       "utf-8"
//     );
//     const messageJson = JSON.parse(messageData);

//     const emailAddress = messageJson.emailAddress;
//     const historyId = messageJson.historyId;

//     console.log(
//       `Received webhook for email: ${emailAddress}, historyId: ${historyId}`
//     );

//     // Authorize and fetch the history details
//     let auth = await authorize();

//     // Get the last stored history ID
//     const lastHistoryId = (await getHistoryId()) ?? historyId;

//     // Option 1: Log all messages in the inbox
//     await listMessages(auth, lastHistoryId);

//     // await getHistory(auth, historyId);

//     // Update the history ID in Firebase
//     await setHistoryId(historyId);

//     res.status(204).send(); // Acknowledge the message
//   } catch (error) {
//     console.error("Error handling webhook", error);
//     res.status(500).send("Error handling webhook");
//   }
// });

app.post("/webhook", async (req, res) => {
  try {
    console.log("Webhook received:", req.body); // Log the incoming request

    const pubSubMessage = req.body.message;
    const messageData = Buffer.from(pubSubMessage.data, "base64").toString(
      "utf-8"
    );
    const messageJson = JSON.parse(messageData);

    const userId = messageJson.userId; // Use userId instead of email
    const historyId = messageJson.historyId;

    console.log(
      `Received webhook for userId: ${userId}, historyId: ${historyId}`
    );

    // Authorize and fetch the unread messages
    const userTokensSnapshot = await db
      .ref(`users/${sanitizeKey(userId)}/tokens`)
      .once("value");
    const userTokens = userTokensSnapshot.val();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(userTokens);

    // Get the last stored history ID
    const lastHistoryId = await getHistoryId(userId);

    // Fetch and store new messages since the last history ID
    await listUnreadMessages(oauth2Client, lastHistoryId, userId);

    // Update the history ID in Firebase
    await setHistoryId(historyId, userId);

    res.status(204).send(); // Acknowledge the message
  } catch (error) {
    console.error("Error handling webhook", error);
    res.status(500).send("Error handling webhook");
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // (async () => {
  //   // authorize
  //   let cred = await loadSavedCredentialsIfExist();
  //   await connectPubSub(cred);
  // })();
});
