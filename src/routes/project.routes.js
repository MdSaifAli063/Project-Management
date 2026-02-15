const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  create, validateCreate, list, getOne, update, remove,
  membersList, addMember, updateMemberRole, removeMember, validateAddMember
} = require('../controllers/project.controller');

router.use(auth());

// /api/v1/projects/
router.get('/', list);
router.post('/', validateCreate, create);
router.get('/:projectId', getOne);
router.put('/:projectId', update);
router.delete('/:projectId', remove);

// Members
router.get('/:projectId/members', membersList);
router.post('/:projectId/members', validateAddMember, addMember);
router.put('/:projectId/members/:userId', updateMemberRole);
router.delete('/:projectId/members/:userId', removeMember);

module.exports = router;