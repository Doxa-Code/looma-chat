import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export const sendFile = async (file: File, salt: string) => {
  const bucketName = "looma-app";
  const keyName = `${salt}-${Date.now()}-${file.name}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: keyName,
    Body: buffer,
    ContentType: file?.type,
  });

  await s3Client.send(command);
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: keyName,
  });

  const signedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 900,
  });

  return signedUrl;
};
