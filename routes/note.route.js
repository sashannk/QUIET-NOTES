const express = require("express");
const { noteModel } = require("../model/note.model");

const noteRouter = express.Router();
const noteColors = ["none", "rose", "sage", "sand", "sky"];

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))];
}

noteRouter.get("/", async (req, res) => {
  const view = req.query.view || "active";
  const filter = { owner: req.userId };

  if (view === "active") {
    filter.isTrashed = { $ne: true };
    filter.isArchived = { $ne: true };
  } else if (view === "archived") {
    filter.isTrashed = { $ne: true };
    filter.isArchived = true;
  } else if (view === "trash") {
    filter.isTrashed = true;
  } else {
    return res.status(400).send({ msg: "Choose active, archived, or trash notes" });
  }

  if (typeof req.query.tag === "string" && req.query.tag) filter.tags = req.query.tag;

  try {
    const notes = await noteModel.find(filter).sort({ isPinned: -1, updatedAt: -1 });
    res.send(notes);
  } catch (error) {
    console.error("Could not load notes:", error.message);
    res.status(500).send({ msg: "Could not load notes" });
  }
});

noteRouter.post("/", async (req, res) => {
  const { title, content = "", tags = [], color = "none" } = req.body;
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).send({ msg: "A note title is required" });
  }

  try {
    const note = await noteModel.create({
      title: title.trim(), content, tags: cleanTags(tags),
      color: noteColors.includes(color) ? color : "none", owner: req.userId
    });
    res.status(201).send(note);
  } catch (error) {
    console.error("Could not create note:", error.message);
    res.status(500).send({ msg: "Could not create note" });
  }
});

noteRouter.put("/:id", async (req, res) => {
  const { title, content = "", tags = [], color = "none" } = req.body;
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).send({ msg: "A note title is required" });
  }

  try {
    const note = await noteModel.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { title: title.trim(), content, tags: cleanTags(tags), color: noteColors.includes(color) ? color : "none" },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).send({ msg: "Note not found" });
    res.send(note);
  } catch (error) {
    console.error("Could not update note:", error.message);
    res.status(400).send({ msg: "Could not update note" });
  }
});

noteRouter.patch("/:id", async (req, res) => {
  const updates = {};
  for (const field of ["isPinned", "isArchived", "isTrashed", "isShared"]) {
    if (typeof req.body[field] === "boolean") updates[field] = req.body[field];
  }
  if (Array.isArray(req.body.tags)) updates.tags = cleanTags(req.body.tags);
  if (Object.keys(updates).length === 0) {
    return res.status(400).send({ msg: "Provide a note status or tags to update" });
  }

  try {
    const note = await noteModel.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId }, updates,
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).send({ msg: "Note not found" });
    res.send(note);
  } catch (error) {
    console.error("Could not update note:", error.message);
    res.status(400).send({ msg: "Could not update note" });
  }
});

noteRouter.post("/:id/restore", async (req, res) => {
  try {
    const note = await noteModel.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId, isTrashed: true },
      { isTrashed: false },
      { new: true }
    );
    if (!note) return res.status(404).send({ msg: "Trashed note not found" });
    res.send(note);
  } catch (error) {
    console.error("Could not restore note:", error.message);
    res.status(400).send({ msg: "Could not restore note" });
  }
});

noteRouter.delete("/:id", async (req, res) => {
  try {
    const note = await noteModel.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { isTrashed: true },
      { new: true }
    );
    if (!note) return res.status(404).send({ msg: "Note not found" });
    res.send({ msg: "Note moved to trash" });
  } catch (error) {
    console.error("Could not move note to trash:", error.message);
    res.status(400).send({ msg: "Could not move note to trash" });
  }
});

module.exports = { noteRouter };
