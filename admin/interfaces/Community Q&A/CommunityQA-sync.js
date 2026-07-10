(function () {
    var API_URL = "/api/community-posts";
    var DATASET_URL = "../../../datasets/CommunityPost.json";
    var posts = [];

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function truncateText(text, length) {
        text = String(text || "");
        return text.length > length ? text.slice(0, length) + "..." : text;
    }

    function statusBadge(status) {
        return "<span class='member-status online'>" + escapeHtml(status || "Published") + "</span>";
    }

    function actionButton(action, id, icon, label) {
        return "<button class='icon-action-btn community-sync-action' data-community-action='" + action + "' data-post-id='" + id + "' title='" + escapeHtml(label) + "'><i class='" + icon + "'></i><span>" + escapeHtml(label) + "</span></button>";
    }

    function actionGroup(buttons) {
        return "<div class='action-group'>" + buttons.join("") + "</div>";
    }

    function rootPosts() {
        return posts.filter(function (post) {
            return post.ParentPostID === null || post.ParentPostID === undefined || post.ParentPostID === "";
        });
    }

    function repliesFor(postId) {
        return posts.filter(function (post) {
            return String(post.ParentPostID) === String(postId);
        });
    }

    function personLabel(post) {
        if (post.AdminID) return "Admin #" + post.AdminID;
        if (post.CustomerName) return post.CustomerName;
        if (post.CustomerID) return "Customer #" + post.CustomerID;
        return "Customer";
    }

    async function loadPosts() {
        try {
            var response = await fetch(API_URL);
            if (!response.ok) throw new Error("HTTP " + response.status);
            posts = await response.json();
        } catch (error) {
            var fallback = await fetch(DATASET_URL);
            posts = await fallback.json();
        }
    }

    function renderCommunityPosts() {
        var tbody = document.getElementById("communityBody");
        if (!tbody) return;

        var questions = rootPosts();
        if (questions.length === 0) {
            tbody.innerHTML = "<tr class='placeholder-row'><td colspan='5'><div class='empty-state'><i class='fa-regular fa-folder-open'></i><h3>No Q&A threads</h3><p>Customer blog comments will appear here.</p></div></td></tr>";
            return;
        }

        tbody.innerHTML = questions.map(function (question) {
            var replies = repliesFor(question.PostID);
            var adminReplies = replies.filter(function (reply) { return reply.AdminID; }).length;
            var customerReplies = replies.filter(function (reply) { return reply.CustomerID || reply.CustomerName; }).length;
            var source = question.BlogTitle ? "Blog: " + question.BlogTitle : "Community";

            return [
                "<tr class='clickable-row community-sync-row' data-post-id='" + question.PostID + "'>",
                "<td><strong>" + escapeHtml(personLabel(question)) + "</strong><p class='table-subtext'>" + escapeHtml(question.CreatedAt || "-") + "</p></td>",
                "<td><strong>" + escapeHtml(truncateText(question.Content, 95)) + "</strong><p class='table-subtext'>" + escapeHtml(source) + "</p></td>",
                "<td><span class='reply-pill'><i class='fa-regular fa-comments'></i> " + replies.length + " replies</span><p class='table-subtext'>" + adminReplies + " admin / " + customerReplies + " customer</p></td>",
                "<td>" + statusBadge(question.PostStatus) + "</td>",
                "<td>" + actionGroup([
                    actionButton("view", question.PostID, "fa-regular fa-eye", "View"),
                    actionButton("answer", question.PostID, "fa-regular fa-comment-dots", "Answer")
                ]) + "</td>",
                "</tr>"
            ].join("");
        }).join("");
    }

    function closeModal() {
        var modal = document.getElementById("communitySyncModal");
        if (modal) modal.remove();
    }

    function openModal(title, bodyHtml, footerHtml) {
        closeModal();
        document.body.insertAdjacentHTML("beforeend", [
            "<div class='modal-overlay show-modal' id='communitySyncModal'>",
            "<div class='modal-card content-modal-card'>",
            "<div class='modal-header'><h2>" + escapeHtml(title) + "</h2><button class='close-btn' type='button' data-community-close='true'><i class='fa-solid fa-xmark'></i></button></div>",
            "<div>" + bodyHtml + "</div>",
            "<div class='modal-footer'>" + footerHtml + "</div>",
            "</div>",
            "</div>"
        ].join(""));

        document.getElementById("communitySyncModal").addEventListener("click", function (event) {
            if (event.target.id === "communitySyncModal" || event.target.closest("[data-community-close='true']")) closeModal();
        });
    }

    function openDetail(postId) {
        var question = posts.find(function (post) { return String(post.PostID) === String(postId); });
        if (!question) return;

        var threadHtml = [
            "<div class='qa-thread'>",
            "<div class='qa-message question-message'>",
            "<div class='qa-avatar'><i class='fa-regular fa-user'></i></div>",
            "<div><div class='qa-author'>" + escapeHtml(personLabel(question)) + " <span>asked on " + escapeHtml(question.CreatedAt || "-") + "</span></div>",
            question.BlogTitle ? "<p class='table-subtext'>Blog: " + escapeHtml(question.BlogTitle) + "</p>" : "",
            "<p>" + escapeHtml(question.Content) + "</p></div>",
            "</div>"
        ].join("");

        var replies = repliesFor(question.PostID);
        if (!replies.length) {
            threadHtml += "<div class='empty-replies'>No answers yet. Click Answer to reply to this customer.</div>";
        } else {
            threadHtml += replies.map(function (reply) {
                return [
                    "<div class='qa-message " + (reply.AdminID ? "admin-message" : "customer-message") + "'>",
                    "<div class='qa-avatar'><i class='" + (reply.AdminID ? "fa-solid fa-user-shield" : "fa-regular fa-user") + "'></i></div>",
                    "<div><div class='qa-author'>" + escapeHtml(personLabel(reply)) + " <span>replied on " + escapeHtml(reply.CreatedAt || "-") + "</span></div>",
                    "<p>" + escapeHtml(reply.Content) + "</p></div>",
                    "</div>"
                ].join("");
            }).join("");
        }

        threadHtml += "</div>";
        openModal("Q&A Thread Details", threadHtml, "<button class='secondary-btn' type='button' data-community-close='true'>Close</button><button class='primary-btn community-sync-action' type='button' data-community-action='answer' data-post-id='" + question.PostID + "'>Answer Question</button>");
    }

    function openAnswerForm(postId) {
        var question = posts.find(function (post) { return String(post.PostID) === String(postId); }) || rootPosts()[0];
        if (!question) return;

        var body = [
            "<form id='communitySyncAnswerForm' class='content-form'>",
            "<div class='question-preview'><strong>Customer comment:</strong><p>" + escapeHtml(question.Content) + "</p></div>",
            question.BlogTitle ? "<div class='question-preview'><strong>Blog:</strong><p>" + escapeHtml(question.BlogTitle) + "</p></div>" : "",
            "<div class='form-row'><label>Your answer</label><textarea name='Content' required rows='6' placeholder='Write a helpful answer for the customer...'></textarea></div>",
            "</form>"
        ].join("");

        openModal("Answer Customer Question", body, "<button class='secondary-btn' type='button' data-community-close='true'>Cancel</button><button class='primary-btn' type='submit' form='communitySyncAnswerForm'>Submit Answer</button>");

        document.getElementById("communitySyncAnswerForm").addEventListener("submit", async function (event) {
            event.preventDefault();
            var answer = new FormData(event.target).get("Content").trim();
            if (!answer) return;

            var submitButton = document.querySelector("button[form='communitySyncAnswerForm']");
            if (submitButton) submitButton.disabled = true;

            try {
                var response = await fetch(API_URL + "/" + encodeURIComponent(question.PostID) + "/replies", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ Content: answer, AdminID: 1 })
                });
                var reply = await response.json().catch(function () { return {}; });
                if (!response.ok) throw new Error(reply.message || "Cannot save answer.");

                posts.push(reply);
                localStorage.setItem("bakeit_admin_community", JSON.stringify(posts));
                renderCommunityPosts();
                closeModal();
            } catch (error) {
                alert("Cannot save answer to CommunityPost.json. Please run the app with server.js.");
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }

    function bindEvents() {
        var answerButton = document.getElementById("answerQuestionBtn");
        if (answerButton) {
            var cleanButton = answerButton.cloneNode(true);
            answerButton.replaceWith(cleanButton);
            cleanButton.addEventListener("click", function () { openAnswerForm(); });
        }

        document.addEventListener("click", function (event) {
            var actionButton = event.target.closest("[data-community-action]");
            if (actionButton) {
                event.preventDefault();
                event.stopPropagation();
                var action = actionButton.dataset.communityAction;
                var postId = actionButton.dataset.postId;
                if (action === "view") openDetail(postId);
                if (action === "answer") openAnswerForm(postId);
                return;
            }

            var row = event.target.closest(".community-sync-row");
            if (row) openDetail(row.dataset.postId);
        }, true);
    }

    async function init() {
        if (!document.getElementById("communityBody")) return;
        await loadPosts();
        renderCommunityPosts();
        bindEvents();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
