const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    regNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Plaintext Password (Not Hashed)
    role: { type: String, enum: ["student", "teacher"], required: true },
    marks: { type: Number, default: 0 },
    attendance: { type: Number, default: 0 }
});

module.exports = mongoose.model("User", UserSchema);
