require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Package = require("./models/Package");
const Booking = require("./models/Booking");

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Travel Agency Management System API is running" });
});

function makeId(prefix) {
  return `${prefix}-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
}

function sendError(res, error, status = 400) {
  if (error.code === 11000) {
    return res.status(409).json({ message: "That ID already exists. Please use a unique ID." });
  }
  return res.status(status).json({ message: error.message || "Something went wrong." });
}

// PACKAGE CRUD
app.post("/api/packages", async (req, res) => {
  try {
    const { packageId, destination, duration, price, availableSeats } = req.body;
    const item = await Package.create({ packageId, destination, duration, price, availableSeats });
    res.status(201).json(item);
  } catch (error) { sendError(res, error); }
});

app.get("/api/packages", async (req, res) => {
  try {
    const { destination, duration, minPrice, maxPrice } = req.query;
    const filter = {};
    if (destination && destination.trim()) filter.destination = { $regex: destination.trim(), $options: "i" };
    if (duration) filter.duration = Number(duration);
    if (minPrice !== undefined && minPrice !== "") filter.price = { ...(filter.price || {}), $gte: Number(minPrice) };
    if (maxPrice !== undefined && maxPrice !== "") filter.price = { ...(filter.price || {}), $lte: Number(maxPrice) };
    res.json(await Package.find(filter).sort({ createdAt: -1 }));
  } catch (error) { sendError(res, error, 500); }
});

app.get("/api/packages/:id", async (req, res) => {
  try {
    const item = await Package.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Package not found." });
    res.json(item);
  } catch (error) { sendError(res, error); }
});

app.put("/api/packages/:id", async (req, res) => {
  try {
    const allowed = ["packageId", "destination", "duration", "price", "availableSeats"];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    const item = await Package.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Package not found." });
    res.json(item);
  } catch (error) { sendError(res, error); }
});

app.delete("/api/packages/:id", async (req, res) => {
  try {
    const activeBookings = await Booking.countDocuments({ package: req.params.id, status: "Confirmed" });
    if (activeBookings > 0) return res.status(409).json({ message: "This package has confirmed bookings. Cancel those bookings before deleting the package." });
    const item = await Package.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Package not found." });
    res.json({ message: "Package deleted successfully." });
  } catch (error) { sendError(res, error); }
});

// BOOKINGS
app.post("/api/bookings", async (req, res) => {
  const { packageId, customerName, email, phone, travelDate, travellers } = req.body;
  const count = Number(travellers);
  if (!packageId || !customerName?.trim() || !email?.trim() || !phone?.trim() || !travelDate || !Number.isInteger(count) || count < 1) {
    return res.status(400).json({ message: "Please complete all booking fields and enter at least one traveller." });
  }
  const date = new Date(travelDate);
  if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "Please enter a valid travel date." });
  if (date < new Date(new Date().toDateString())) return res.status(400).json({ message: "Travel date cannot be in the past." });

  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      const tour = await Package.findById(packageId).session(session);
      if (!tour) throw new Error("Selected package was not found.");
      if (tour.availableSeats < count) throw new Error(`Only ${tour.availableSeats} seat(s) are available.`);
      tour.availableSeats -= count;
      await tour.save({ session });
      const docs = await Booking.create([{
        bookingId: makeId("BK"),
        package: tour._id,
        packageId: tour.packageId,
        destination: tour.destination,
        customerName: customerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        travelDate: date,
        travellers: count,
        totalPrice: tour.price * count,
        status: "Confirmed"
      }], { session });
      booking = docs[0];
    });
    res.status(201).json(booking);
  } catch (error) {
    const status = /not found/i.test(error.message) ? 404 : (/Only .* seat/i.test(error.message) ? 409 : 400);
    sendError(res, error, status);
  } finally {
    await session.endSession();
  }
});

app.get("/api/bookings", async (_req, res) => {
  try { res.json(await Booking.find().sort({ createdAt: -1 }).populate("package", "packageId destination duration price availableSeats")); }
  catch (error) { sendError(res, error, 500); }
});

app.put("/api/bookings/:id/cancel", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      const booking = await Booking.findById(req.params.id).session(session);
      if (!booking) throw new Error("Booking not found.");
      if (booking.status === "Cancelled") throw new Error("This booking is already cancelled.");
      const tour = await Package.findById(booking.package).session(session);
      if (tour) {
        tour.availableSeats += booking.travellers;
        await tour.save({ session });
      }
      booking.status = "Cancelled";
      await booking.save({ session });
      updated = booking;
    });
    res.json(updated);
  } catch (error) { sendError(res, error, /not found/i.test(error.message) ? 404 : 400); }
  finally { await session.endSession(); }
});

app.use((req, res) => res.status(404).json({ message: "API route not found." }));

const port = process.env.PORT || 5000;
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing. Create backend/.env using backend/.env.example.");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, { dbName: "TravelAgencyDB" })
  .then(() => {
    console.log("MongoDB connected successfully");
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
