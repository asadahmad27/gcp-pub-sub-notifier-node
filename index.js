const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const process = require("process");
const { google } = require("googleapis");
const cors = require("cors");
const {
  getHistoryId,
  setHistoryId,
  sanitizeKey,
  storeMailsInDB,
  decodeJwt,
  getCurrentUserTokens,
  db,
} = require("./db-functions");

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

const TOPIC_NAME = "projects/<project-name>/topics/<topic-name>";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

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

// function to get initial msg when user login first time
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

//function to get msgs based upon history id
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
    console.log(userTokens, "userTokens");

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
