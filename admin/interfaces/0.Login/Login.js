(function() {
    var adminAuthKey = "bakeit_admin_session";

    function safeGet(id) {
        return document.getElementById(id);
    }

    function setMessage(message, type) {
        var box = safeGet("loginMessage");
        if (!box) return;
        box.textContent = message;
        box.className = "login-message " + (type || "");
    }

    function buildSession(admin) {
        return {
            adminId: admin.AdminID,
            fullName: admin.FullName,
            email: admin.Email,
            username: admin.Email,
            role: admin.Role,
            status: admin.AdminStatus,
            loginAt: new Date().toISOString()
        };
    }

    function redirectAfterLogin() {
        var savedRedirect = localStorage.getItem("bakeit_admin_redirect");
        localStorage.removeItem("bakeit_admin_redirect");

        if (savedRedirect && !savedRedirect.includes("/0.Login/Login.html")) {
            window.location.href = savedRedirect;
            return;
        }

        window.location.href = "../Dashboard/Dashboard.html";
    }

    async function loadAdmins() {
        var response = await fetch("../../../datasets/Administrator.json");
        if (!response.ok) throw new Error("Cannot load Administrator dataset.");
        return response.json();
    }

    async function handleLogin(event) {
        event.preventDefault();
        var email = safeGet("adminEmail").value.trim().toLowerCase();
        var password = safeGet("adminPassword").value;
        var submitButton = safeGet("loginSubmitBtn");

        setMessage("", "");
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in';

        try {
            var admins = await loadAdmins();
            var admin = admins.find(function(item) {
                return String(item.Email || "").toLowerCase() === email;
            });

            if (!admin || admin.Password !== password) {
                setMessage("Email or password is incorrect.", "error");
                return;
            }

            if (admin.AdminStatus !== "Active") {
                setMessage("This administrator account is not active.", "error");
                return;
            }

            localStorage.setItem(adminAuthKey, JSON.stringify(buildSession(admin)));
            setMessage("Login successful. Redirecting...", "success");
            redirectAfterLogin();
        } catch (error) {
            setMessage("Cannot sign in right now. Please check the dataset path.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log in';
        }
    }

    function initLogin() {
        if (localStorage.getItem(adminAuthKey)) {
            redirectAfterLogin();
            return;
        }

        var form = safeGet("adminLoginForm");
        if (form) form.addEventListener("submit", handleLogin);
    }

    document.addEventListener("DOMContentLoaded", initLogin);
})();
