const express = require("express");
const router = express.Router();
const Student = require("./models/Student"); // update path as needed
const authenticate = require("./middleware/auth"); // if you use JWT auth middleware

// Upload paper
router.post("/student/upload-paper", authenticate, upload.single("file"), async (req, res) => {
  try {
    const { title, regNo } = req.body;
    if (!title || !req.file || !regNo) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const paper = {
      title: title,
      url: `http://localhost:5000/uploads/${req.file.filename}`,
      date: new Date()
    };

    const student = await Student.findOne({ regNo });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.researchPapers.push(paper);
    await student.save();

    res.status(200).json({ message: "Research paper uploaded successfully", paper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});
