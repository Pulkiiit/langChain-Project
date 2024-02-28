const { OpenAI } = require("langchain/llms/openai");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { RetrievalQAChain } = require("langchain/chains");
require("dotenv").config();

const model = new OpenAI({ modelName: "gpt-3.5-turbo" });

const ask = async question => {
  try {
    const vectorStore = await FaissStore.load(
      "embeddings",
      new OpenAIEmbeddings()
    );

    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
    const result = await chain.call({
      query: question,
    });

    console.log(result);
    return result.text;
  } catch (error) {
    console.error(error);
    return "AI model failed to retrieve information";
  }
};

module.exports = { ask };
