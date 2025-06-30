import * as Minio from "minio";

const client = new Minio.Client({
  endPoint: "",
  useSSL: true,
  accessKey: "",
  secretKey: "",
});

const exists = await client.bucketExists("notes");
console.log("bucket exists:", exists);
