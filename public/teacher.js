document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "index.html";

    document.getElementById("uploadMarks").addEventListener("submit", async (e) => {
        e.preventDefault();
        const studentId = document.getElementById("studentId").value;
        const marks = document.getElementById("marks").value;

        const res = await fetch("/teacher/update", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ regNo: studentId, marks })
        });
        const result = await res.json();
        alert(result.message);
    });

    document.getElementById("uploadAttendance").addEventListener("submit", async (e) => {
        e.preventDefault();
        const studentId = document.getElementById("attStudentId").value;
        const attendance = document.getElementById("attendance").value;

        const res = await fetch("/teacher/update", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ regNo: studentId, attendance })
        });
        const result = await res.json();
        alert(result.message);
    });

    const researchRes = await fetch("/teacher/research", {
        headers: { Authorization: `Bearer ${token}` }
    });
    const researchData = await researchRes.json();
    document.getElementById("researchPapers").innerHTML = researchData.papers.map(p => `<li>${p.title} - <a href="${p.fileUrl}" target="_blank">View</a></li>`).join("");

    document.getElementById("logout").addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "index.html";
    });
});
