import * as Sentry from "@sentry/node";
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

app.use(cors(
  {
    origin: "http://localhost:5173",
    // Allow Sentry distributed tracing headers
    allowedHeaders: ["Content-Type", "sentry-trace", "baggage"],
    exposedHeaders: ["sentry-trace", "baggage"],
  }
));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.post("/upload", (req, res, next) => {
  upload.single("my_file")(req, res, async (err) => {
    if (err && err instanceof Multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        err.statusCode = 413;
        err.message = "File too large. Max 20MB";
        return next(err);
      }
      err.statusCode = 400;
      return next(err);
    }
    if (err) return next(err);

    try {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const cldRes = await handleUpload(dataURI);
      return res.json(cldRes);
    } catch (error) {
      console.log(error);
      return next(error);
    }
  });
});



app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// Analytics API endpoint - calculates conversion rate
// Realistic use case: Marketing dashboard tracking campaign performance
// Error occurs when visitors is 0 (race condition, data sync issue, or misconfiguration)
app.post("/api/calculate-conversion-rate", (req, res, next) => {
  try {
    const { conversions, visitors } = req.body;

    // Validate that visitors is not zero
    // Simulates real-world scenario where conversion data arrives before visitor tracking
    if (visitors === 0) {
      throw new Error('Cannot calculate conversion rate: visitor count is zero. This may indicate a data synchronization issue or tracking misconfiguration.');
    }

    const conversionRate = (conversions / visitors) * 100;

    res.json({
      conversions,
      visitors,
      conversionRate: conversionRate.toFixed(2),
      message: `Conversion rate: ${conversionRate.toFixed(2)}%`
    });
  } catch (error) {
    next(error);
  }
});

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  const status = err.statusCode || err.status || 500;
  res.status(status);

  // res.end((res.sentry || "") + "\n");
  return res.json({ message: err.message });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server Listening on ${port}`);
});
