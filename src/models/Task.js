const mongoose = require('mongoose');
const { TaskStatus } = require('../utils/constants');

const attachmentSchema = new mongoose.Schema({
  url: String,
  mimeType: String,
  size: Number,
  originalName: String
}, { _id: false });

const subTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  isCompleted: { type: Boolean, default: false },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO },
  attachments: [attachmentSchema],
  subtasks: [subTaskSchema]
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);