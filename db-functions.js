const admin = require("firebase-admin");

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
