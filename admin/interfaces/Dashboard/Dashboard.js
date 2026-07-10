"use strict";

/* systemsetting.js */
var teamMembers = [];
var selectedMemberIndex = null;
var currentUser = "@samsam";
var adminAuthKey = "bakeit_admin_session";

var isContentPage = window.location.pathname.includes("/content/");
var isLoginPage = window.location.pathname.endsWith("/Login.html");
var dataPath = "../../../datasets/Settings.json";

function getAdminSession() {
    try {
        return JSON.parse(localStorage.getItem(adminAuthKey) || "null");
    } catch (error) {
        return null;
    }
}

function loginPath() { return "../0.Login/Login.html"; }

function requireAdminAuth() {
    if (isLoginPage) return;
    if (!getAdminSession()) {
        localStorage.setItem("bakeit_admin_redirect", window.location.href);
        window.location.replace(loginPath());
    }
}

requireAdminAuth();

fetch(dataPath)
    .then(function(response) { return response.json(); })
    .then(function(data) {
        teamMembers = data.members || [];
        var session = getAdminSession();
        currentUser = session ? session.username : (data.currentUser || "@samsam");

        renderSidebarProfile(teamMembers);
        applySavedTheme();
        setupCommonEvents();

        if (document.getElementById("teamBody")) {
            loadTeamMembers(teamMembers);
            loadSettingsFromJson(data.general, data.notifications);
            loadSavedSettings();
            setupSystemSettingEvents();
            var requestedTab = new URLSearchParams(window.location.search).get("tab") || "team";
            showTab(requestedTab);
        }

        if (document.getElementById("profileName")) {
            renderMyProfilePage(teamMembers);
        }
    })
    .catch(function(error) {
        console.error("Cannot load Settings.json:", error);
    });

function safeGet(id) { return document.getElementById(id); }

function renderSidebarProfile(members) {
    if (!safeGet("sidebarAvatar") || !safeGet("sidebarName") || !safeGet("sidebarRole")) return;

    var session = getAdminSession();
    var currentProfile = null;

    if (session) {
        currentProfile = members.find(function(member) {
            return member.email === session.email || member.username === session.username;
        }) || {
            name: session.fullName,
            username: session.username,
            email: session.email,
            role: session.role,
            status: session.status,
            avatar: "https://api.dicebear.com/9.x/personas/svg?seed=" + encodeURIComponent(session.fullName || session.email)
        };
    } else {
        currentProfile = members.find(function(member) {
            return member.username === currentUser;
        }) || members[0];
    }

    if (!currentProfile) return;

    safeGet("sidebarAvatar").src = currentProfile.avatar;
    safeGet("sidebarName").textContent = currentProfile.name;
    safeGet("sidebarRole").textContent = currentProfile.role;

    var sidebarProfileCard = safeGet("sidebarProfileCard");
    var profileArrow = safeGet("profileArrow");
    var profileMenu = safeGet("profileMenu");
    var logoutBtn = safeGet("logoutBtn");

    if (sidebarProfileCard) {
        sidebarProfileCard.addEventListener("click", function(event) {
            if (event.target === profileArrow || event.target.closest("#profileMenu")) return;
            window.location.href = "../System Settings/SystemSettings.html?tab=account#setting";
        });
    }

    if (profileArrow && profileMenu) {
        profileArrow.addEventListener("click", function(event) {
            event.stopPropagation();
            profileMenu.classList.toggle("show-profile-menu");
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function(event) {
            event.stopPropagation();
            localStorage.removeItem(adminAuthKey);
            localStorage.removeItem("bakeit_admin_redirect");
            window.location.href = loginPath();
        });
    }
}

function setupCommonEvents() {
    var notificationBtn = safeGet("notificationBtn");
    var notificationPanel = safeGet("notificationPanel");
    var profileMenu = safeGet("profileMenu");

    if (notificationBtn && notificationPanel) {
        notificationBtn.addEventListener("click", function(event) {
            event.stopPropagation();
            notificationPanel.classList.toggle("show");
        });

        notificationPanel.addEventListener("click", function(event) {
            event.stopPropagation();
        });
    }

    document.addEventListener("click", function() {
        if (notificationPanel) notificationPanel.classList.remove("show");
        if (profileMenu) profileMenu.classList.remove("show-profile-menu");
    });
}

function showTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(function(btn) {
        btn.classList.remove("active");
        if (btn.dataset.tab === tabName) btn.classList.add("active");
    });

    document.querySelectorAll(".tab-content").forEach(function(tab) {
        tab.classList.remove("active-tab");
    });

    var target = safeGet(tabName + "-tab");
    if (target) target.classList.add("active-tab");
}

