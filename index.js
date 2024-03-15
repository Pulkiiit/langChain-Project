const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const fs = require("fs");
const path = require("path");
const ngrok = require("@ngrok/ngrok");
require("dotenv").config();
const { Embeddings } = require("./embeddings");
const { ask } = require("./interface");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Express server running on ${port}`);
});

ngrok
  .connect({ addr: port, authtoken_from_env: true })
  .then(listener => console.log(`Ingress established at: ${listener.url()}`));

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendMessage = (message, from, to) => {
  twilioClient.messages
    .create({ body: message, from: from, to: to })
    .then(msg => console.log(msg.sid));
};

const saveDocument = async mediaURL => {
  //pdf and co ??
  try {
    const fetch = (await import("node-fetch")).default;
    const filepath = path.join(__dirname, "documents", "document.pdf");
    return new Promise(async (resolve, reject) => {
      await fetch(mediaURL)
        .then(res => {
          res.body.pipe(fs.createWriteStream(filepath));
          res.body.on("end", () => resolve(true));
        })
        .catch(error => {
          console.error(error);
          resolve(false);
        });
    });
  } catch (error) {
    console.error(error);
    return false;
  }
};

const handleIncomingMessage = async req => {
  const { Body } = req.body;
  let message = "";

  if (Body.toLowerCase().includes("hello") && Body.length === 5) {
    message =
      "Hello! I'm DocuBot 🤖, your friendly PDF assistant.\nPlease send a PDF file to start asking questions about its content.";
    return message;
  } else {
    message = await ask(Body);
    return message;
  }
};

app.get("/", (req, res) => {
  res.send("Hello");
});

app.post("/incomingMessage", async (req, res) => {
  const { To, Body, From } = req.body;
  let message = "";

  if (req.body["MediaUrl0"] === undefined) {
    message = await handleIncomingMessage(req);
    sendMessage(message, To, From);
    return res.status(200);
  } else {
    message =
      "Please wait, it can take several seconds to process this document";
    sendMessage(message, To, From);
    // console.log(req.body["MediaUrl0"]);
    const wasDocumentSaved = await saveDocument(req.body["MediaUrl0"]);
    console.log(wasDocumentSaved);
    if (!wasDocumentSaved) {
      message = "Failed to save document";
      sendMessage(message, To, From);
      return res.status(200);
    }

    const wasEmbeddingsGenerated = await Embeddings();
    console.log(wasEmbeddingsGenerated);
    if (!wasEmbeddingsGenerated) {
      message = "Sorry could not process the document. Please try again later.";
      sendMessage(message, To, From);
      return res.status(200);
    }

    message = "Ready! Ask anything about the document";
    sendMessage(message, To, From);
    return res.status(200);
  }
});
