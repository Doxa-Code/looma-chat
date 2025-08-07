import { MDocument } from "@mastra/rag";
import pdf2md from "@opendocsg/pdf2md";
import { embedMany } from "ai";
import * as fs from "node:fs";
import path from "node:path";
import { pinecone, pineconeVector } from "../config/vectors/pinecone-vector";
import { azureEmbeddings } from "../config/llms/azure";
import { SettingsRepository } from "../../repositories/settings-repository";

const files = ["docs/faq.md", "docs/products.md"];

const indexName = "looma-knowledge-base";
const settingsRepository = SettingsRepository.instance();

const settings = await settingsRepository.retrieveSettingsByWorkspaceId("");

await pinecone
  .index(indexName)
  .deleteNamespace(settings?.vectorNamespace ?? "")
  .catch(() => {});

await pineconeVector.createIndex({
  indexName,
  dimension: 1536,
});

await Promise.all(
  files.map(async (filePath) => {
    const file = fs.readFileSync(path.join(__dirname, filePath));
    const doc = MDocument.fromMarkdown(file.toString());
    const chunks = await doc.chunk({
      strategy: "markdown",
      size: 400,
      overlap: 50,
      separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""],
    });
    const { embeddings } = await embedMany({
      model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
        dimensions: 1536,
      }),
      values: chunks.map((chunk) => chunk.text),
    });
    await pineconeVector.upsert({
      indexName,
      vectors: embeddings,
      metadata: chunks.map((chunk) => ({
        text: chunk.text,
      })),
    });
  })
);

const complianceFiles = fs.readdirSync(path.join(__dirname, "docs/compliance"));

await Promise.all(
  complianceFiles.map(async (file) => {
    const filePath = path.join(__dirname, "docs/compliance", file);
    const fileContent = fs.readFileSync(filePath);
    const md = await pdf2md(fileContent);
    const doc = MDocument.fromMarkdown(md);
    const chunks = await doc.chunk({
      strategy: "markdown",
      size: 1200,
      overlap: 250,
      separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""],
    });
    const { embeddings } = await embedMany({
      model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
        dimensions: 1536,
      }),
      values: chunks.map((chunk) => chunk.text),
    });
    await pineconeVector.upsert({
      indexName,
      vectors: embeddings,
      metadata: chunks.map((chunk) => ({
        text: chunk.text,
      })),
    });
  })
);
