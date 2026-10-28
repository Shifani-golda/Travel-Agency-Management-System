const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    packageId: { type: String, required: true, unique: true, trim: true },
    destination: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    availableSeats: { type: Number, required: true, min: 0 }
  },
  { timestamps: true, collection: "packages" }
);

module.exports = mongoose.model("Package", packageSchema);
