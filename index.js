require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;


/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());

MONGODB CONNECTION
====================== */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@project00.3ikpony.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let usersCollection;
let servicesCollection;
let bookingsCollection;
let paymentsCollection;

async function connectDB() {
  await client.connect();
  const db = client.db("styleDecorDB");

  usersCollection = db.collection("users");
  servicesCollection = db.collection("services");
  bookingsCollection = db.collection("bookings");
  paymentsCollection = db.collection("payments");

  console.log("✅ MongoDB Connected");
}
connectDB();

/* ======================
   JWT MIDDLEWARE
====================== */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: "Forbidden" });
    req.decoded = decoded;
    next();
  });
};

/* ======================
   AUTH ROUTES
====================== */

// JWT issue
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  res.send({ token });
});

// Save user
app.post("/users", async (req, res) => {
  const user = req.body;
  const exists = await usersCollection.findOne({ email: user.email });
  if (exists) return res.send({ message: "User exists" });
  const result = await usersCollection.insertOne(user);
  res.send(result);
});

// Get user role
app.get("/users/role/:email", verifyToken, async (req, res) => {
  const user = await usersCollection.findOne({ email: req.params.email });
  res.send({ role: user?.role || "user" });
});