// models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String }
});


const Category = mongoose.model('Category', categorySchema);

module.exports = Category;