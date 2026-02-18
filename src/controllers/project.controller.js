const Project = require("../models/Project");
const User = require("../models/User");
const { Roles } = require("../utils/constants");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");

async function isProjectMember(projectId, userId, userRole) {
  // system admins implicitly have access to every project
  if (userRole === Roles.ADMIN) {
    return { project: null, role: Roles.ADMIN };
  }
  const project = await Project.findById(projectId).lean();
  if (!project) return null;
  const mem = project.members.find(
    (m) => m.user.toString() === userId.toString(),
  );
  return mem ? { project, role: mem.role } : null;
}

exports.validateCreate = [
  body("name").trim().notEmpty(),
  body("description").optional().isString().isLength({ max: 2000 }),
  validate,
];

exports.create = async (req, res, next) => {
  try {
    // only system administrators can create new projects
    const me = await User.findById(req.user.userId);
    if (me.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { name, description } = req.body;
    const project = await Project.create({
      name,
      description,
      members: [{ user: me._id, role: Roles.ADMIN }],
      createdBy: me._id,
    });
    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    let projects;
    if (req.user.role === Roles.ADMIN) {
      projects = await Project.find({})
        .select("name description members")
        .lean();
    } else {
      projects = await Project.find({ "members.user": req.user.userId })
        .select("name description members")
        .lean();
    }

    const formatted = projects.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      memberCount: p.members.length,
    }));
    res.json({ success: true, projects: formatted });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const access = await isProjectMember(
      req.params.projectId,
      req.user.userId,
      req.user.role,
    );
    if (!access)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    const project = await Project.findById(req.params.projectId)
      .populate("members.user", "name email role")
      .lean();
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

exports.validateUpdate = [
  param("projectId").isMongoId(),
  body("name").optional().trim().notEmpty(),
  body("description").optional().isString(),
  validate,
];

exports.update = async (req, res, next) => {
  try {
    // Admin only
    const me = await User.findById(req.user.userId);
    if (me.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      req.body,
      { new: true },
    );
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.userId);
    if (me.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });
    const project = await Project.findByIdAndDelete(req.params.projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    next(err);
  }
};

exports.membersList = async (req, res, next) => {
  try {
    const access = await isProjectMember(
      req.params.projectId,
      req.user.userId,
      req.user.role,
    );
    if (!access)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    const project = await Project.findById(req.params.projectId)
      .populate("members.user", "name email role")
      .lean();
    res.json({ success: true, members: project.members });
  } catch (err) {
    next(err);
  }
};

exports.validateAddMember = [
  param("projectId").isMongoId(),
  body("email").isEmail(),
  body("role").isIn(Object.values(Roles)),
  validate,
];

exports.addMember = async (req, res, next) => {
  try {
    // Admin only
    const me = await User.findById(req.user.userId);
    if (me.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { email, role } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const project = await Project.findById(req.params.projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    const exists = project.members.find(
      (m) => m.user.toString() === user._id.toString(),
    );
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "User already a member" });

    project.members.push({ user: user._id, role });
    await project.save();

    res.status(201).json({ success: true, message: "Member added" });
  } catch (err) {
    next(err);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.userId);
    if (me.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { projectId, userId } = req.params;
    const { role } = req.body;
    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    const member = project.members.find((m) => m.user.toString() === userId);
    if (!member)
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });

    member.role = role;
    await project.save();
    res.json({ success: true, message: "Member role updated" });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.userId);
    if (me.role !== Roles.ADMIN)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { projectId, userId } = req.params;
    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    const before = project.members.length;
    project.members = project.members.filter(
      (m) => m.user.toString() !== userId,
    );
    if (project.members.length === before)
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });

    await project.save();
    res.json({ success: true, message: "Member removed" });
  } catch (err) {
    next(err);
  }
};
