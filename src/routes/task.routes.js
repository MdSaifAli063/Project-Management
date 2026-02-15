const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  listTasks, createTask, getTask, updateTask, deleteTask,
  createSubtask, updateSubtask, deleteSubtask
} = require('../controllers/task.controller');

router.use(auth());

// /api/v1/tasks/:projectId
router.get('/:projectId', listTasks);
router.post('/:projectId', createTask);
router.get('/:projectId/t/:taskId', getTask);
router.put('/:projectId/t/:taskId', updateTask);
router.delete('/:projectId/t/:taskId', deleteTask);

// Subtasks
router.post('/:projectId/t/:taskId/subtasks', createSubtask);
router.put('/st/:subTaskId', updateSubtask);
router.delete('/st/:subTaskId', deleteSubtask);

module.exports = router;