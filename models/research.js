const mongoose = require("mongoose");

const ResearchSchema = new mongoose.Schema({
    studentRegNo: { type: String, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true }
});

module.exports = mongoose.model("Research", ResearchSchema);
