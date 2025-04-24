const express = require("express");
const router = express.Router();
const Student = require("../models/Student"); // path updated
const authenticate = require("../middleware/auth"); // path updated
const multer = require("multer");
const path = require("path");

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g., 1678231231231.pdf
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Upload research paper
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

module.exports = router;
