const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

module.exports = router;