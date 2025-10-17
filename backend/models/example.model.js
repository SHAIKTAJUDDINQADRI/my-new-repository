// Example Model File
// This is a skeleton file demonstrating model structure

// Example using a simple class-based model
class ExampleModel {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt || new Date();
  }

  // Add your model methods here
  static async findAll() {
    // Implementation for fetching all records
  }

  static async findById(id) {
    // Implementation for fetching by ID
  }

  async save() {
    // Implementation for saving/updating
  }

  async delete() {
    // Implementation for deleting
  }
}

module.exports = ExampleModel;
