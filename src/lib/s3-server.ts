import { S3 } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

export async function downloadFromS3(fileKey: string): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    try {
      const s3 = new S3({
        region: process.env.NEXT_PUBLIC_S3_AWS_REGION,
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
        },
      });

      const params = {
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
        Key: fileKey,
      };

      const obj = await s3.getObject(params);
      const fileName = path.join(
        __dirname,
        "..",
        "..",
        `/tmp/elliott${Date.now().toString()}.pdf`
      );
      const directoryPath = path.dirname(fileName);
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
      }

      if (obj.Body instanceof require("stream").Readable) {
        const file = fs.createWriteStream(fileName);
        file.on("open", () => {
          //@ts-ignore
          obj.Body?.pipe(file).on("finish", () => {
            return resolve(fileName);
          });
        });
      } else {
        return reject(new Error("error in fetching s3 object"));
      }
    } catch (error) {
      return reject(error);
    }
  });
}
