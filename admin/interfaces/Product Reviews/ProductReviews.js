"use strict";

(function () {
    var DATASETS_PATH = "../../../datasets/";
    var REVIEWS_STORE_KEY = "bakeit_admin_reviews_customer_v2";
    var ADMIN_AUTH_KEY = "bakeit_admin_session";

    var appState = {
        reviews: []
    };

    var pageTemplate =
        "<div class='topbar'>" +
            "<div class='search-box'>" +
                "<i class='fa-solid fa-magnifying-glass'></i>" +
                "<input type='text' placeholder='Search content...'>" +
            "</div>" +
            "<div class='notification' id='notificationBtn'>" +
                "<i class='fa-regular fa-bell'></i>" +
                "<span class='notification-badge'>8</span>" +
                "<div class='notification-panel' id='notificationPanel'>" +
                    "<div class='notification-header'><h3>Notifications</h3><i class='fa-solid fa-ellipsis'></i></div>" +
                    "<div class='notification-tabs'><button class='active'>All</button><button>Unread</button></div>" +
                    "<div class='notification-list'>" +
                        "<div class='notification-item'><div class='notification-avatar'>🍰</div><div><h4>New order received</h4><p>2 minutes ago</p></div></div>" +
                        "<div class='notification-item'><div class='notification-avatar'>⚠️</div><div><h4>Low stock: Croissant</h4><p>Today</p></div></div>" +
                        "<div class='notification-item'><div class='notification-avatar'>⭐</div><div><h4>Customer left 5-star review</h4><p>Yesterday</p></div></div>" +
                    "</div>" +
                    "<button class='view-all-btn'>View all notifications</button>" +
                "</div>" +
            "</div>" +
        "</div>" +
        "<section class='page-header'>" +
            "<div><h1>Product Reviews</h1><p>Moderate customer reviews and staff replies.</p></div>" +
            "<button class='primary-btn' id='exportReviewsBtn'><i class='fa-solid fa-file-export'></i>Export Reviews</button>" +
        "</section>" +
        "<section class='content-card team-card'>" +
            "<div class='team-header'><div><h2>Product Reviews</h2><p>Review customer feedback, approve/reject comments and export data.</p></div></div>" +
            "<table class='team-table'>" +
                "<thead><tr><th>Customer</th><th>Product</th><th>Rating</th><th>Comment</th><th>Status</th><th>Action</th></tr></thead>" +
                "<tbody id='reviewBody'></tbody>" +
            "</table>" +
        "</section>";

    function getAdminSession() {
        try {
            return JSON.parse(localStorage.getItem(ADMIN_AUTH_KEY) || "null");
        } catch (error) {
            return null;
        }
    }

    function fetchDataset(fileName) {
        return fetch(DATASETS_PATH + fileName).then(function (response) {
            if (!response.ok) throw new Error("Failed to load " + fileName);
            return response.json();
        });
    }

    function loadReviews() {
        var cached = localStorage.getItem(REVIEWS_STORE_KEY);
        if (cached) {
            try {
                return Promise.resolve(JSON.parse(cached));
            } catch (error) {
                localStorage.removeItem(REVIEWS_STORE_KEY);
            }
        }

        return fetchDataset("Feedback.json").then(function (data) {
            return Array.isArray(data) ? data : [];
        });
    }

    function saveReviews() {
        localStorage.setItem(REVIEWS_STORE_KEY, JSON.stringify(appState.reviews));
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function truncateText(text, length) {
        text = text || "";
        return text.length > length ? text.slice(0, length) + "..." : text;
    }

    function safeLower(text) {
        return String(text || "").toLowerCase();
    }

    function getSearchValue() {
        var input = document.querySelector(".search-box input");
        return input ? safeLower(input.value.trim()) : "";
    }

    function matchesSearch(review) {
        var q = getSearchValue();
        if (!q) return true;

        return [
            review.CustomerID,
            review.CustomerName,
            review.ProductID,
            review.ProductName,
            review.Rating,
            review.Comment,
            review.FeedbackStatus,
            review.FeedbackType
        ].some(function (value) {
            return safeLower(value).indexOf(q) !== -1;
        });
    }

    function emptyStateRow(title, message) {
        return (
            "<tr class='placeholder-row'><td colspan='6'>" +
            "<div class='empty-state'>" +
            "<i class='fa-regular fa-folder-open'></i>" +
            "<h3>" + escapeHtml(title) + "</h3><p>" + escapeHtml(message) + "</p>" +
            "</div></td></tr>"
        );
    }

    function statusClass(status) {
        var normalized = safeLower(status);
        if (normalized === "approved") return "online";
        if (normalized === "rejected") return "banned";
        return "offline";
    }

    function statusBadge(status) {
        status = status || "Pending";
        return "<span class='member-status " + statusClass(status) + "'>" + escapeHtml(status) + "</span>";
    }

    function starsHtml(rating) {
        var stars = "";
        rating = Number(rating) || 0;
        for (var i = 0; i < 5; i++) {
            stars += "<i class='fa-solid fa-star " + (i < rating ? "star-filled" : "star-empty") + "'></i>";
        }
        return "<span class='star-rating'>" + stars + "</span>";
    }

    function actionButton(action, id, icon, label, className) {
        return (
            "<button class='icon-action-btn " + (className || "") + "' data-action='" + action + "' data-id='" + id + "' title='" + escapeHtml(label) + "'>" +
            "<i class='" + icon + "'></i><span>" + escapeHtml(label) + "</span></button>"
        );
    }

    function actionGroup(buttons) {
        return "<div class='action-group'>" + buttons.join("") + "</div>";
    }

    function customerLabel(review) {
        return review.CustomerName || ("Customer #" + review.CustomerID);
    }

    function productLabel(review) {
        return review.ProductName || ("Product #" + review.ProductID);
    }

    function renderReviews() {
        var tbody = document.getElementById("reviewBody");
        if (!tbody) return;

        var reviews = appState.reviews.filter(matchesSearch);
        if (reviews.length === 0) {
            tbody.innerHTML = emptyStateRow("No matching reviews", "Reviews will appear here when customers leave feedback.");
            return;
        }

        tbody.innerHTML = reviews.map(function (review) {
            var id = review.FeedbackID;
            return (
                "<tr class='clickable-row' data-action='view' data-id='" + id + "'>" +
                "<td><strong>" + escapeHtml(customerLabel(review)) + "</strong><p class='table-subtext'>" + escapeHtml(review.CreatedAt || "-") + "</p></td>" +
                "<td>" + escapeHtml(productLabel(review)) + "</td>" +
                "<td>" + starsHtml(review.Rating) + "</td>" +
                "<td>" + escapeHtml(truncateText(review.Comment, 80)) + "</td>" +
                "<td>" + statusBadge(review.FeedbackStatus) + "</td>" +
                "<td>" + actionGroup([
                    actionButton("view", id, "fa-regular fa-eye", "View"),
                    actionButton("approve", id, "fa-regular fa-circle-check", "Approve"),
                    actionButton("reject", id, "fa-regular fa-circle-xmark", "Reject"),
                    actionButton("delete", id, "fa-regular fa-trash-can", "Delete", "danger-action")
                ]) + "</td>" +
                "</tr>"
            );
        }).join("");
    }

    function ensureModal() {
        var modal = document.getElementById("contentModal");
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "contentModal";
        modal.className = "modal-overlay";
        modal.innerHTML =
            "<div class='modal-card content-modal-card'>" +
            "<div class='modal-header'><h2 id='contentModalTitle'></h2><button class='close-btn' type='button' data-close-modal='true'><i class='fa-solid fa-xmark'></i></button></div>" +
            "<div id='contentModalBody'></div>" +
            "<div id='contentModalFooter' class='modal-footer'></div>" +
            "</div>";
        document.body.appendChild(modal);

        modal.addEventListener("click", function (event) {
            if (event.target === modal || event.target.closest("[data-close-modal='true']")) closeModal();
        });

        return modal;
    }

    function openModal(title, bodyHtml, footerHtml) {
        ensureModal();
        document.getElementById("contentModalTitle").innerHTML = escapeHtml(title);
        document.getElementById("contentModalBody").innerHTML = bodyHtml || "";
        document.getElementById("contentModalFooter").innerHTML = footerHtml || "";
        document.getElementById("contentModal").classList.add("show-modal");
    }

    function closeModal() {
        var modal = document.getElementById("contentModal");
        if (modal) modal.classList.remove("show-modal");
    }

    function showToast(message) {
        var toast = document.getElementById("contentToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "contentToast";
            toast.className = "content-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("show-toast");
        setTimeout(function () { toast.classList.remove("show-toast"); }, 2600);
    }

    function nowString() {
        var d = new Date();
        var pad = function (n) { return String(n).padStart(2, "0"); };
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    function findReview(id) {
        return appState.reviews.find(function (review) {
            return String(review.FeedbackID) === String(id);
        });
    }

    function openReviewDetail(id) {
        var review = findReview(id);
        if (!review) return;

        var body =
            "<div class='review-detail'>" +
            "<div class='review-score'>" + starsHtml(review.Rating) + "<strong>" + escapeHtml(review.Rating) + "/5</strong></div>" +
            "<p><strong>Customer:</strong> " + escapeHtml(customerLabel(review)) + "</p>" +
            "<p><strong>Product:</strong> " + escapeHtml(productLabel(review)) + "</p>" +
            "<p><strong>Type:</strong> " + escapeHtml(review.FeedbackType || "Product") + "</p>" +
            "<p><strong>Status:</strong> " + statusBadge(review.FeedbackStatus) + "</p>" +
            "<p><strong>Created at:</strong> " + escapeHtml(review.CreatedAt || "-") + "</p>" +
            "<div class='detail-copy quote-copy'>" + escapeHtml(review.Comment || "No comment.") + "</div>" +
            "</div>";
        var footer =
            "<button class='secondary-btn' type='button' data-close-modal='true'>Close</button>" +
            "<button class='primary-btn' type='button' data-action='approve' data-id='" + review.FeedbackID + "'>Approve</button>";

        openModal("Review Details", body, footer);
    }

    function updateReviewStatus(id, status) {
        var review = findReview(id);
        if (!review) return;

        review.FeedbackStatus = status;
        if (status === "Approved") {
            review.ApprovedBy = 1;
            review.ApprovedAt = nowString();
        }

        saveReviews();
        renderReviews();
        closeModal();
        showToast("Review marked as " + status + ".");
    }

    function deleteReview(id) {
        if (!confirm("Delete this review?")) return;
        appState.reviews = appState.reviews.filter(function (review) {
            return String(review.FeedbackID) !== String(id);
        });
        saveReviews();
        renderReviews();
        closeModal();
        showToast("Review deleted.");
    }

    function exportReviews() {
        var rows = [["FeedbackID", "CustomerID", "CustomerName", "ProductID", "ProductName", "Rating", "Comment", "CreatedAt", "FeedbackStatus", "FeedbackType", "ApprovedBy", "ApprovedAt"]];
        appState.reviews.forEach(function (review) {
            rows.push([
                review.FeedbackID,
                review.CustomerID,
                review.CustomerName || "",
                review.ProductID,
                review.ProductName || "",
                review.Rating,
                review.Comment,
                review.CreatedAt,
                review.FeedbackStatus,
                review.FeedbackType,
                review.ApprovedBy || "",
                review.ApprovedAt || ""
            ]);
        });

        var csv = rows.map(function (row) {
            return row.map(function (cell) {
                cell = cell === null || cell === undefined ? "" : String(cell);
                return "\"" + cell.replace(/"/g, "\"\"") + "\"";
            }).join(",");
        }).join("\n");

        var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = "product-reviews-export.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Reviews exported to CSV.");
    }

    function handleAction(action, id) {
        if (action === "view") openReviewDetail(id);
        if (action === "approve") updateReviewStatus(id, "Approved");
        if (action === "reject") updateReviewStatus(id, "Rejected");
        if (action === "delete") deleteReview(id);
    }

    function bindPageActions() {
        var searchInput = document.querySelector(".search-box input");
        if (searchInput) searchInput.addEventListener("input", renderReviews);

        var exportBtn = document.getElementById("exportReviewsBtn");
        if (exportBtn) exportBtn.addEventListener("click", exportReviews);

        document.addEventListener("click", function (event) {
            var btn = event.target.closest("[data-action]");
            if (!btn) return;

            var actionButton = event.target.closest(".icon-action-btn, .primary-btn, .secondary-btn");
            if (!actionButton && btn.classList.contains("clickable-row")) {
                handleAction(btn.dataset.action, btn.dataset.id);
                return;
            }

            if (actionButton) {
                event.preventDefault();
                event.stopPropagation();
                handleAction(btn.dataset.action, btn.dataset.id);
            }
        });
    }

    function setupNotificationPanel() {
        var notificationBtn = document.getElementById("notificationBtn");
        var notificationPanel = document.getElementById("notificationPanel");
        var profileMenu = document.getElementById("profileMenu");

        if (notificationBtn && notificationPanel) {
            notificationBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                notificationPanel.classList.toggle("show");
            });
            notificationPanel.addEventListener("click", function (event) {
                event.stopPropagation();
            });
        }

        document.addEventListener("click", function () {
            if (notificationPanel) notificationPanel.classList.remove("show");
            if (profileMenu) profileMenu.classList.remove("show-profile-menu");
        });
    }

    function setupSidebarProfile() {
        fetchDataset("Settings.json").then(function (data) {
            var members = data.members || [];
            var session = getAdminSession();
            var profile = null;

            if (session) {
                profile = members.find(function (member) {
                    return member.email === session.email || member.username === session.username;
                }) || {
                    name: session.fullName,
                    role: session.role,
                    avatar: "https://api.dicebear.com/9.x/personas/svg?seed=" + encodeURIComponent(session.fullName || session.email || "Admin")
                };
            } else {
                profile = members[0];
            }

            if (!profile) return;
            document.getElementById("sidebarAvatar").src = profile.avatar;
            document.getElementById("sidebarName").textContent = profile.name;
            document.getElementById("sidebarRole").textContent = profile.role;
        }).catch(function (error) {
            console.error("Cannot load Settings.json:", error);
        });

        var profileArrow = document.getElementById("profileArrow");
        var profileMenu = document.getElementById("profileMenu");
        var sidebarProfileCard = document.getElementById("sidebarProfileCard");
        var logoutBtn = document.getElementById("logoutBtn");

        if (profileArrow && profileMenu) {
            profileArrow.addEventListener("click", function (event) {
                event.stopPropagation();
                profileMenu.classList.toggle("show-profile-menu");
            });
        }

        if (sidebarProfileCard) {
            sidebarProfileCard.addEventListener("click", function (event) {
                if (event.target === profileArrow || event.target.closest("#profileMenu")) return;
                window.location.href = "../System Settings/SystemSettings.html?tab=account#setting";
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                localStorage.removeItem(ADMIN_AUTH_KEY);
                localStorage.removeItem("bakeit_admin_redirect");
                window.location.href = "../0.Login/Login.html";
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        var root = document.getElementById("mergedInterfaceRoot");
        if (!root) return;

        root.innerHTML = pageTemplate;
        document.title = "Product Reviews";
        bindPageActions();
        setupNotificationPanel();
        setupSidebarProfile();

        loadReviews()
            .then(function (reviews) {
                appState.reviews = reviews;
                renderReviews();
            })
            .catch(function (error) {
                console.error("Cannot load Feedback.json:", error);
                appState.reviews = [];
                renderReviews();
            });
    });
})();