document.querySelectorAll(".tab-btn").forEach(function(btn) {
    btn.addEventListener("click", function() { showTab(this.dataset.tab); });
});

function loadTeamMembers(members) {
    var tbody = safeGet("teamBody");
    var totalMembers = safeGet("totalMembers");
    if (!tbody || !totalMembers) return;

    totalMembers.innerHTML = members.length + " Total";
    tbody.innerHTML = "";

    members.forEach(function(member, index) {
        var row = document.createElement("tr");
        row.className = "member-row";

        row.innerHTML =
            "<td><div class='member-info'>" +
            "<img class='team-avatar' src='" + member.avatar + "' alt='" + member.name + "'>" +
            "<div><h4>" + member.name + "</h4><p>" + member.username + "</p></div>" +
            "</div></td>" +
            "<td><span class='member-status " + member.status.toLowerCase() + "'>" + member.status + "</span></td>" +
            "<td>" + member.joinDate + "</td>" +
            "<td>" + member.lastActive + "</td>" +
            "<td>" + member.role + "</td>" +
            "<td><button class='delete-btn'><i class='fa-regular fa-trash-can'></i></button></td>";

        row.addEventListener("click", function(event) {
            if (event.target.closest(".delete-btn")) {
                teamMembers.splice(index, 1);
                loadTeamMembers(teamMembers);
                return;
            }

            loadAccountInfo(member, index);
            showTab("account");
        });

        tbody.appendChild(row);
    });

    if (members.length > 0) loadAccountInfo(members[0], 0);
}

function loadAccountInfo(member, index) {
    selectedMemberIndex = index;

    if (!safeGet("accountAvatar")) return;
    safeGet("accountAvatar").src = member.avatar;
    safeGet("accountName").innerHTML = member.name;
    safeGet("accountRoleText").innerHTML = member.role;
    safeGet("accountFullName").value = member.name;
    safeGet("accountUsername").value = member.username;
    safeGet("accountStatus").value = member.status;
    safeGet("accountRole").value = member.role;
    safeGet("accountJoinDate").value = member.joinDate;
    safeGet("accountLastActive").value = member.lastActive;
}

function setupSystemSettingEvents() {
    safeGet("updateAccountBtn").addEventListener("click", function() {
        if (selectedMemberIndex === null) return;

        teamMembers[selectedMemberIndex].name = safeGet("accountFullName").value;
        teamMembers[selectedMemberIndex].username = safeGet("accountUsername").value;
        teamMembers[selectedMemberIndex].role = safeGet("accountRole").value;
        teamMembers[selectedMemberIndex].joinDate = safeGet("accountJoinDate").value;
        teamMembers[selectedMemberIndex].lastActive = safeGet("accountLastActive").value;

        loadTeamMembers(teamMembers);
        alert("Account updated successfully!");
    });

    safeGet("saveSettingsBtn").addEventListener("click", saveSettings);
    safeGet("openAddUserModal").addEventListener("click", openModal);
    safeGet("closeAddUserModal").addEventListener("click", closeModal);
    safeGet("cancelAddUser").addEventListener("click", closeModal);
    safeGet("addUserForm").addEventListener("submit", addNewUser);
    safeGet("exportBtn").addEventListener("click", exportCSV);

    safeGet("teamSearchInput").addEventListener("input", function() {
        var keyword = this.value.toLowerCase();
        var filtered = teamMembers.filter(function(member) {
            return member.name.toLowerCase().includes(keyword) ||
                   member.username.toLowerCase().includes(keyword) ||
                   member.role.toLowerCase().includes(keyword);
        });
        loadTeamMembers(filtered);
    });
}

function loadSettingsFromJson(general, notifications) {
    safeGet("websiteName").value = general.websiteName;
    safeGet("websiteDescription").value = general.description;
    safeGet("language").value = general.language;
    safeGet("timezone").value = general.timezone;
    safeGet("theme").value = general.theme;
    safeGet("systemStatus").value = general.status;
    safeGet("emailNotification").checked = notifications.email;
    safeGet("orderNotification").checked = notifications.order;
    safeGet("reviewNotification").checked = notifications.review;
    safeGet("loginAlert").checked = notifications.loginAlert;
}

