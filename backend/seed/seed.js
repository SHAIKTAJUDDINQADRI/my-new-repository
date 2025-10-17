require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myshop';

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400'
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400'
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400'
  }
];

const sampleProducts = (sellerId) => [
  {
    name: 'Wireless Headphones',
    description: 'Comfortable over-ear wireless headphones with noise cancellation and up to 30 hours battery life.',
    price: 199.99,
    category: 'Electronics',
    brand: 'SoundMax',
    images: [
      'https://images.unsplash.com/photo-1518443895914-6c1903d88fe8?w=800',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800'
    ],
    stock: 50,
    ratings: { average: 4.5, count: 12 },
    tags: ['audio', 'wireless', 'noise-cancelling'],
    seller: sellerId
  },
  {
    name: 'Smart Watch',
    description: 'Fitness-focused smartwatch with heart rate, GPS, and 7-day battery life.',
    price: 149.99,
    category: 'Electronics',
    brand: 'FitTime',
    images: [
      'https://images.unsplash.com/photo-1518443895914-6c1903d88fe8?w=800',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'
    ],
    stock: 80,
    ratings: { average: 4.2, count: 8 },
    tags: ['fitness', 'wearable'],
    seller: sellerId
  },
  {
    name: 'Classic Cotton T-Shirt',
    description: 'Soft, breathable cotton t-shirt available in multiple colors and sizes.',
    price: 19.99,
    category: 'Clothing',
    brand: 'CottonCo',
    images: [
      'https://images.unsplash.com/photo-1520975922284-9e0ce8273bb9?w=800',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800'
    ],
    stock: 200,
    ratings: { average: 4.0, count: 20 },
    tags: ['apparel', 'cotton'],
    seller: sellerId
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Insulated stainless steel water bottle keeps drinks cold for 24h or hot for 12h.',
    price: 24.99,
    category: 'Sports',
    brand: 'HydroFlow',
    images: [
      'https://images.unsplash.com/photo-1526404951721-1789d92d09b1?w=800',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800'
    ],
    stock: 120,
    ratings: { average: 4.6, count: 33 },
    tags: ['hydration', 'outdoors'],
    seller: sellerId
  },
  {
    name: 'Modern Table Lamp',
    description: 'Minimalist table lamp with warm LED light ideal for bedrooms and desks.',
    price: 39.99,
    category: 'Home & Garden',
    brand: 'Lumo',
    images: [
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800',
      'https://images.unsplash.com/photo-1503602642458-232111445657?w=800'
    ],
    stock: 60,
    ratings: { average: 4.3, count: 14 },
    tags: ['lighting', 'decor'],
    seller: sellerId
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Clean collections
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    // Create users
    const usersWithHashedPasswords = await Promise.all(
      sampleUsers.map(async (u) => ({
        ...u,
        password: await bcrypt.hash(u.password, 10)
      }))
    );

    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    const adminUser = createdUsers.find(u => u.role === 'admin');

    // Create products using admin as seller
    const products = await Product.insertMany(sampleProducts(adminUser._id));

    // Create a sample order for John using 2 products
    const john = createdUsers.find(u => u.email === 'john@example.com');
    const orderItems = products.slice(0, 2).map(p => ({
      product: p._id,
      name: p.name,
      quantity: 1,
      image: p.images[0],
      price: p.price
    }));

    const itemsPrice = orderItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const taxPrice = +(itemsPrice * 0.18).toFixed(2);
    const shippingPrice = itemsPrice > 500 ? 0 : 50;
    const totalPrice = +(itemsPrice + taxPrice + shippingPrice).toFixed(2);

    await Order.create({
      user: john._id,
      orderItems,
      shippingAddress: {
        street: '123 Main St',
        city: 'Mumbai',
        state: 'MH',
        zipCode: '400001',
        country: 'India',
        phone: '+91 90000 00000'
      },
      paymentMethod: 'razorpay',
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid: false,
      orderStatus: 'pending'
    });

    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
