import mongoose, { Schema } from "mongoose";
const model = (name: string, schema: Schema, collection?: string) =>
  mongoose.models[name] ||
  mongoose.model(name, schema, collection || `portfolio_${name.toLowerCase()}`);
export const User = model(
  "AdminUser",
  new Schema(
    {
      name: String,
      email: { type: String, unique: true, required: true },
      passwordHash: { type: String, required: true, select: false },
      mobile: String,
      active: { type: Boolean, default: true },
      mustChangePassword: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);
export const Session = model(
  "AuthSession",
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
      refreshHash: { type: String, required: true },
      expiresAt: { type: Date, required: true, index: { expires: 0 } },
      revoked: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);
const entry = new Schema(
  {
    kind: { type: String, required: true },
    slug: { type: String, required: true },
    title: String,
    order: Number,
    visible: Boolean,
    status: String,
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);
entry.index({ kind: 1, slug: 1 }, { unique: true });
entry.index({ kind: 1, status: 1, visible: 1, order: 1 });
export const Content = model("Content", entry);
export const Site = model(
  "SiteSettings",
  new Schema(
    { key: { type: String, unique: true }, data: Schema.Types.Mixed },
    { timestamps: true },
  ),
);
export const Message = model(
  "ContactMessage",
  new Schema(
    {
      name: String,
      email: String,
      service: String,
      message: String,
      read: { type: Boolean, default: false },
      archived: { type: Boolean, default: false },
      notification: { type: String, default: "pending" },
    },
    { timestamps: true },
  ),
);
export const Media = model(
  "MediaAsset",
  new Schema(
    {
      publicId: { type: String, unique: true },
      url: String,
      resourceType: String,
      format: String,
      bytes: Number,
      width: Number,
      height: Number,
      alt: String,
    },
    { timestamps: true },
  ),
);
export const Audit = model(
  "AuditLog",
  new Schema(
    {
      actor: String,
      action: String,
      entity: String,
      entityId: String,
      fields: [String],
    },
    { timestamps: true },
  ),
);
const rate = new Schema({
  _id: String,
  count: Number,
  expiresAt: { type: Date, index: { expires: 0 } },
});
export const Rate = model(
  "RateLimit",
  rate,
  process.env.RATE_LIMIT_COLLECTION || "rate_limits",
);
export const UploadIntent = model(
  "UploadIntent",
  new Schema({
    publicId: { type: String, unique: true },
    ownerId: String,
    completed: { type: Boolean, default: false },
    expiresAt: { type: Date, index: { expires: 0 } },
  }),
);
