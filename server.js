const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const multer = require("multer");
const { GridFSBucket } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

let gfsBucket;

const initializeMongoDB = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/phd-management", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        const conn = mongoose.connection;
        gfsBucket = new GridFSBucket(conn.db, { bucketName: "uploads" });
        console.log("✅ MongoDB/GridFS initialized successfully");
        return true;
    } catch (err) {
        console.error("❌ MongoDB/GridFS Initialization Error:", err.message);
        return false;
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPEG, PNG, and PDF files are allowed"));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const CourseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    instructorRegNo: { type: String, required: true },
    students: [{ type: String }],
    progress: { type: Number, default: 0 },
    assignments: [{
        title: String,
        dueDate: Date,
        completed: { type: Boolean, default: false }
    }]
});
const Course = mongoose.model("Course", CourseSchema);

const DeadlineSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: Date, required: true },
    courseCode: { type: String, required: true },
    studentRegNo: { type: String, required: true }
});
const Deadline = mongoose.model("Deadline", DeadlineSchema);

const CalendarEventSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    event: { type: String, required: true },
    studentRegNo: { type: String, required: true }
});
const CalendarEvent = mongoose.model("CalendarEvent", CalendarEventSchema);

const NotificationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    studentRegNo: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: { type: String, enum: ["paper_update", "deadline_reminder", "profile_update", "general"], default: "general" }
});
const Notification = mongoose.model("Notification", NotificationSchema);

const FinanceSchema = new mongoose.Schema({
    studentRegNo: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["Paid", "Pending"], default: "Pending" }
});
const Finance = mongoose.model("Finance", FinanceSchema);

const ResearchScholarSchema = new mongoose.Schema({
    regNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: String,
    scholarDesignation: String,
    supervisor: String,
    externalContactMailId: String,
    internalDesignDepartmentExpert1: String,
    internalDesignDepartmentExpert2: String,
    expert1MailId: String,
    expert2MailId: String
}, { collection: "researchscholars" });
const ResearchScholar = mongoose.model("ResearchScholar", ResearchScholarSchema);

const UserSchema = new mongoose.Schema({
    regNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: String,
    department: String,
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher"], required: true },
    "Scholar No": String,
    "Scholar E-mail id": String,
    "Research Dept": String,
    "Supervisor Ph": { No: String },
    "Supervisor Mail Id": String,
    "External Expert Contact No": String,
    "External Expert Mail Id": String,
    "Internal-Expert-1 Ph No": String,
    "Internal-Expert-1 Mail Id": String,
    "Internal-Expert-2 Ph No": String,
    "Internal-Expert-2 Mail Id": String,
    researchPapers: [{
        filename: String,
        fileId: mongoose.Schema.Types.ObjectId,
        uploadedAt: Date,
        status: { type: String, enum: ["Pending", "Accepted", "Needs Modification"], default: "Pending" },
        teacherComment: { type: String, default: "" }
    }],
    profilePic: {
        filename: String,
        fileId: mongoose.Schema.Types.ObjectId
    },
    courses: [{
        name: String,
        code: String,
        instructor: String,
        progress: Number,
        assignments: [String]
    }]
});
const User = mongoose.model("User", UserSchema);

