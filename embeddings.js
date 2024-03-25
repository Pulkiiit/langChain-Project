const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { CharacterTextSplitter } = requiore("langchain/text_splitter");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const path = require("path");
require("dotenv").config();

const Embeddings = async () => {
  // loading the document
  // handle multiple documents

  try {
    // const loader = new PDFLoader(
    //   path.join(__dirname, "documents", "document.pdf")
    // );
    // const docs = await loader.load();

    const loader = new DirectoryLoader(path.join(__dirname, "documents"), {
      ".pdf": path => new PDFLoader(path),
    });

    const docs = await loader.load();

    //text splitting

    const splitter = new CharacterTextSplitter({
      chunkSize: 1024,
      chunkOverlap: 128,
    });

    const chunks = await splitter.splitText(docs);

    // embeddings

    const vectorStore = await FaissStore.fromDocuments(
      chunks,
      new OpenAIEmbeddings()
    );

    vectorStore.save("embeddings");

    console.log("Embeddings Created");

    return true;
  } catch (err) {
    console.log(err);

    return false;
  }
};

module.exports = { Embeddings };
