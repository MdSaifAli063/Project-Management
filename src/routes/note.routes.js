const router = require('express').Router();
const auth = require('../middleware/auth');
const { listNotes, createNote, getNote, updateNote, deleteNote } = require('../controllers/note.controller');

router.use(auth());

// /api/v1/notes/:projectId
router.get('/:projectId', listNotes);
router.post('/:projectId', createNote);
router.get('/:projectId/n/:noteId', getNote);
router.put('/:projectId/n/:noteId', updateNote);
router.delete('/:projectId/n/:noteId', deleteNote);

module.exports = router;