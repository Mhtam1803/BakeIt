document.addEventListener('DOMContentLoaded', () => {
    const recipesData = window.RECIPES_DATA || [];
    const recipeFaqs = window.RECIPE_FAQS || {};
    const COMMUNITY_API_URL = '/api/community-posts';
    const ACCOUNT_KEY = 'bakeit_account';
    let communityPosts = [];
    let currentRecipe = null;
    
    const listView = document.getElementById('blog-list-view');
    const detailView = document.getElementById('recipe-detail-view');
    const recipesGrid = document.getElementById('recipes-grid');
    const btnBack = document.getElementById('btn-back-to-list');
    const btnAddToCart = document.getElementById('btn-add-recipe-cart');

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function recipeImageUrl(imagePath) {
        const path = String(imagePath || '').trim();
        if (!path || /^(https?:|data:|\/)/i.test(path)) return path;
        if (path.startsWith('../assets/')) return `/customer/${path.slice(3)}`;
        if (path.startsWith('assets/')) return `/customer/${path}`;
        return path;
    }

    function getAccount() {
        try {
            return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
        } catch (error) {
            return null;
        }
    }

    async function loadCommunityPosts() {
        try {
            const response = await fetch(COMMUNITY_API_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            communityPosts = await response.json();
        } catch (error) {
            try {
                const fallback = await fetch('../../../datasets/CommunityPost.json');
                communityPosts = await fallback.json();
            } catch (fallbackError) {
                communityPosts = [];
            }
        }
    }

    async function submitBlogComment(recipe, content) {
        const account = getAccount();
        const response = await fetch(COMMUNITY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                BlogID: recipe.id,
                BlogTitle: recipe.title,
                Content: content,
                CustomerID: account && account.CustomerID,
                CustomerName: account && account.FullName ? account.FullName : 'Bạn',
                CustomerEmail: account && account.Email
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        return data;
    }

    function communityThreadsForRecipe(recipeId) {
        const roots = communityPosts.filter(post =>
            Number(post.BlogID) === Number(recipeId) &&
            (post.ParentPostID === null || post.ParentPostID === undefined || post.ParentPostID === '')
        );

        return roots.map(post => ({
            post,
            replies: communityPosts.filter(reply => String(reply.ParentPostID) === String(post.PostID))
        }));
    }

    function renderRecipeFaqs(recipe) {
        const faqList = document.querySelector('.faq-list');
        if (!faqList) return;

        const faqs = recipe.faqs || recipeFaqs[recipe.id] || [];
        const communityThreads = communityThreadsForRecipe(recipe.id);
        if (faqs.length === 0 && communityThreads.length === 0) {
            faqList.innerHTML = '<p class="faq-empty">Chưa có câu hỏi nào cho công thức này.</p>';
            return;
        }

        const staticFaqHtml = faqs.map(faq => `
            <div class="faq-item faq-question">
                <strong>${escapeHtml(faq.name)}</strong>
                <span>(${escapeHtml(faq.time)})</span>
                <p>${escapeHtml(faq.question)}</p>
            </div>
            <div class="faq-item faq-answer">
                <strong>Admin Bake it!</strong>
                <p>${escapeHtml(faq.answer)}</p>
            </div>
        `).join('');

        const communityHtml = communityThreads.map(thread => `
            <div class="faq-item faq-question">
                <strong>${escapeHtml(thread.post.CustomerName || 'Khách hàng')}</strong>
                <span>(${escapeHtml(thread.post.CreatedAt || 'vừa đăng')})</span>
                <p>${escapeHtml(thread.post.Content)}</p>
            </div>
            ${thread.replies.map(reply => `
                <div class="faq-item faq-answer">
                    <strong>Admin Bake it!</strong>
                    <span>(${escapeHtml(reply.CreatedAt || '')})</span>
                    <p>${escapeHtml(reply.Content)}</p>
                </div>
            `).join('')}
        `).join('');

        faqList.innerHTML = staticFaqHtml + communityHtml;
    }

    // 1. RENDER DANH SÁCH BÀI BLOG
    function renderList() {
        if (!recipesGrid) return;
        if (recipesData.length === 0) {
            recipesGrid.innerHTML = "<p>Đang cập nhật công thức mới...</p>";
            return;
        }

        recipesGrid.innerHTML = recipesData.map(recipe => `
            <a class="recipe-card" href="blog.html?id=${recipe.id}" data-id="${recipe.id}">
                <div class="recipe-card-img" style="background-image: url('${recipeImageUrl(recipe.image)}');"></div>
                <div class="recipe-card-body">
                    <h3 class="recipe-card-title">${recipe.title}</h3>
                    <p class="recipe-card-desc">${recipe.description}</p>
                    <div class="recipe-card-meta">📝 Bởi ${recipe.author} | 📅 ${recipe.date}</div>
                </div>
            </a>
        `).join('');

        // Lắng nghe sự kiện click vào Card
        document.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', (event) => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                const id = Number(card.dataset.id);
                window.history.pushState({ recipeId: id }, '', `blog.html?id=${id}`);
                openRecipeDetail(id);
            });
        });
    }

    // 2. MỞ CHI TIẾT CÔNG THỨC
    function openRecipeDetail(id) {
        const recipe = recipesData.find(r => r.id === id);
        if (!recipe) return;
        currentRecipe = recipe;

        // Điền dữ liệu
        document.getElementById('detail-title').textContent = recipe.title;
        document.getElementById('detail-author').textContent = recipe.author;
        document.getElementById('detail-date').textContent = recipe.date;
        document.getElementById('detail-image').src = recipeImageUrl(recipe.image);
        document.getElementById('detail-desc').textContent = recipe.description;

        // Điền dữ liệu Checklist nguyên liệu
        const checklistContainer = document.getElementById('ingredients-checklist');
        const ingredientRows = recipe.ingredients.map((ing) => {
            let text = typeof ing === 'string' ? ing : ing.text;
            let productId = typeof ing === 'string' ? null : ing.productId;

            if (productId) {
                return `
                    <label class="check-item">
                        <input type="checkbox" class="ingredient-checkbox" data-product-id="${productId}">
                        <span>${text}</span>
                    </label>
                `;
            } else {
                return `<div class="check-item no-buy"><span>• ${text}</span></div>`;
            }
        }).join('');

        checklistContainer.innerHTML = `
            <label class="check-item check-all-item">
                <input type="checkbox" id="select-all-ingredients">
                <span>Chọn tất cả</span>
            </label>
            ${ingredientRows}
        `;

        const selectAllIngredients = document.getElementById('select-all-ingredients');
        const ingredientCheckboxes = Array.from(checklistContainer.querySelectorAll('.ingredient-checkbox'));

        if (selectAllIngredients) {
            selectAllIngredients.addEventListener('change', () => {
                ingredientCheckboxes.forEach(checkbox => {
                    checkbox.checked = selectAllIngredients.checked;
                });
                selectAllIngredients.indeterminate = false;
            });

            ingredientCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const checkedCount = ingredientCheckboxes.filter(item => item.checked).length;
                    selectAllIngredients.checked = checkedCount === ingredientCheckboxes.length;
                    selectAllIngredients.indeterminate = checkedCount > 0 && checkedCount < ingredientCheckboxes.length;
                });
            });
        }

        // Điền dữ liệu Các bước thực hiện
        const stepsContainer = document.getElementById('steps-container');
        stepsContainer.innerHTML = recipe.steps.map((step, index) => `
            <div class="step-item">
                <div class="step-number">${index + 1}</div>
                <div class="step-text">${step}</div>
            </div>
        `).join('');

        renderRecipeFaqs(recipe);
        loadCommunityPosts().then(() => {
            if (currentRecipe && currentRecipe.id === recipe.id) {
                renderRecipeFaqs(recipe);
            }
        });

        // Đổi View
        listView.classList.add('hidden');
        detailView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 3. QUAY LẠI DANH SÁCH
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            detailView.classList.add('hidden');
            listView.classList.remove('hidden');
            window.history.pushState({}, '', 'blog.html');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 4. XỬ LÝ CLICK NÚT "THÊM VÀO GIỎ HÀNG"
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.ingredient-checkbox:checked');
            
            if (checkedBoxes.length === 0) {
                alert('Vui lòng tick chọn ít nhất 1 nguyên liệu để thêm vào giỏ nhé!');
                return;
            }

            checkedBoxes.forEach(box => {
                const productId = Number(box.dataset.productId);
                if (window.CartStorage) {
                    window.CartStorage.addItem(productId, 1);
                }
            });

            if (window.CartStorage && typeof window.CartStorage.showToast === 'function') {
                window.CartStorage.showToast(`Đã thêm ${checkedBoxes.length} nguyên liệu vào giỏ! 🛒`);
            } else {
                alert(`Đã thêm ${checkedBoxes.length} nguyên liệu vào giỏ hàng!`);
            }

            // Hiệu ứng nút
            const originalText = btnAddToCart.textContent;
            btnAddToCart.textContent = "Thêm thành công! ✓";
            btnAddToCart.style.background = "#389e0d"; 
            
            setTimeout(() => {
                btnAddToCart.textContent = originalText;
                btnAddToCart.style.background = "#4a3329"; 
            }, 2000);
        });
    }

    // 5. XỬ LÝ BÌNH LUẬN (ĐĂNG NGAY KHÔNG CẦN DUYỆT)
    const commentForm = document.getElementById('recipe-comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = commentForm.querySelector('textarea');
            const commentText = textarea.value.trim();

            if (commentText !== '' && currentRecipe) {
                const submitButton = commentForm.querySelector('button[type="submit"]');
                if (submitButton) submitButton.disabled = true;

                try {
                    const savedComment = await submitBlogComment(currentRecipe, commentText);
                    communityPosts.push(savedComment);
                    renderRecipeFaqs(currentRecipe);
                    textarea.value = '';
                    alert('Bình luận của bạn đã được gửi tới Community Q&A!');
                } catch (error) {
                    alert('Không thể gửi bình luận vào Community Q&A. Hãy chạy bằng server.js rồi thử lại.');
                } finally {
                    if (submitButton) submitButton.disabled = false;
                }
            }
        });
    }

    window.addEventListener('popstate', () => {
        const recipeId = Number(new URLSearchParams(window.location.search).get('id'));
        if (recipeId) {
            openRecipeDetail(recipeId);
        } else {
            detailView.classList.add('hidden');
            listView.classList.remove('hidden');
        }
    });

    renderList();

    const initialRecipeId = Number(new URLSearchParams(window.location.search).get('id'));
    if (initialRecipeId) openRecipeDetail(initialRecipeId);
}); // Dấu ngoặc này đóng cho DOMContentLoaded, đảm bảo không bị lỗi nữa
