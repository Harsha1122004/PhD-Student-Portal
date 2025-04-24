document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const regNo = document.getElementById("regNo").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regNo, password, role })
    });

    const data = await res.json();
    if (data.success) {
        window.location.href = role === "student" ? "student.html" : "teacher.html";
    } else {
        alert("Login Failed!");
    }
});
