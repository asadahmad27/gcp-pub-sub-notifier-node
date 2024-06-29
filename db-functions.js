const admin = require("firebase-admin");

const serviceAccount = {
  type: "service_account",
  project_id: "<project-id>",
  private_key_id: "YOUR_PRIVATE_KEY_ID",
  private_key: "YOUR_PRIVATE_KEY",
  client_email: "YOUR_CLIENT_EMAIL",
  client_id: "YOUR_CLIENT_ID",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "YOUR_CLIENT_X509_CERT_URL",
  universe_domain: "googleapis.com",
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://<db-url>.firebaseio.com/",
});

const db = admin.database();

const sanitizeKey = (key) => {
  return key.replace(/[.#$/\[\]]/g, "_");
};

const decodeJwt = (token) => {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
  return JSON.parse(jsonPayload);
};

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

module.exports = {
  getHistoryId,
  setHistoryId,
  sanitizeKey,
  storeMailsInDB,
  decodeJwt,
  getCurrentUserTokens,
  db,
};
