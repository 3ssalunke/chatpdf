import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import { downloadFromS3 } from "./s3-server";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

export const getPineconeClient = () => {
  return new Pinecone({
    environment: process.env.PINECONEDB_ENV!,
    apiKey: process.env.PINECONEDB_ACCESS_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  let fileName;
  try {
    fileName = await downloadFromS3(fileKey);
  } catch (error) {
    console.error(error);
  }
  if (!fileName) throw new Error("could not download from s3");
  const loader = new PDFLoader(fileName);
  const pages = (await loader.load()) as PDFPage[];
  const documents = await Promise.all(pages.map(prepareDocument));
  const vectors = await Promise.all(documents.flat().map(embedDocument));
  const client = await getPineconeClient();
  const pineconeIndex = await client.index("chatpdf");
  const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
  await namespace.upsert(vectors);
  return documents[0];
}

async function embedDocument(doc: Document) {
  const embeddings = await getEmbeddings(doc.pageContent);
  const hash = md5(doc.pageContent);

  return {
    id: hash,
    values: embeddings,
    metadata: {
      text: doc.metadata.text,
      pageNumber: doc.metadata.pageNumber,
    },
  } as PineconeRecord;
}

const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace("/\n/g", "");
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
