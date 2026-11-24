const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isTrashed: { type: Boolean, default: false },
    isShared: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    color: { type: String, enum: ["none", "rose", "sage", "sand", "sky"], default: "none" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  },
  { timestamps: true }
);

const noteModel = mongoose.model("note", noteSchema);

module.exports = { noteModel };