function loadSavedSettings() {
    var saved = localStorage.getItem("mycogenSettings");
    if (!saved) return;
    var data = JSON.parse(saved);
    safeGet("websiteName").value = data.websiteName;
    safeGet("websiteDescription").value = data.description;
    safeGet("language").value = data.language;
    safeGet("timezone").value = data.timezone;
    safeGet("theme").value = data.theme;
    safeGet("systemStatus").value = data.status;
    safeGet("emailNotification").checked = data.emailNotification;
    safeGet("orderNotification").checked = data.orderNotification;
    safeGet("reviewNotification").checked = data.reviewNotification;
    safeGet("loginAlert").checked = data.loginAlert;
    applyTheme(data.theme);
}

function saveSettings() {
    var data = {
        websiteName: safeGet("websiteName").value,
        description: safeGet("websiteDescription").value,
        language: safeGet("language").value,
        timezone: safeGet("timezone").value,
        theme: safeGet("theme").value,
        status: safeGet("systemStatus").value,
        emailNotification: safeGet("emailNotification").checked,
        orderNotification: safeGet("orderNotification").checked,
        reviewNotification: safeGet("reviewNotification").checked,
        loginAlert: safeGet("loginAlert").checked
    };
    localStorage.setItem("mycogenSettings", JSON.stringify(data));
    applyTheme(data.theme);
    alert("Settings saved successfully!");
}

function applySavedTheme() {
    var saved = localStorage.getItem("mycogenSettings");
    if (!saved) return;
    applyTheme(JSON.parse(saved).theme);
}

function applyTheme(theme) {
    if (theme === "Dark") document.body.classList.add("dark-theme");
    else document.body.classList.remove("dark-theme");
}

function openModal() { safeGet("addUserModal").classList.add("show-modal"); }
function closeModal() { safeGet("addUserModal").classList.remove("show-modal"); }

function addNewUser(event) {
    event.preventDefault();
    var name = safeGet("newName").value;
    var username = safeGet("newUsername").value;
    var status = safeGet("newStatus").value;
    var role = safeGet("newRole").value;

    var newMember = {
        employeeId: "EMP" + String(teamMembers.length + 1).padStart(3, "0"),
        name: name,
        username: username,
        avatar: "https://api.dicebear.com/9.x/personas/svg?seed=" + encodeURIComponent(name),
        email: username.replace("@", "") + "@mycogenbakery.com",
        phone: "+84 900 000 000",
        gender: "Unknown",
        birthday: "2000-01-01",
        address: "Ho Chi Minh City",
        status: status,
        joinDate: "June 24, 2026",
        lastActive: "Just now",
        role: role,
        branch: "District 1 Branch",
        shift: "Morning Shift",
        bio: "New bakery employee profile.",
        stats: { orders: 0, monthlyRevenue: 0, rating: 0, attendance: 100 },
        skills: [{ name: "Customer Service", level: 70 }],
        activities: [{ title: "New user created", time: "Just now" }]
    };

    teamMembers.push(newMember);
    loadTeamMembers(teamMembers);
    closeModal();
    showTab("account");
    loadAccountInfo(newMember, teamMembers.length - 1);
    this.reset();
}

function exportCSV() {
    var csv = "Full Name,Username,Status,Join Date,Last Active,Role\n";
    teamMembers.forEach(function(member) {
        csv += member.name + "," + member.username + "," + member.status + "," + member.joinDate + "," + member.lastActive + "," + member.role + "\n";
    });
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "team-members.csv";
    link.click();
}

