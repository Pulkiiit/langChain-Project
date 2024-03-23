const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { CharacterTextSplitter } = requiore("langchain/text_splitter");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const path = require("path");
require("dotenv").config();

const Embeddings = async () => {
  // loading the document

  try {
    const loader = new PDFLoader(
      path.join(__dirname, "documents", "document.pdf")
    );
    const docs = await loader.load();

    //text splitting

    const splitter = new CharacterTextSplitter({
      chunkSize: 1024,
      chunkOverlap: 128,
    });

    const chunks = await splitter.splitText(docs);

    // embeddings

    // check if already exists then update else create (to do)

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
