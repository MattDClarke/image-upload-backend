import "dotenv/config";
import express from "express";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import Multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new Multer.memoryStorage();
const upload = Multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

async function handleUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
  });
  return res;
}


const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.post("/upload", (req, res, next) => {
  upload.single("my_file")(req, res, async (err) => {
    if (err && err instanceof Multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "File too large. Max 20MB" });
      }
      return res.status(400).json({ message: err.message });
    }
    if (err) return next(err);

    try {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const cldRes = await handleUpload(dataURI);
      return res.json(cldRes);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: error.message });
    }
  });
});


const port = 3000;
app.listen(port, () => {
  console.log(`Server Listening on ${port}`);
});
