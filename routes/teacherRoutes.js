const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Research = require("../models/Research");

// 🟢 Update Student Marks & Attendance
router.post("/update", async (req, res) => {
    const { regNo, marks, attendance } = req.body;

    try {
        await User.updateOne({ regNo, role: "student" }, { marks, attendance });
        res.json({ success: true, message: "Student Data Updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update Error" });
    }
});

// 🟢 View Research Papers
router.get("/research", async (req, res) => {
    try {
        const papers = await Research.find();
        res.json({ success: true, papers });
    } catch (error) {
        res.status(500).json({ success: false, message: "Fetch Error" });
    }
});

module.exports = router;
