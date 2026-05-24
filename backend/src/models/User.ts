import { Schema, model, InferSchemaType, Types } from "mongoose";

const skillSchema = new Schema(
  {
    skill: { type: String, required: true },
    level: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false },
);

const profileSchema = new Schema(
  {
    currentSkills: { type: [skillSchema], default: [] },
    targetRole: { type: String, default: "" },
    timelineWeeks: { type: Number, default: 12 },
    weeklyHours: { type: Number, default: 10 },
    background: { type: String, default: "" },
    profileEmbedding: { type: [Number], default: [] },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    handle: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    githubUsername: { type: String, default: "" },
    githubAccessToken: { type: String, default: "" }, // encrypted at rest TODO
    timezone: { type: String, default: "Asia/Kolkata" },
    plan: { type: String, enum: ["free", "pro", "career"], default: "free" },
    profile: { type: profileSchema, default: () => ({}) },
    onboarded: { type: Boolean, default: false },
    streak: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },

    // Guest mode — admin-controlled, lets judges try the product without GitHub OAuth.
    isGuest: { type: Boolean, default: false, index: true },
    guestExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ isGuest: 1, createdAt: 1 });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const User = model("User", userSchema);
