const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true, trim: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
    packageId: { type: String, required: true },
    destination: { type: String, required: true },
    customerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    travelDate: { type: Date, required: true },
    travellers: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Confirmed", "Cancelled"], default: "Confirmed" }
  },
  { timestamps: true, collection: "bookings" }
);

module.exports = mongoose.model("Booking", bookingSchema);
