import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

mongoose.set("strictQuery", true);

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV !== "production",
      serverSelectionTimeoutMS: 10_000,
    });
    logger.info({ uri: redact(env.MONGODB_URI) }, "MongoDB connected");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    throw err;
  }
}

function redact(uri: string): string {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}
