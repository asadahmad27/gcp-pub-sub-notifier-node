# Gmail Notifier

Gmail Notifier is a Node.js application that uses Google Gmail API to fetch and store unread emails in a database. It also uses Google Pub/Sub to get notifications of new emails and updates the database accordingly.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Endpoints](#endpoints)
- [GCP](#GCP)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed on your machine (version 12 or later)
- Google Cloud Platform account with Pub/Sub and Cloud Run services enabled
- Firebase Realtime Database configured
- Gmail API credentials

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/gmail-notifier.git
   cd gmail-notifier

   ```

2. Install Dependencies:

   ```bash
   npm install

   ```

3. Start Project:
   ```bash
   npm start
   ```

The server will be running on http://localhost:8080.

## Endpoints

#### URL:

/store-tokens

#### Method:

POST

#### Description:

Exchanges the authorization code for tokens and sets up Gmail watch for the user.

#### Request Body:

```bash
   {
   "code": "authorization_code"
   }
```

#### URL:

/webhook

#### Method:

POST

#### Description:

Endpoint to receive notifications from Google Pub/Sub

#### Request Body:

```bash
  {
  "message": {
    "data": "base64-encoded-data"
  }
```

## GCP

### Install Google Cloud SDK

To install Google Cloud SDK please follow this [documentation](https://cloud.google.com/sdk/docs/install). After you install it you be able to use gcloud commands.

and the login into your GCP account through CLI

```bash
gcloud init
```

#### Create project on your GCP

```bash
 gcloud projects create <project-name>
```

or you can select an already created project

```bash
gcloud projects list
gcloud config set project <project-id>
```

## Build Docker Image

```bash
docker build -t <your-image-name> .
```

### Test the Docker image

```bash
docker run -p 3000:8080 <your-image-name>
```

### Push the Docker image to Google Container Registry

```bash
gcloud builds submit --tag gcr.io/<your-project-id>/<your-image-name>
```

## Deploy the Docker container to Google Cloud Run

```bash
gcloud run deploy --image gcr.io/<your-project-id>/<your-image-name> --platform managed
```
