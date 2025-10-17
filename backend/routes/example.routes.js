// Example Routes File
// This is a skeleton file demonstrating route structure

const express = require('express');
const router = express.Router();

// Import controller (when created)
// const exampleController = require('../controllers/example.controller');

// Example routes
router.get('/', (req, res) => {
  res.json({ message: 'Example GET route' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Example POST route', data: req.body });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Example GET by ID route', id: req.params.id });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Example PUT route', id: req.params.id, data: req.body });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Example DELETE route', id: req.params.id });
});

module.exports = router;
