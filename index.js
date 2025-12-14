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
