const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOPIC_NAME = "projects/gcp-pub-sub-notifier/topics/gmail-notifiier";

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
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

/**
 * Load or request or authorization to call APIs.
 *
 */
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
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.labels.list({
    userId: "me",
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log("No labels found.");
    return;
  }
  console.log("Labels:");
  labels.forEach((label) => {
    console.log(`- ${label.name}`);
  });
}

// Function to log the data object to the console
function logCompleteJsonObject(jsonObject) {
  console.log(JSON.stringify(jsonObject, null, 4), "+======");
}
// Get history details based on history ID
async function getHistory(auth, historyId) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId: historyId,
  });
  // The main part of the response comes
  // in the "data" attribute.
  logCompleteJsonObject(res.data);
}

// Connect to Pub Sub
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

async function getMessage(auth, messageId) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
  });
  logCompleteJsonObject(res.data);
}

// Run the script
// (async () => {
//   let cred = await loadSavedCredentialsIfExist();
//   await connectPubSub(cred);
// })();

// authorize()
//   .then(async () => {
//     let cred = await loadSavedCredentialsIfExist();
//     await connectPubSub(cred);
//     let historyId = 48063;
//     await getHistory(cred, historyId);
//   })
//   .catch(console.error);

// // (async () => {
// //   let cred = await loadSavedCredentialsIfExist();
// //   let historyId = 48058;
// //   await getHistory(cred, historyId);
// // })();

// Run the script
(async () => {
  let cred = await loadSavedCredentialsIfExist();
  //   let historyId = 47406;
  //   await getHistory(cred, historyId);
  let messageId = "1904e6d789999ea6";
  await getMessage(cred, messageId);
})();
