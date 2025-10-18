import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  images: [String]
});
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false }
});
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

const products = [
  {
    name: "Sample Phone A",
    description: "Sample phone description",
    price: 9999,
    category: "Mobiles",
    images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9"]
  },
  {
    name: "Sample Headphone B",
    description: "Wireless headphone sample",
    price: 1999,
    category: "Audio",
    images: ["https://images.unsplash.com/photo-1517260911792-9f4d0c7a0cc1"]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB for seeding");
    await Product.deleteMany({});
    await User.deleteMany({});
    await Product.insertMany(products);
    await User.create([
      { name: "Admin", email: "admin@workman.test", password: "Admin@1234", isAdmin: true },
      { name: "User", email: "user@workman.test", password: "User@1234", isAdmin: false }
    ]);
    console.log("Seed complete ✅");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}
seed();
