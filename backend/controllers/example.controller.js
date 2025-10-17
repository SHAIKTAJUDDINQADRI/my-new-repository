// Example Controller File
// This is a skeleton file demonstrating controller structure

// Import model (when created)
// const ExampleModel = require('../models/example.model');

// Controller methods
const exampleController = {
  // GET all items
  getAll: async (req, res) => {
    try {
      // const items = await ExampleModel.findAll();
      res.status(200).json({ 
        success: true, 
        message: 'Retrieved all items',
        // data: items 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving items', 
        error: error.message 
      });
    }
  },

  // GET item by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      // const item = await ExampleModel.findById(id);
      res.status(200).json({ 
        success: true, 
        message: `Retrieved item with id: ${id}`,
        // data: item 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving item', 
        error: error.message 
      });
    }
  },

  // POST create new item
  create: async (req, res) => {
    try {
      const data = req.body;
      // const newItem = await ExampleModel.create(data);
      res.status(201).json({ 
        success: true, 
        message: 'Item created successfully',
        // data: newItem 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error creating item', 
        error: error.message 
      });
    }
  },

  // PUT update item
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      // const updatedItem = await ExampleModel.update(id, data);
      res.status(200).json({ 
        success: true, 
        message: 'Item updated successfully',
        // data: updatedItem 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error updating item', 
        error: error.message 
      });
    }
  },

  // DELETE item
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      // await ExampleModel.delete(id);
      res.status(200).json({ 
        success: true, 
        message: 'Item deleted successfully' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting item', 
        error: error.message 
      });
    }
  }
};

module.exports = exampleController;