const importUsers = async () => {
    const filePath = path.join(__dirname, "data", "students_data.csv");
    if (!fs.existsSync(filePath)) {
        console.warn("⚠️ students_data.csv not found, skipping import");
        return;
    }

    const users = [];
    fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
            const userData = {
                regNo: row.regNo,
                name: row.name,
                email: row.email || row["Scholar E-mail id"] || null,
                department: row.department || row["Research Dept"] || null,
                password: row.password || "defaultpassword123",
                role: row.role || "student",
                "Scholar No": row["Scholar No"] || null,
                "Scholar E-mail id": row["Scholar E-mail id"] || null,
                "Research Dept": row["Research Dept"] || null,
                "Supervisor Ph": { No: row["Supervisor Ph.No"] || null },
                "Supervisor Mail Id": row["Supervisor Mail Id"] || null,
                "External Expert Contact No": row["External Expert Contact No"] || null,
                "External Expert Mail Id": row["External Expert Mail Id"] || null,
                "Internal-Expert-1 Ph No": row["Internal-Expert-1 Ph No"] || null,
                "Internal-Expert-1 Mail Id": row["Internal-Expert-1 Mail Id"] || null,
                "Internal-Expert-2 Ph No": row["Internal-Expert-2 Ph No"] || null,
                "Internal-Expert-2 Mail Id": row["Internal-Expert-2 Mail Id"] || null,
                researchPapers: [],
                profilePic: null,
                courses: [
                    { name: "DC Reports 1", code: "DC101", instructor: "Dr. Smith", progress: 50, assignments: ["Assignment 1"] },
                    { name: "DC Reports 2", code: "DC102", instructor: "Prof. John", progress: 30, assignments: ["Assignment 2"] },
                    { name: "DC Reports 3", code: "DC103", instructor: "Dr. Kumar", progress: 20, assignments: ["Assignment 3"] },
                    { name: "DC Reports 4", code: "DC104", instructor: "Dr. Reddy", progress: 10, assignments: ["Assignment 4"] },
                    { name: "DC Reports 5", code: "DC105", instructor: "Prof. Sharma", progress: 0, assignments: ["Assignment 5"] }
                ]
            };
            users.push(userData);
        })
        .on("end", async () => {
            try {
                for (const user of users) {
                    const exists = await User.findOne({ regNo: user.regNo });
                    if (!exists) await User.create(user);
                }
                console.log("✅ User data imported from CSV");
            } catch (err) {
                console.error("❌ CSV Import Error:", err.message);
            }
        });
};

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: "Access token required" });
    try {
        const decoded = jwt.verify(token, "your_jwt_secret");
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: "Invalid token" });
    }
};

app.get("/health", (req, res) => res.status(200).json({ success: true, message: "Server is running" }));

