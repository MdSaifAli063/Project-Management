const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const upload = require("../models/upload");
const { TaskStatus, Roles } = require("../utils/constants");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");

async function getProjectRole(projectId, req) {
  // system admin automatically considered project admin-level
  if (req.user && req.user.role === Roles.ADMIN) {
    return { role: Roles.ADMIN };
  }
  const project = await Project.findById(projectId).lean();
  if (!project) return null;
  const mem = project.members.find(
    (m) => m.user.toString() === req.user.userId.toString(),
  );
  return mem ? { role: mem.role } : null;
}

exports.validateCreateTask = [
  param("projectId").isMongoId(),
  body("title").trim().notEmpty(),
  body("description").optional().isString(),
  body("assignee").optional().isMongoId(),
  validate,
];

exports.listTasks = async (req, res, next) => {
  try {
    const role = await getProjectRole(req.params.projectId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    const tasks = await Task.find({ project: req.params.projectId })
      .populate("assignee", "name email")
      .lean();
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
};

exports.createTask = [
  upload.array("attachments", 5),
  async (req, res, next) => {
    try {
      const pr = await getProjectRole(req.params.projectId, req);
      if (!pr)
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      if (![Roles.ADMIN, Roles.PROJECT_ADMIN].includes(pr.role))
        return res.status(403).json({ success: false, message: "Forbidden" });

      const { title, description, assignee } = req.body;
      const attachments = (req.files || []).map((f) => ({
        url: `/images/uploads/${f.filename}`,
        mimeType: f.mimetype,
        size: f.size,
        originalName: f.originalname,
      }));
      const task = await Task.create({
        project: req.params.projectId,
        title,
        description,
        assignee: assignee || null,
        attachments,
      });
      res.status(201).json({ success: true, task });
    } catch (err) {
      next(err);
    }
  },
];

exports.getTask = async (req, res, next) => {
  try {
    const role = await getProjectRole(req.params.projectId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    const task = await Task.findOne({
      _id: req.params.taskId,
      project: req.params.projectId,
    })
      .populate("assignee", "name email")
      .lean();
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = [
  upload.array("attachments", 5),
  async (req, res, next) => {
    try {
      const pr = await getProjectRole(req.params.projectId, req);
      if (!pr)
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      if (![Roles.ADMIN, Roles.PROJECT_ADMIN].includes(pr.role))
        return res.status(403).json({ success: false, message: "Forbidden" });

      const { title, description, assignee, status } = req.body;
      const set = {};
      if (title) set.title = title;
      if (description !== undefined) set.description = description;
      if (assignee !== undefined) set.assignee = assignee || null;
      if (status && Object.values(TaskStatus).includes(status))
        set.status = status;

      const newFiles = (req.files || []).map((f) => ({
        url: `/images/uploads/${f.filename}`,
        mimeType: f.mimetype,
        size: f.size,
        originalName: f.originalname,
      }));

      const task = await Task.findOne({
        _id: req.params.taskId,
        project: req.params.projectId,
      });
      if (!task)
        return res
          .status(404)
          .json({ success: false, message: "Task not found" });

      if (newFiles.length) task.attachments.push(...newFiles);
      Object.assign(task, set);
      await task.save();

      res.json({ success: true, task });
    } catch (err) {
      next(err);
    }
  },
];

exports.deleteTask = async (req, res, next) => {
  try {
    const pr = await getProjectRole(req.params.projectId, req);
    if (!pr)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    if (![Roles.ADMIN, Roles.PROJECT_ADMIN].includes(pr.role))
      return res.status(403).json({ success: false, message: "Forbidden" });

    const deleted = await Task.findOneAndDelete({
      _id: req.params.taskId,
      project: req.params.projectId,
    });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    next(err);
  }
};

exports.createSubtask = async (req, res, next) => {
  try {
    const pr = await getProjectRole(req.params.projectId, req);
    if (!pr)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    if (![Roles.ADMIN, Roles.PROJECT_ADMIN].includes(pr.role))
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { title } = req.body;
    if (!title)
      return res
        .status(400)
        .json({ success: false, message: "Title required" });

    const task = await Task.findOne({
      _id: req.params.taskId,
      project: req.params.projectId,
    });
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    task.subtasks.push({ title });
    await task.save();
    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

exports.updateSubtask = async (req, res, next) => {
  try {
    const role = await getProjectRoleBySubtask(req.params.subTaskId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Subtask not found" });

    const { title, isCompleted } = req.body;
    // restrict renaming to admin/project_admin
    if (
      title !== undefined &&
      ![Roles.ADMIN, Roles.PROJECT_ADMIN].includes(role.role)
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const task = await Task.findOne({ "subtasks._id": req.params.subTaskId });
    const st = task.subtasks.id(req.params.subTaskId);
    if (title !== undefined) st.title = title;

    if (isCompleted !== undefined) {
      st.isCompleted = !!isCompleted;
      st.completedBy = st.isCompleted ? req.user.userId : null;
      st.completedAt = st.isCompleted ? new Date() : null;
    }
    await task.save();
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

async function getProjectRoleBySubtask(subTaskId, req) {
  // global admins can operate on any subtask
  if (req.user && req.user.role === Roles.ADMIN) {
    return { role: Roles.ADMIN };
  }
  const task = await Task.findOne({ "subtasks._id": subTaskId }).populate(
    "project",
  );
  if (!task) return null;
  const prj = await Project.findById(task.project);
  const mem = prj.members.find(
    (m) => m.user.toString() === req.user.userId.toString(),
  );
  if (!mem) return null;
  return { role: mem.role };
}

exports.deleteSubtask = async (req, res, next) => {
  try {
    const role = await getProjectRoleBySubtask(req.params.subTaskId, req);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Subtask not found" });
    if (![Roles.ADMIN, Roles.PROJECT_ADMIN].includes(role.role))
      return res.status(403).json({ success: false, message: "Forbidden" });

    const task = await Task.findOne({ "subtasks._id": req.params.subTaskId });
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    task.subtasks = task.subtasks.filter(
      (st) => st._id.toString() !== req.params.subTaskId,
    );
    await task.save();
    res.json({ success: true, message: "Subtask deleted" });
  } catch (err) {
    next(err);
  }
};
