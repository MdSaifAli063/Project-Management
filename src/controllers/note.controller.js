const Note = require("../models/Note");
const Project = require("../models/Project");
const { Roles } = require("../utils/constants");

// determines a user's role for a given project ID. If the caller is a global system
// admin (`req.user.role === Roles.ADMIN`) we treat them as having admin privileges even
// if they are not explicitly listed in `project.members`. This ensures the admin user can
// view and manage any project as per the permission matrix.
async function projectRole(projectId, req) {
  // global admin shortcut
  if (req.user && req.user.role === Roles.ADMIN) {
    return Roles.ADMIN;
  }

  const prj = await Project.findById(projectId).lean();
  if (!prj) return null;
  const mem = prj.members.find(
    (m) => m.user.toString() === req.user.userId.toString(),
  );
  if (!mem) return null;
  return mem.role;
}

exports.listNotes = async (req, res, next) => {
  try {
    // projectRole handles global admins and members
    const role = await projectRole(req.params.projectId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    const notes = await Note.find({ project: req.params.projectId }).lean();
    res.json({ success: true, notes });
  } catch (err) {
    next(err);
  }
};

exports.createNote = async (req, res, next) => {
  try {
    const role = await projectRole(req.params.projectId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    // only global admins may create notes according to the feature matrix
    if (req.user.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { title, content } = req.body;
    if (!title || !title.trim())
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });

    const note = await Note.create({
      project: req.params.projectId,
      title: title.trim(),
      content: content ? content.trim() : "",
      createdBy: req.user.userId,
    });
    res.status(201).json({ success: true, note });
  } catch (err) {
    next(err);
  }
};

exports.getNote = async (req, res, next) => {
  try {
    const role = await projectRole(req.params.projectId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    const note = await Note.findOne({
      _id: req.params.noteId,
      project: req.params.projectId,
    }).lean();
    if (!note)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, note });
  } catch (err) {
    next(err);
  }
};

exports.updateNote = async (req, res, next) => {
  try {
    const role = await projectRole(req.params.projectId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    // only system admins may update notes
    if (req.user.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const note = await Note.findOneAndUpdate(
      { _id: req.params.noteId, project: req.params.projectId },
      req.body,
      { new: true },
    );
    if (!note)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, note });
  } catch (err) {
    next(err);
  }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const role = await projectRole(req.params.projectId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    // only system admins may delete notes
    if (req.user.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const n = await Note.findOneAndDelete({
      _id: req.params.noteId,
      project: req.params.projectId,
    });
    if (!n)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    next(err);
  }
};
