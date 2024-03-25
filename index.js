const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const fs = require("fs");
const path = require("path");
const ngrok = require("@ngrok/ngrok");
require("dotenv").config();
const { Embeddings } = require("./embeddings");
const { ask, resetChatHistory } = require("./interface");
let fileCount = 0;
let embeddingsDone = false;
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

// const saveDocument = async mediaURL => {
//   //pdf and doc as well maybe ??
//   try {
//     const fetch = (await import("node-fetch")).default;
//     const filepath = path.join(
//       __dirname,
//       "documents",
//       "document.pdf",
//       fileCount
//     );
//     return new Promise(async (resolve, reject) => {
//       await fetch(mediaURL)
//         .then(res => {
//           res.body.pipe(fs.createWriteStream(filepath));
//           res.body.on("end", () => resolve(true));
//         })
//         .catch(error => {
//           console.error(error);
//           resolve(false);
//         });
//     });
//   } catch (error) {
//     console.error(error);
//     return false;
//   }
// };

const deletePdf = directoryPath => {
  // Read the contents of the directory
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${directoryPath}:`, err);
      return;
    }

    // Iterate through each file in the directory
    files.forEach(file => {
      // Construct the full path of the file
      const filePath = path.join(directoryPath, file);

      // Delete the file
      fs.unlink(filePath, err => {
        if (err) {
          console.error(`Error deleting file ${filePath}:`, err);
        } else {
          console.log(`Deleted file: ${filePath}`);
        }
      });
    });
  });
};

const saveDocument = async mediaURL => {
  try {
    const response = await fetch(mediaURL);
    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`
      );
    }

    const filepath = path.join(
      __dirname,
      "documents",
      `document${fileCount}.pdf`
    );
    const fileStream = fs.createWriteStream(filepath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    return true;
  } catch (error) {
    console.error("Error saving document:", error);
    return false;
  }
};

const handleIncomingMessage = async req => {
  const { Body } = req.body;
  let message = "";

  if (Body.toLowerCase().includes("hello") && Body.length === 5) {
    message =
      "Hello! I'm DocuBot 🤖, your friendly PDF assistant.\nPlease send a PDF file to start asking questions about its content.";

    // reset chatHistory
    resetChatHistory();
    // reset fileCount and mebeddingsDone
    fileCount = 0;
    embeddingsDone = false;
    // delete pdfs
    deletePdf(path.join(__dirname, "documents"));
    // maybe a timeout or something for this stuff? (to do)

    return message;
  } else {
    // create embeddings here maybe instead of when saving pdf ?
    if (!embeddingsDone) {
      const embeddingsGenerated = await Embeddings();
      console.log(embeddingsGenerated);
      if (!embeddingsGenerated) {
        message =
          "Sorry could not process the document. Please try again later.";
        return message;
      } else {
        embeddingsDone = true;
      }
    }
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
      return res.status(500);
    }
    fileCount++;

    // const wasEmbeddingsGenerated = await Embeddings();
    // console.log(wasEmbeddingsGenerated);
    // if (!wasEmbeddingsGenerated) {
    //   message = "Sorry could not process the document. Please try again later.";
    //   sendMessage(message, To, From);
    //   return res.status(500);
    // }

    message = "Ask about the document! or send another document.";
    sendMessage(message, To, From);
    return res.status(200);
  }
});