app.post("/auth/login", async (req, res) => {
    const { regNo, password, role } = req.body;
    try {
        if (!regNo || !password || !role) return res.status(400).json({ success: false, message: "regNo, password, and role are required" });
        const user = await User.findOne({ regNo, role });
        if (!user || user.password !== password) return res.status(400).json({ success: false, message: "Invalid credentials" });
        const token = jwt.sign({ regNo: user.regNo, role: user.role }, "your_jwt_secret", { expiresIn: "1h" });
        res.json({
            success: true,
            message: "Login successful",
            user: {
                name: user.name,
                email: user.email,
                department: user.department,
                regNo: user.regNo,
                role: user.role,
                profilePic: user.profilePic ? user.profilePic.filename : null,
                "Scholar E-mail id": user["Scholar E-mail id"],
                "Research Dept": user["Research Dept"],
                "Supervisor Mail Id": user["Supervisor Mail Id"],
                "External Expert Mail Id": user["External Expert Mail Id"],
                "Internal-Expert-1 Mail Id": user["Internal-Expert-1 Mail Id"],
                "Internal-Expert-2 Mail Id": user["Internal-Expert-2 Mail Id"],
                courses: user.courses || []
            },
            token
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/students", authenticate, async (req, res) => {
    try {
        if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Unauthorized" });
        const students = await User.find({ role: "student" });
        res.json({ success: true, students });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/student/:regNo", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const student = await User.findOne({ regNo, role: "student" });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });
        res.json({ success: true, student });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/student/:regNo/research-scholars", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        console.log(`Fetching research scholars for regNo: ${regNo}, user: ${JSON.stringify(req.user)}`);
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });

        // Fetch both ResearchScholar and User data
        const scholar = await ResearchScholar.findOne({ regNo }).lean();
        const user = await User.findOne({ regNo, role: "student" }).lean();

        if (!scholar || !user) {
            console.log(`⚠️ No scholar or user data found for regNo: ${regNo}`);
            return res.status(404).json({ success: false, message: "No research scholar found for this regNo" });
        }

        // Combine and transform data to match UI requirements
        const enrichedScholar = {
            regNo: scholar.regNo,
            name: scholar.name,
            email: scholar.email || user["Scholar E-mail id"] || "N/A",
            scholarDesignation: scholar.scholarDesignation || "PhD Scholar",
            supervisor: user["Supervisor Mail Id"] ? `Dr. ${user.name.split(" ")[0]} (Email: ${user["Supervisor Mail Id"]}, Phone: ${user["Supervisor Ph"]?.No || "N/A"})` : "N/A",
            externalContactMailId: user["External Expert Mail Id"] || "N/A",
            externalContactPhone: user["External Expert Contact No"] || "N/A",
            internalDesignDepartmentExpert1: user["Internal-Expert-1 Mail Id"] ? `${user.name.split(" ")[0]}'s Expert 1 (Email: ${user["Internal-Expert-1 Mail Id"]}, Phone: ${user["Internal-Expert-1 Ph No"] || "N/A"})` : "N/A",
            internalDesignDepartmentExpert2: user["Internal-Expert-2 Mail Id"] ? `${user.name.split(" ")[0]}'s Expert 2 (Email: ${user["Internal-Expert-2 Mail Id"]}, Phone: ${user["Internal-Expert-2 Ph No"] || "N/A"})` : "N/A",
            expert1MailId: user["Internal-Expert-1 Mail Id"] || "N/A",
            expert2MailId: user["Internal-Expert-2 Mail Id"] || "N/A"
        };

        console.log("✅ Fetched and enriched scholar data:", enrichedScholar);
        res.json({ success: true, scholars: [enrichedScholar] });
    } catch (err) {
        console.error("❌ Error fetching research scholars:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/uploadResearch", authenticate, upload.single("file"), async (req, res) => {
    try {
        if (!req.file || !req.body.regNo || req.user.regNo !== req.body.regNo || req.user.role !== "student") {
            return res.status(400).json({ success: false, message: "Invalid request" });
        }
        const user = await User.findOne({ regNo: req.body.regNo, role: "student" });
        if (!user) return res.status(404).json({ success: false, message: "Student not found" });

        const filename = `${Date.now()}-${req.file.originalname}`;
        const uploadStream = gfsBucket.openUploadStream(filename, { contentType: req.file.mimetype });
        fs.createReadStream(req.file.path).pipe(uploadStream);

        uploadStream.on("finish", async () => {
            user.researchPapers.push({ filename, fileId: uploadStream.id, uploadedAt: new Date() });
            await user.save();
            fs.unlinkSync(req.file.path);
            await Notification.create({ message: `New research paper uploaded: "${filename}"`, studentRegNo: req.body.regNo, type: "paper_update" });
            res.status(200).json({ success: true, message: "Research paper uploaded", filename });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/uploadProfilePic", authenticate, upload.single("profilePic"), async (req, res) => {
    try {
        if (!req.file || !req.body.regNo || req.user.regNo !== req.body.regNo) {
            return res.status(400).json({ success: false, message: "Invalid request" });
        }
        const user = await User.findOne({ regNo: req.body.regNo });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (user.profilePic?.fileId) await gfsBucket.delete(user.profilePic.fileId);
        const filename = `${Date.now()}-${req.file.originalname}`;
        const uploadStream = gfsBucket.openUploadStream(filename, { contentType: req.file.mimetype });
        fs.createReadStream(req.file.path).pipe(uploadStream);

        uploadStream.on("finish", async () => {
            user.profilePic = { filename, fileId: uploadStream.id };
            await user.save();
            fs.unlinkSync(req.file.path);
            if (user.role === "student") {
                await Notification.create({ message: "Profile picture updated", studentRegNo: req.body.regNo, type: "profile_update" });
            }
            res.status(200).json({ success: true, message: "Profile picture uploaded", filename });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/download/:filename", async (req, res) => {
    try {
        const files = await gfsBucket.find({ filename: req.params.filename }).toArray();
        if (!files.length) return res.status(404).json({ success: false, message: "File not found" });
        const downloadStream = gfsBucket.openDownloadStreamByName(files[0].filename);
        res.set("Content-Type", files[0].contentType);
        res.set("Content-Disposition", `attachment; filename="${files[0].filename}"`);
        downloadStream.pipe(res);
    } catch (err) {
        res.status(500).json({ success: false, message: "Download failed" });
    }
});

app.get("/teacher/student/:regNo", authenticate, async (req, res) => {
    try {
        if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Unauthorized" });
        const student = await User.findOne({ regNo: req.params.regNo, role: "student" });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });
        res.json({ success: true, student });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/teacher/addStudentDetails", authenticate, async (req, res) => {
    try {
        if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Unauthorized" });
        const { regNo, name, email, department, researchPapers } = req.body;
        if (!regNo || !name) return res.status(400).json({ success: false, message: "regNo and name required" });

        const student = await User.findOne({ regNo, role: "student" });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        student.name = name;
        if (email) student.email = email;
        if (department) student.department = department;
        if (researchPapers) student.researchPapers = researchPapers.map(p => ({ filename: p, uploadedAt: new Date() }));
        if (student.courses.length < 5) {
            student.courses = [
                { name: "DC Reports 1", code: "DC101", instructor: "Dr. Smith", progress: 50, assignments: ["Assignment 1"] },
                { name: "DC Reports 2", code: "DC102", instructor: "Prof. John", progress: 30, assignments: ["Assignment 2"] },
                { name: "DC Reports 3", code: "DC103", instructor: "Dr. Kumar", progress: 20, assignments: ["Assignment 3"] },
                { name: "DC Reports 4", code: "DC104", instructor: "Dr. Reddy", progress: 10, assignments: ["Assignment 4"] },
                { name: "DC Reports 5", code: "DC105", instructor: "Prof. Sharma", progress: 0, assignments: ["Assignment 5"] }
            ];
        }
        await student.save();
        await Notification.create({ message: "Details updated by teacher", studentRegNo: regNo, type: "profile_update" });
        res.json({ success: true, message: "Student details updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/teacher/updateResearchPaperStatus", authenticate, async (req, res) => {
    try {
        if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Unauthorized" });
        const { regNo, filename, status, teacherComment } = req.body;
        const student = await User.findOne({ regNo, role: "student" });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const paper = student.researchPapers.find(p => p.filename === filename);
        if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });

        paper.status = status;
        paper.teacherComment = teacherComment || "";
        await student.save();
        await Notification.create({ message: `Paper "${filename}" status: ${status}`, studentRegNo: regNo, type: "paper_update" });
        res.json({ success: true, message: "Paper status updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/teacher/updateProfile", authenticate, upload.single("profilePic"), async (req, res) => {
    try {
        if (req.user.role !== "teacher" || req.user.regNo !== req.body.regNo) return res.status(403).json({ success: false, message: "Unauthorized" });
        const { regNo, name, email, department } = req.body;
        const teacher = await User.findOne({ regNo, role: "teacher" });
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

        teacher.name = name;
        if (email) teacher.email = email;
        if (department) teacher.department = department;

        if (req.file) {
            if (teacher.profilePic?.fileId) await gfsBucket.delete(teacher.profilePic.fileId);
            const filename = `${Date.now()}-${req.file.originalname}`;
            const uploadStream = gfsBucket.openUploadStream(filename, { contentType: req.file.mimetype });
            fs.createReadStream(req.file.path).pipe(uploadStream);
            uploadStream.on("finish", async () => {
                teacher.profilePic = { filename, fileId: uploadStream.id };
                await teacher.save();
                fs.unlinkSync(req.file.path);
                res.json({ success: true, message: "Profile updated", profilePic: filename });
            });
        } else {
            await teacher.save();
            res.json({ success: true, message: "Profile updated" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/student/updateProfile", authenticate, upload.single("profilePic"), async (req, res) => {
    try {
        if (req.user.role !== "student" || req.user.regNo !== req.body.regNo) return res.status(403).json({ success: false, message: "Unauthorized" });
        const { regNo, name, email } = req.body;
        const student = await User.findOne({ regNo, role: "student" });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        student.name = name;
        if (email) student.email = email;

        if (req.file) {
            if (student.profilePic?.fileId) await gfsBucket.delete(student.profilePic.fileId);
            const filename = `${Date.now()}-${req.file.originalname}`;
            const uploadStream = gfsBucket.openUploadStream(filename, { contentType: req.file.mimetype });
            fs.createReadStream(req.file.path).pipe(uploadStream);
            uploadStream.on("finish", async () => {
                student.profilePic = { filename, fileId: uploadStream.id };
                await student.save();
                fs.unlinkSync(req.file.path);
                await Notification.create({ message: "Profile updated", studentRegNo: regNo, type: "profile_update" });
                res.json({ success: true, message: "Profile updated", profilePic: filename });
            });
        } else {
            await student.save();
            await Notification.create({ message: "Profile updated", studentRegNo: regNo, type: "profile_update" });
            res.json({ success: true, message: "Profile updated" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/teachers", authenticate, async (req, res) => {
    try {
        if (req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const teachers = await User.find({ role: "teacher" }).select("name regNo email department profilePic");
        res.json({ success: true, teachers });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/student/:regNo/courses", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const student = await User.findOne({ regNo, role: "student" });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });
        let courses = await Course.find({ students: regNo });
        while (courses.length < 5) {
            courses.push({
                name: `DC Reports ${courses.length + 1}`,
                code: `DC${100 + courses.length + 1}`,
                instructorRegNo: "T1001",
                students: [regNo],
                progress: Math.floor(Math.random() * 101),
                assignments: [`Assignment ${courses.length + 1}`]
            });
        }
        res.json({ success: true, courses });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/student/:regNo/deadlines", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const deadlines = await Deadline.find({ studentRegNo: regNo });
        res.json({ success: true, deadlines });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/student/:regNo/calendar", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const events = await CalendarEvent.find({ studentRegNo: regNo });
        res.json({ success: true, events });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/student/:regNo/notifications", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const notifications = await Notification.find({ studentRegNo: regNo }).sort({ date: -1 }).limit(10);
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/student/:regNo/notifications/unread-count", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const unreadCount = await Notification.countDocuments({ studentRegNo: regNo, read: false });
        res.json({ success: true, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/student/:regNo/notifications/:notificationId/mark-read", authenticate, async (req, res) => {
    try {
        const { regNo, notificationId } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const notification = await Notification.findOne({ _id: notificationId, studentRegNo: regNo });
        if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
        notification.read = true;
        await notification.save();
        res.json({ success: true, message: "Notification marked as read" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/student/:regNo/notifications/mark-read", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        await Notification.updateMany({ studentRegNo: regNo, read: false }, { read: true });
        res.json({ success: true, message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/student/:regNo/finance", authenticate, async (req, res) => {
    try {
        const { regNo } = req.params;
        if (req.user.regNo !== regNo || req.user.role !== "student") return res.status(403).json({ success: false, message: "Unauthorized" });
        const financeDetails = await Finance.find({ studentRegNo: regNo });
        res.json({ success: true, financeDetails });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = 5000;
const startServer = async () => {
    const initialized = await initializeMongoDB();
    if (!initialized) process.exit(1);

    await importUsers();
    const seedData = async () => {
        if (await User.countDocuments() === 0) await importUsers();
        if (await ResearchScholar.countDocuments() === 0) {
            const users = await User.find({ role: "student" });
            await ResearchScholar.insertMany(users.map(user => ({
                regNo: user.regNo,
                name: user.name,
                email: user.email || user["Scholar E-mail id"] || null,
                scholarDesignation: user["Scholar No"] || "PhD Scholar",
                supervisor: user["Supervisor Mail Id"] ? `Dr. ${user.name.split(" ")[0]} (via ${user["Supervisor Mail Id"]})` : null,
                externalContactMailId: user["External Expert Mail Id"] || null,
                internalDesignDepartmentExpert1: user["Internal-Expert-1 Mail Id"] ? `Expert 1 (via ${user["Internal-Expert-1 Mail Id"]})` : null,
                internalDesignDepartmentExpert2: user["Internal-Expert-2 Mail Id"] ? `Expert 2 (via ${user["Internal-Expert-2 Mail Id"]})` : null,
                expert1MailId: user["Internal-Expert-1 Mail Id"] || null,
                expert2MailId: user["Internal-Expert-2 Mail Id"] || null
            })));
            // Explicitly ensure 141PG04204 has detailed data
            const explicitScholar = await ResearchScholar.findOne({ regNo: "141PG04204" });
            if (!explicitScholar) {
                await ResearchScholar.create({
                    regNo: "141PG04204",
                    name: "Cmak Zeelan Basha",
                    email: "cmak.zeelan@example.com",
                    scholarDesignation: "PhD Scholar",
                    supervisor: "Dr. Supervisor (supervisor@example.com)",
                    externalContactMailId: "external.contact@example.com",
                    internalDesignDepartmentExpert1: "Expert 1 (expert1@example.com)",
                    internalDesignDepartmentExpert2: "Expert 2 (expert2@example.com)",
                    expert1MailId: "expert1@example.com",
                    expert2MailId: "expert2@example.com"
                });
                console.log("✅ Explicitly seeded ResearchScholar for 141PG04204");
            } else {
                await ResearchScholar.updateOne(
                    { regNo: "141PG04204" },
                    {
                        $set: {
                            name: "Cmak Zeelan Basha",
                            email: "cmak.zeelan@example.com",
                            scholarDesignation: "PhD Scholar",
                            supervisor: "Dr. Supervisor (supervisor@example.com)",
                            externalContactMailId: "external.contact@example.com",
                            internalDesignDepartmentExpert1: "Expert 1 (expert1@example.com)",
                            internalDesignDepartmentExpert2: "Expert 2 (expert2@example.com)",
                            expert1MailId: "expert1@example.com",
                            expert2MailId: "expert2@example.com"
                        }
                    }
                );
                console.log("✅ Updated ResearchScholar for 141PG04204");
            }
        }
        if (await Course.countDocuments() === 0) {
            await Course.insertMany([
                { name: "DC Reports 1", code: "DC101", instructorRegNo: "T1001", students: ["141PG04204"], progress: 50, assignments: [{ title: "Assignment 1", dueDate: new Date("2025-04-01"), completed: false }] },
                { name: "DC Reports 2", code: "DC102", instructorRegNo: "T1001", students: ["141PG04204"], progress: 30, assignments: [{ title: "Assignment 2", dueDate: new Date("2025-04-02"), completed: false }] },
                { name: "DC Reports 3", code: "DC103", instructorRegNo: "T1001", students: ["141PG04204"], progress: 20, assignments: [{ title: "Assignment 3", dueDate: new Date("2025-04-03"), completed: false }] },
                { name: "DC Reports 4", code: "DC104", instructorRegNo: "T1001", students: ["141PG04204"], progress: 10, assignments: [{ title: "Assignment 4", dueDate: new Date("2025-04-04"), completed: false }] },
                { name: "DC Reports 5", code: "DC105", instructorRegNo: "T1001", students: ["141PG04204"], progress: 0, assignments: [{ title: "Assignment 5", dueDate: new Date("2025-04-05"), completed: false }] }
            ]);
        }
        if (await Deadline.countDocuments() === 0) {
            await Deadline.insertMany([
                { title: "Submit DC Reports", date: new Date("2025-04-01"), courseCode: "DC101", studentRegNo: "141PG04204" }
            ]);
        }
        if (await CalendarEvent.countDocuments() === 0) {
            await CalendarEvent.insertMany([
                { date: new Date("2025-04-01"), event: "DC Reports Submission", studentRegNo: "141PG04204" }
            ]);
        }
        if (await Notification.countDocuments() === 0) {
            await Notification.insertMany([
                { message: "Welcome!", studentRegNo: "141PG04204", type: "general" }
            ]);
        }
        if (await Finance.countDocuments() === 0) {
            await Finance.insertMany([
                { studentRegNo: "141PG04204", description: "Tuition Fee", amount: 3000, date: new Date("2025-01-15"), status: "Paid" }
            ]);
        }
    };
    await seedData();

    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
};
startServer();