const { OpenAI } = require("@langchain/openai");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { RetrievalQAChain } = require("langchain/chains");
require("dotenv").config();

const model = new OpenAI({ modelName: "gpt-3.5-turbo" });

const ask = async question => {
  try {
    //loading documents
    const vectorStore = await FaissStore.load(
      "embeddings",
      new OpenAIEmbeddings()
    );
    // tepmplate for prompt
    //structure for answer ???
    const template = `Given the following extracted parts of a long document and a question, create a final answer with references ("SOURCES"). If you don\'t know the answer, just say that you don\'t know. Don\'t try to make up an answer. ALWAYS return a "SOURCES" part in your answer.`;

    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());

    const result = await chain.invoke({
      query: question,
      template: template,
    });

    console.log(result);
    return result.text;
  } catch (error) {
    console.error(error);
    return "AI model failed to retrieve information";
  }
};

module.exports = { ask };
