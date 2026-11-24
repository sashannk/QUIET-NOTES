const express = require("express");
const { noteModel } = require("../model/note.model");

const communityRouter = express.Router();

communityRouter.get("/", async (_req, res) => {
  try {
    const sharedNotes = await noteModel
      .find({ isShared: true, isTrashed: { $ne: true }, isArchived: { $ne: true } })
      .select("title content tags color updatedAt owner")
      .populate("owner", "name")
      .sort({ updatedAt: -1 });

    res.send(sharedNotes.map((note) => ({
      _id: note._id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      color: note.color,
      updatedAt: note.updatedAt,
      author: { name: note.owner?.name || "Anonymous" },
    })));
  } catch (error) {
    console.error("Could not load community notes:", error.message);
    res.status(500).send({ msg: "Could not load community notes" });
  }
});

module.exports = { communityRouter };