function renderMyProfilePage(members) {
    var params = new URLSearchParams(window.location.search);
    var session = getAdminSession();
    var username = params.get("user") || currentUser;
    var profile = members.find(function(member) {
        return member.username === username || member.email === username;
    });

    if (!profile && session) {
        profile = members.find(function(member) {
            return member.email === session.email || member.username === session.username;
        }) || {
            employeeId: "ADMIN" + session.adminId,
            name: session.fullName,
            username: session.username,
            avatar: "https://api.dicebear.com/9.x/personas/svg?seed=" + encodeURIComponent(session.fullName || session.email),
            email: session.email,
            phone: "Not updated",
            gender: "Not updated",
            birthday: "Not updated",
            address: "Not updated",
            status: session.status || "Active",
            joinDate: "Not updated",
            lastActive: "Just now",
            role: session.role,
            branch: "Admin",
            shift: "Not updated",
            bio: "Administrator account from login dataset.",
            stats: { orders: 0, monthlyRevenue: 0, rating: 0, attendance: 100 },
            skills: [{ name: "Admin Access", level: 100 }],
            activities: [{ title: "Logged in to admin dashboard", time: "Just now" }]
        };
    }

    profile = profile || members[0];
    if (!profile) return;

    safeGet("profileAvatar").src = profile.avatar;
    safeGet("profileName").innerHTML = profile.name;
    safeGet("profileRole").innerHTML = profile.role;
    safeGet("profileStatus").innerHTML = profile.status;
    safeGet("profileStatus").className = "member-status " + profile.status.toLowerCase();
    safeGet("profileEmployeeId").innerHTML = profile.employeeId;
    safeGet("profileBranch").innerHTML = profile.branch;
    safeGet("profileShift").innerHTML = profile.shift;
    safeGet("profileEmail").innerHTML = profile.email;
    safeGet("profilePhone").innerHTML = profile.phone;
    safeGet("profileGender").innerHTML = profile.gender;
    safeGet("profileBirthday").innerHTML = profile.birthday;
    safeGet("profileHireDate").innerHTML = profile.joinDate;
    safeGet("profileAddress").innerHTML = profile.address;
    safeGet("profileBio").innerHTML = profile.bio;
    safeGet("statOrders").innerHTML = profile.stats.orders;
    safeGet("statRevenue").innerHTML = formatMoney(profile.stats.monthlyRevenue);
    safeGet("statRating").innerHTML = profile.stats.rating + " / 5";
    safeGet("statAttendance").innerHTML = profile.stats.attendance + "%";
    renderSkills(profile.skills);
    renderActivities(profile.activities);
}

function renderSkills(skills) {
    var box = safeGet("skillsList");
    if (!box) return;
    box.innerHTML = "";
    skills.forEach(function(skill) {
        box.innerHTML += "<div class='skill-item'><div class='skill-top'><span>" + skill.name + "</span><strong>" + skill.level + "%</strong></div><div class='skill-progress'><div style='width:" + skill.level + "%'></div></div></div>";
    });
}

function renderActivities(activities) {
    var box = safeGet("activitiesList");
    if (!box) return;
    box.innerHTML = "";
    activities.forEach(function(activity) {
        box.innerHTML += "<div class='activity-item'><div class='activity-icon'><i class='fa-solid fa-check'></i></div><div><h4>" + activity.title + "</h4><p>" + activity.time + "</p></div></div>";
    });
}

function formatMoney(value) {
    if (value === 0) return "0 VND";
    return (value / 1000000).toFixed(0) + "M VND";
}


