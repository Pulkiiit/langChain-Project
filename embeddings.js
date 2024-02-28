const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
// const pdf = require("pdf-parse");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const path = require("path");
require("dotenv").config();

const Embeddings = async () => {
  // split document ???

  try {
    const loader = new PDFLoader(
      path.join(__dirname, "documents", "document.pdf")
    );
    const docs = await loader.load();
    // let dataBuffer = fs.readFileSync(path.join(__dirname,"documents","document.pdf"));

    // pdf(dataBuffer)
    //   .then(function (data) {
    //     // use data
    //   })
    //   .catch(function (error) {
    //     // handle exceptions
    //   });

    const vectorStore = await FaissStore.fromDocuments(
      docs,
      new OpenAIEmbeddings()
    );
    vectorStore.save();
    console.log("Embeddings Created");
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

module.exports = { Embeddings };
