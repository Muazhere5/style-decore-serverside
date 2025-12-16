require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

/* ======================
   FIREBASE ADMIN SETUP
====================== */
const admin = require("firebase-admin");
const serviceAccount = require("./privateKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const port = process.env.PORT || 5000;

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());

/* ======================
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
   JWT MIDDLEWARE (CUSTOM)
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
   OPTIONAL: FIREBASE TOKEN VERIFY
====================== */
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    res.status(403).send({ message: "Forbidden" });
  }
};

/* ======================
   AUTH ROUTES
====================== */

// JWT issue (after Firebase login)
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

/* ======================
   SERVICES (PUBLIC)
====================== */
app.get("/services", async (req, res) => {
  const result = await servicesCollection.find().toArray();
  res.send(result);
});

app.get("/services/:id", async (req, res) => {
  const result = await servicesCollection.findOne({
    _id: new ObjectId(req.params.id),
  });
  res.send(result);
});

/* ======================
   ADMIN SERVICES
====================== */
app.post("/admin/services", verifyToken, async (req, res) => {
  const result = await servicesCollection.insertOne(req.body);
  res.send(result);
});

app.put("/admin/services/:id", verifyToken, async (req, res) => {
  const result = await servicesCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body }
  );
  res.send(result);
});

app.delete("/admin/services/:id", verifyToken, async (req, res) => {
  const result = await servicesCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });
  res.send(result);
});

/* ======================
   BOOKINGS
====================== */
app.post("/bookings", verifyToken, async (req, res) => {
  const result = await bookingsCollection.insertOne({
    ...req.body,
    status: "Assigned",
  });
  res.send(result);
});

app.get("/bookings/user/:email", verifyToken, async (req, res) => {
  const result = await bookingsCollection
    .find({ userEmail: req.params.email })
    .toArray();
  res.send(result);
});

app.patch("/decorator/status/:id", verifyToken, async (req, res) => {
  const result = await bookingsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: req.body.status } }
  );
  res.send(result);
});

/* ======================
   DECORATORS (PUBLIC)
====================== */
app.get("/decorators/top", async (req, res) => {
  const result = await usersCollection
    .find({ role: "decorator" })
    .limit(6)
    .toArray();

  res.send(result);
});

/* ======================
   STRIPE PAYMENT
====================== */
app.post("/create-payment-intent", verifyToken, async (req, res) => {
  const { price } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: price * 100,
    currency: "bdt",
    payment_method_types: ["card"],
  });

  res.send({ clientSecret: paymentIntent.client_secret });
});

app.post("/payments", verifyToken, async (req, res) => {
  const result = await paymentsCollection.insertOne(req.body);
  res.send(result);
});

app.get("/payments/user/:email", verifyToken, async (req, res) => {
  const result = await paymentsCollection
    .find({ email: req.params.email })
    .toArray();
  res.send(result);
});

/* ======================
   SERVER
====================== */
app.get("/", (req, res) => {
  res.send("StyleDecor Server Running");
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