/* dashboard.js */
(function() {
    var orders = [];
    var inventory = [];
    var customers = [];
    var products = [];
    var batches = [];
    var chartMode = "monthly";
    var orderStorageKey = "bakeit_admin_orders";

    function safeGet(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatCurrency(value, compact) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            notation: compact ? "compact" : "standard",
            maximumFractionDigits: 0
        }).format(value || 0);
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-US").format(value || 0);
    }

    function formatDate(value) {
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return "N/A";
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function cleanCustomerName(value) {
        return String(value || "").replace(/\s+\d{3}$/, "");
    }

    function orderTotal(order) {
        var itemTotal = (order.items || []).reduce(function(total, item) {
            return total + (Number(item.subtotal) || 0);
        }, 0);
        return Number(order.payment.amount) || (itemTotal + (Number(order.shippingFee) || 0));
    }

    function normalizeOrder(order) {
        var items = Array.isArray(order.OrderItems || order.items) ? (order.OrderItems || order.items) : [];
        var payment = order.Payment || order.payment || {};
        var fulfillment = order.Fulfillment || order.fulfillment || {};
        return {
            id: Number(order.OrderID || order.id) || 0,
            customerId: Number(order.CustomerID || order.customerId) || 0,
            date: order.OrderDate || order.orderDate || "",
            status: order.OrderStatus || order.status || "Processing",
            receiverName: cleanCustomerName(order.ReceiverName || order.receiverName),
            receiverPhone: order.ReceiverPhone || order.receiverPhone || "",
            shippingFee: Number(order.ShippingFee || order.shippingFee) || 0,
            items: items.map(function(item) {
                return {
                    productId: Number(item.ProductID || item.productId) || 0,
                    productName: item.ProductName || item.productName || "",
                    quantity: Number(item.Quantity || item.quantity) || 0,
                    unitPrice: Number(item.UnitPrice || item.unitPrice) || 0,
                    subtotal: Number(item.Subtotal || item.subtotal) || 0
                };
            }),
            payment: {
                method: payment.PaymentMethod || payment.method || "COD",
                status: payment.PaymentStatus || payment.status || "Pending",
                amount: Number(payment.PaymentAmount || payment.amount) || 0,
                date: payment.PaymentDate || payment.date || ""
            },
            fulfillment: {
                deliveryStatus: fulfillment.DeliveryStatus || fulfillment.deliveryStatus || "Pending"
            },
            returnRequest: order.ReturnRequest || order.returnRequest || null
        };
    }

    function loadOrdersFromStorage() {
        try {
            var saved = JSON.parse(localStorage.getItem(orderStorageKey) || "[]");
            return Array.isArray(saved) && saved.length ? saved.map(normalizeOrder) : null;
        } catch (error) {
            return null;
        }
    }

    function productName(productId) {
        var product = products.find(function(item) {
            return Number(item.id || item.ProductID) === Number(productId);
        });
        return product ? (product.title || product.ProductName) : "Product #" + productId;
    }

    function statusClass(status) {
        if (status === "Cancelled" || status === "Failed" || status === "Rejected") return "out";
        if (status === "Pending" || status === "Processing" || status === "Packed") return "low";
        return "in";
    }

    function monthKey(dateValue) {
        var date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return "";
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    }

    function latestMonthKey() {
        return orders.reduce(function(latest, order) {
            var key = monthKey(order.date);
            return key > latest ? key : latest;
        }, "");
    }

    function previousMonth(key) {
        var parts = key.split("-").map(Number);
        var date = new Date(parts[0], parts[1] - 2, 1);
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    }

    function monthLabel(key) {
        var parts = key.split("-").map(Number);
        return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(parts[0], parts[1] - 1, 1));
    }

    function deltaText(current, previous, lowerIsBetter) {
        if (!previous) return "Baseline month";
        var delta = ((current - previous) / previous) * 100;
        var arrow = delta >= 0 ? "↗" : "↘";
        var good = lowerIsBetter ? delta <= 0 : delta >= 0;
        return '<span class="' + (good ? "dashboard-positive" : "dashboard-negative") + '">' + arrow + " " + Math.abs(delta).toFixed(1) + "%</span> vs previous month";
    }

    function monthlyStats() {
        var map = {};
        orders.forEach(function(order) {
            var key = monthKey(order.date);
            if (!key) return;
            if (!map[key]) map[key] = { sales: 0, orders: 0 };
            map[key].sales += orderTotal(order);
            map[key].orders += 1;
        });
        return map;
    }

    function renderKpis() {
        var stats = monthlyStats();
        var latest = latestMonthKey();
        var previous = previousMonth(latest);
        var latestStats = stats[latest] || { sales: 0, orders: 0 };
        var previousStats = stats[previous] || { sales: 0, orders: 0 };
        var totalSales = orders.reduce(function(total, order) { return total + orderTotal(order); }, 0);
        var totalOrders = orders.length;
        var aov = totalOrders ? totalSales / totalOrders : 0;
        var previousAov = previousStats.orders ? previousStats.sales / previousStats.orders : 0;
        var lowStock = inventory.filter(function(item) {
            return Number(item.Quantity) <= Number(item.LowStockLevel);
        }).length;

        safeGet("totalSalesValue").textContent = formatCurrency(totalSales, true);
        safeGet("totalOrdersValue").textContent = formatNumber(totalOrders);
        safeGet("aovValue").textContent = formatCurrency(aov);
        safeGet("lowStockValue").textContent = formatNumber(lowStock);
        safeGet("salesDeltaText").innerHTML = deltaText(latestStats.sales, previousStats.sales);
        safeGet("ordersDeltaText").innerHTML = deltaText(latestStats.orders, previousStats.orders);
        safeGet("aovDeltaText").innerHTML = deltaText(latestStats.orders ? latestStats.sales / latestStats.orders : 0, previousAov);
        safeGet("stockDeltaText").textContent = lowStock + " below threshold";
    }

    function renderSalesChart() {
        if (chartMode === "status") {
            renderStatusBars();
            return;
        }

        var stats = monthlyStats();
        var months = Object.keys(stats).sort().slice(-12);
        var maxSales = Math.max.apply(null, months.map(function(key) { return stats[key].sales; }).concat([1]));
        var width = 920;
        var height = 320;
        var padding = { top: 26, right: 26, bottom: 46, left: 62 };
        var chartWidth = width - padding.left - padding.right;
        var chartHeight = height - padding.top - padding.bottom;
        var gap = 22;
        var barWidth = Math.max(24, (chartWidth - gap * (months.length - 1)) / Math.max(months.length, 1));
        var points = [];

        var bars = months.map(function(key, index) {
            var value = stats[key].sales;
            var barHeight = (value / maxSales) * chartHeight;
            var x = padding.left + index * (barWidth + gap);
            var y = padding.top + chartHeight - barHeight;
            points.push((x + barWidth / 2) + "," + y);
            return [
                '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + barHeight + '" rx="12" class="sales-bar"></rect>',
                '<text x="' + (x + barWidth / 2) + '" y="' + (height - 16) + '" text-anchor="middle" class="chart-label">' + monthLabel(key) + '</text>',
                '<circle cx="' + (x + barWidth / 2) + '" cy="' + y + '" r="5" class="sales-dot"></circle>'
            ].join("");
        }).join("");

        var grid = [0, 0.25, 0.5, 0.75, 1].map(function(ratio) {
            var y = padding.top + chartHeight - chartHeight * ratio;
            var label = formatCurrency(maxSales * ratio, true).replace("₫", "");
            return [
                '<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '" class="chart-grid"></line>',
                '<text x="18" y="' + (y + 4) + '" class="chart-axis">' + label + '</text>'
            ].join("");
        }).join("");

        safeGet("salesChartWrap").innerHTML = [
            '<svg class="sales-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Monthly sales chart">',
            grid,
            bars,
            '<polyline points="' + points.join(" ") + '" class="sales-line"></polyline>',
            '</svg>'
        ].join("");

        var best = months.reduce(function(bestKey, key) {
            return stats[key].sales > (stats[bestKey] ? stats[bestKey].sales : -1) ? key : bestKey;
        }, months[0]);
        var first = stats[months[0]] ? stats[months[0]].sales : 0;
        var last = stats[months[months.length - 1]] ? stats[months[months.length - 1]].sales : 0;
        var growth = first ? ((last - first) / first) * 100 : 0;

        safeGet("bestMonthText").textContent = "Best month: " + (best ? monthLabel(best) : "N/A");
        safeGet("bestMonthSales").textContent = best ? formatCurrency(stats[best].sales) : "0";
        safeGet("growthTrendText").textContent = "Growth trend";
        safeGet("growthTrendValue").textContent = (growth >= 0 ? "+" : "") + growth.toFixed(1) + "% across visible months";
        safeGet("salesRangeText").textContent = "Monthly sales from " + months.length + " active periods";
    }

    function renderStatusBars() {
        var counts = {};
        orders.forEach(function(order) {
            counts[order.status] = (counts[order.status] || 0) + 1;
        });
        var statuses = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
        var max = Math.max.apply(null, statuses.map(function(status) { return counts[status]; }).concat([1]));

        safeGet("salesChartWrap").innerHTML = '<div class="status-bar-chart">' + statuses.map(function(status) {
            var width = Math.round((counts[status] / max) * 100);
            return [
                '<div class="status-bar-row">',
                '<span>' + escapeHtml(status) + '</span>',
                '<div><i style="width:' + width + '%"></i></div>',
                '<strong>' + counts[status] + '</strong>',
                '</div>'
            ].join("");
        }).join("") + '</div>';
        safeGet("bestMonthText").textContent = "Most common status";
        safeGet("bestMonthSales").textContent = statuses[0] ? statuses[0] + " · " + counts[statuses[0]] + " orders" : "N/A";
        safeGet("growthTrendText").textContent = "Fulfillment view";
        safeGet("growthTrendValue").textContent = "Processing, completed, and cancelled orders";
        safeGet("salesRangeText").textContent = "Order status distribution";
    }

    function renderRecentOrders() {
        var recent = orders.slice().sort(function(a, b) {
            return new Date(b.date) - new Date(a.date);
        }).slice(0, 7);

        safeGet("recentOrdersBody").innerHTML = recent.map(function(order) {
            return [
                '<tr>',
                '<td><strong>#' + order.id + '</strong><p>' + escapeHtml(order.fulfillment.deliveryStatus) + '</p></td>',
                '<td>' + escapeHtml(order.receiverName) + '<p>' + escapeHtml(order.receiverPhone) + '</p></td>',
                '<td>' + formatDate(order.date) + '</td>',
                '<td>' + formatCurrency(orderTotal(order)) + '</td>',
                '<td><span class="product-status ' + statusClass(order.payment.status) + '">' + escapeHtml(order.payment.status) + '</span></td>',
                '<td><span class="product-status ' + statusClass(order.status) + '">' + escapeHtml(order.status) + '</span></td>',
                '</tr>'
            ].join("");
        }).join("");
    }

    function renderCustomers() {
        var latest = latestMonthKey();
        var customerRevenue = {};
        var customerOrderCount = {};
        orders.forEach(function(order) {
            customerRevenue[order.customerId] = (customerRevenue[order.customerId] || 0) + orderTotal(order);
            customerOrderCount[order.customerId] = (customerOrderCount[order.customerId] || 0) + 1;
        });
        var topCustomers = customers.slice().sort(function(a, b) {
            return (customerRevenue[b.CustomerID] || 0) - (customerRevenue[a.CustomerID] || 0);
        }).slice(0, 4);
        var newCustomers = customers.filter(function(customer) {
            return monthKey(customer.CreatedAt) === latest;
        }).length;
        var vipCustomers = customers.filter(function(customer) {
            return Number(customer.LoyaltyPoint) >= 1000;
        }).length;

        safeGet("newCustomersValue").textContent = formatNumber(newCustomers);
        safeGet("vipCustomersValue").textContent = formatNumber(vipCustomers);
        safeGet("totalCustomersValue").textContent = formatNumber(customers.length);
        safeGet("topCustomersList").innerHTML = topCustomers.map(function(customer) {
            var seed = encodeURIComponent(customer.FullName || customer.Email || customer.CustomerID);
            return [
                '<div class="top-customer-row">',
                '<img src="https://api.dicebear.com/9.x/personas/svg?seed=' + seed + '" alt="' + escapeHtml(customer.FullName) + '">',
                '<div><strong>' + escapeHtml(customer.FullName) + '</strong><span>' + formatNumber(customerOrderCount[customer.CustomerID] || 0) + ' orders</span></div>',
                '<b>' + formatCurrency(customerRevenue[customer.CustomerID] || 0, true) + '</b>',
                '</div>'
            ].join("");
        }).join("");
    }

    function renderStockHealth() {
        var total = inventory.length || 1;
        var low = inventory.filter(function(item) { return Number(item.Quantity) <= Number(item.LowStockLevel); }).length;
        var out = inventory.filter(function(item) { return Number(item.Quantity) <= 0; }).length;
        var healthyPercent = Math.round(((total - low) / total) * 100);
        var today = new Date("2026-07-08T00:00:00");
        var expiring = batches.filter(function(batch) {
            var expiry = new Date(batch.ExpiryDate);
            var days = (expiry - today) / 86400000;
            return days >= 0 && days <= 30;
        }).length;
        var lowItems = inventory.slice().sort(function(a, b) {
            return (Number(a.Quantity) - Number(a.LowStockLevel)) - (Number(b.Quantity) - Number(b.LowStockLevel));
        }).slice(0, 5);

        safeGet("stockHealthPercent").textContent = healthyPercent + "%";
        safeGet("stockHealthBar").style.width = healthyPercent + "%";
        safeGet("stockHealthText").textContent = low + " low stock · " + out + " out of stock · " + expiring + " batches expiring soon";
        safeGet("stockAlertList").innerHTML = lowItems.map(function(item) {
            var quantity = Number(item.Quantity) || 0;
            var threshold = Number(item.LowStockLevel) || 1;
            var percent = Math.min(100, Math.round((quantity / threshold) * 100));
            return [
                '<div class="stock-alert-row">',
                '<div><strong>' + escapeHtml(productName(item.ProductID)) + '</strong><span>' + quantity + ' in stock · threshold ' + threshold + '</span></div>',
                '<div class="mini-stock-bar"><i style="width:' + percent + '%"></i></div>',
                '</div>'
            ].join("");
        }).join("");

        var notifications = [
            { icon: "!", title: low + " products below stock threshold", time: "Inventory" },
            { icon: "⏱", title: expiring + " batches expire within 30 days", time: "Batch review" },
            { icon: "+", title: orders.filter(function(order) { return order.status === "Processing"; }).length + " orders need processing", time: "Orders" }
        ];
        safeGet("dashboardNotificationCount").textContent = low + expiring;
        safeGet("dashboardNotificationList").innerHTML = notifications.map(function(item) {
            return '<div class="notification-item"><div class="notification-avatar">' + item.icon + '</div><div><h4>' + escapeHtml(item.title) + '</h4><p>' + escapeHtml(item.time) + '</p></div></div>';
        }).join("");
    }

    function renderStatusDonut() {
        var colors = {
            Completed: "#4c86b3",
            Processing: "#d9aa58",
            Cancelled: "#ef4d6d",
            Pending: "#82aac4"
        };
        var counts = {};
        orders.forEach(function(order) {
            counts[order.status] = (counts[order.status] || 0) + 1;
        });
        var total = orders.length || 1;
        var start = 0;
        var segments = Object.keys(counts).map(function(status) {
            var size = (counts[status] / total) * 100;
            var segment = (colors[status] || "#19c37d") + " " + start + "% " + (start + size) + "%";
            start += size;
            return segment;
        });

        safeGet("statusDonut").style.background = "conic-gradient(" + segments.join(", ") + ")";
        safeGet("statusLegend").innerHTML = Object.keys(counts).map(function(status) {
            var percent = Math.round((counts[status] / total) * 100);
            return '<div><i style="background:' + (colors[status] || "#19c37d") + '"></i><span>' + escapeHtml(status) + '</span><b>' + percent + '%</b></div>';
        }).join("");
    }

    function applySearch() {
        var query = safeGet("dashboardSearchInput").value.trim().toLowerCase();
        if (!query) {
            renderRecentOrders();
            return;
        }

        var matches = orders.filter(function(order) {
            return String(order.id).includes(query) ||
                order.receiverName.toLowerCase().includes(query) ||
                order.status.toLowerCase().includes(query) ||
                order.payment.status.toLowerCase().includes(query) ||
                order.items.some(function(item) { return item.productName.toLowerCase().includes(query); });
        }).slice(0, 7);

        safeGet("recentOrdersBody").innerHTML = matches.map(function(order) {
            return [
                '<tr>',
                '<td><strong>#' + order.id + '</strong><p>' + escapeHtml(order.fulfillment.deliveryStatus) + '</p></td>',
                '<td>' + escapeHtml(order.receiverName) + '<p>' + escapeHtml(order.receiverPhone) + '</p></td>',
                '<td>' + formatDate(order.date) + '</td>',
                '<td>' + formatCurrency(orderTotal(order)) + '</td>',
                '<td><span class="product-status ' + statusClass(order.payment.status) + '">' + escapeHtml(order.payment.status) + '</span></td>',
                '<td><span class="product-status ' + statusClass(order.status) + '">' + escapeHtml(order.status) + '</span></td>',
                '</tr>'
            ].join("");
        }).join("") || '<tr><td colspan="6"><div class="empty-state"><i class="fa-regular fa-folder-open"></i><h3>No matching orders</h3><p>Try another keyword.</p></div></td></tr>';
    }

    function setupEvents() {
        var segmented = document.querySelector(".dashboard-segmented");
        if (segmented) {
            segmented.addEventListener("click", function(event) {
                var button = event.target.closest("[data-chart-mode]");
                if (!button) return;
                document.querySelectorAll("[data-chart-mode]").forEach(function(item) {
                    item.classList.remove("active");
                });
                button.classList.add("active");
                chartMode = button.dataset.chartMode;
                renderSalesChart();
            });
        }
        safeGet("dashboardSearchInput").addEventListener("input", applySearch);
    }

    async function loadJson(path) {
        var response = await fetch(path);
        if (!response.ok) throw new Error("Cannot load " + path);
        return response.json();
    }

    async function initDashboard() {
        var chartWrap = safeGet("salesChartWrap");
        if (!chartWrap) return;

        try {
            var data = await Promise.all([
                loadJson("../../../datasets/Orders.json"),
                loadJson("../../../datasets/Inventory.json"),
                loadJson("../../../datasets/Customers.json"),
                loadJson("../../../datasets/Products.json"),
                loadJson("../../../datasets/ProductBatch.json")
            ]);

            orders = loadOrdersFromStorage() || data[0].map(normalizeOrder);
            inventory = data[1] || [];
            customers = data[2] || [];
            products = data[3] || [];
            batches = data[4] || [];

            renderKpis();
            renderSalesChart();
            renderRecentOrders();
            renderCustomers();
            renderStockHealth();
            renderStatusDonut();
            setupEvents();
        } catch (error) {
            chartWrap.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h3>Cannot load dashboard</h3><p>Please check admin datasets.</p></div>';
        }
    }

    document.addEventListener("DOMContentLoaded", initDashboard);
})();

