const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 🟢 Login Route (Student/Teacher)
router.post("/login", async (req, res) => {
    const { regNo, password, role } = req.body;

    try {
        const user = await User.findOne({ regNo, role });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        // Direct password match (Kept as requested)
        if (user.password !== password) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }

        res.json({
            success: true,
            user: {
                regNo: user.regNo,
                name: user.name,
                role: user.role,
                marks: user.marks,
                attendance: user.attendance
            }
        });

    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
