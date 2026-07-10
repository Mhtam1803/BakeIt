document.addEventListener('DOMContentLoaded', async () => {
    const formatVND = (amount) => amount.toLocaleString('vi-VN') + 'đ';
    const btnBackPrevious = document.getElementById('btn-back-previous');
    const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));

    const reviewNames = [
        'Minh Anh', 'Gia Hân', 'Tuấn Kiệt', 'Bảo Ngọc', 'Lan Chi', 'Đức Anh',
        'Thanh Mai', 'Quốc Huy', 'Hà My', 'Phương Anh', 'Khánh Linh', 'Gia Bảo'
    ];
    const reviewDates = [
        '08/07/2026', '05/07/2026', '29/06/2026', '24/06/2026',
        '18/06/2026', '12/06/2026', '06/06/2026', '31/05/2026'
    ];
    const reviewTemplates = {
        'Nguyên liệu làm bánh': [
            'Mùi vị tự nhiên, dùng lên bánh rất ổn. Đóng gói kín nên bảo quản cũng yên tâm.',
            'Nguyên liệu còn mới, định lượng đúng như mô tả. Mình làm thử mẻ đầu đã thấy khác hẳn.',
            'Hàng sạch, không bị vón hay ẩm. Phù hợp để làm bánh tại nhà.',
            'Chất lượng ổn trong tầm giá, shop gói kỹ nên nhận hàng nguyên vẹn.'
        ],
        'Dụng cụ làm bánh': [
            'Dụng cụ cầm chắc tay, dùng thử vài lần thấy tiện và dễ vệ sinh.',
            'Kích thước đúng mô tả, hoàn thiện khá gọn. Rất hợp cho bếp gia đình.',
            'Sản phẩm chắc chắn hơn mình nghĩ, thao tác khi làm bánh nhanh hơn nhiều.',
            'Giao đúng mẫu, dùng ổn. Mình thích nhất là phần chất liệu dễ lau rửa.'
        ],
        'Set nguyên liệu': [
            'Set chuẩn bị khá đầy đủ, rất tiện cho người mới làm bánh lần đầu.',
            'Nguyên liệu trong set được chia hợp lý, làm theo công thức không bị thiếu món quan trọng.',
            'Mình mua để làm cuối tuần, set gọn gàng và tiết kiệm thời gian đi tìm từng món.',
            'Combo đáng tiền, các phần bên trong được đóng riêng nên nhìn rất sạch sẽ.'
        ],
        'Công thức làm bánh': [
            'Công thức dễ theo dõi, nguyên liệu gợi ý rõ ràng nên làm thử khá tự tin.',
            'Các bước hướng dẫn dễ hiểu, thành phẩm gần giống hình minh họa.',
            'Rất hợp cho người mới vì phần chuẩn bị nguyên liệu được liệt kê rõ.',
            'Mình làm theo một lần là ra thành phẩm ổn, sẽ thử thêm công thức khác.'
        ],
        default: [
            'Sản phẩm đúng mô tả, đóng gói kỹ và dùng tốt.',
            'Mình đã dùng thử, chất lượng ổn và phù hợp với nhu cầu làm bánh.',
            'Hàng nhận được sạch đẹp, giao nhanh hơn dự kiến.',
            'Trải nghiệm mua hàng tốt, sẽ cân nhắc mua lại.'
        ]
    };

    const buildStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

    const getProductReviews = (product) => {
        const templates = reviewTemplates[product.category] || reviewTemplates.default;
        const reviewCount = 2 + (product.id % 3);
        return Array.from({ length: reviewCount }, (_, index) => {
            const seed = product.id + index;
            const rating = seed % 7 === 0 ? 4 : seed % 11 === 0 ? 3 : 5;
            return {
                name: reviewNames[seed % reviewNames.length],
                date: reviewDates[(product.id + index * 2) % reviewDates.length],
                rating,
                text: templates[(product.id + index) % templates.length]
            };
        });
    };

    const renderProductReviews = (product) => {
        const reviews = getProductReviews(product);
        const commentsList = document.getElementById('comments-list');
        const averageScore = document.getElementById('review-average-score');
        const averageStars = document.getElementById('review-average-stars');
        const totalCount = document.getElementById('review-total-count');
        const ratingBars = document.getElementById('review-rating-bars');

        if (!commentsList || !averageScore || !averageStars || !totalCount || !ratingBars) return;

        const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        averageScore.textContent = average.toFixed(1);
        averageStars.textContent = buildStars(Math.round(average));
        totalCount.textContent = `(${reviews.length} đánh giá)`;

        ratingBars.innerHTML = [5, 4, 3].map((rating) => {
            const percent = Math.round((reviews.filter(review => review.rating === rating).length / reviews.length) * 100);
            return `
                <div class="bar-item">
                    <span>${rating} sao</span>
                    <div class="bar-bg"><div class="bar-fill" style="width: ${percent}%;"></div></div>
                    <span>${percent}%</span>
                </div>
            `;
        }).join('');

        commentsList.innerHTML = reviews.map(review => `
            <div class="comment-item">
                <div class="comment-avatar">${escapeHTML(review.name.charAt(0))}</div>
                <div class="comment-body">
                    <strong>${escapeHTML(review.name)}</strong>
                    <span class="comment-date">${escapeHTML(review.date)}</span>
                    <div class="comment-stars">${buildStars(review.rating)}</div>
                    <p>${escapeHTML(review.text)}</p>
                </div>
            </div>
        `).join('');
    };

    if (btnBackPrevious) {
        btnBackPrevious.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '../ProductList/product-list.html';
            }
        });
    }

    const loadProducts = async () => {
        try {
            const response = await fetch('../../../../datasets/Products.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return Array.isArray(data) ? data : (data.products || []);
        } catch (error) {
            console.error('Không thể tải dữ liệu từ file Products.json:', error);
            return [];
        }
    };

    const allProducts = await loadProducts();
    window.PRODUCTS_DATA = allProducts;

    // LẤY LINK ẢNH CHUẨN XÁC (Đã sửa lỗi lệch cấp thư mục)
    const getProductImageUrl = (imgPath) => {
        if (!imgPath) return '../../../assets/images/products/Dung_cu/totronbot.png';
        if (imgPath.startsWith('http')) return imgPath; // Nếu là ảnh mạng thì giữ nguyên
        
        // Làm sạch chuỗi: xóa khoảng trắng thừa và chuẩn hóa dấu gạch chéo
        let cleanPath = imgPath.trim().replace(/\/+/g, '/');
        
        // Loại bỏ dấu gạch chéo ở đầu nếu có (ví dụ: "/assets/..." thành "assets/...")
        if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
        }
        
        // Nếu đường dẫn chưa có tiền tố lùi cấp thư mục, thêm '../../../' để trang detail tìm đúng gốc assets
        if (!cleanPath.startsWith('../')) {
            return '../../../' + cleanPath;
        }
        
        return cleanPath;
    };

    // ĐOẠN NÀY LÀ KEY ĐỂ LẤY ID TỪ URL
    const params = new URLSearchParams(window.location.search);
    const requestedId = Number(params.get('id')); // Lấy số từ link
    let product = allProducts.find(p => p.id === requestedId);

    // Nếu không tìm thấy sản phẩm, lấy mặc định sản phẩm đầu tiên
    if (!product && allProducts.length > 0) {
        product = allProducts[0];
    }
    if (!product) return;

    // RENDER THÔNG TIN CHI TIẾT
    document.title = `${product.title} - Bake it!`;
    document.getElementById('product-title').textContent = product.title;
    document.getElementById('product-category').textContent = product.category;
    document.getElementById('product-price').textContent = formatVND(product.price);
    
    // Bổ sung thông tin Set/Phân loại
    document.getElementById('desc-category').textContent = product.category;
    document.getElementById('desc-subcategory').textContent = product.subcategory || "Đang cập nhật";

    const shortDesc = `
        <p><strong>${product.title}</strong> là lựa chọn hoàn hảo cho những ai yêu thích làm bánh tại nhà. Thuộc nhóm <strong>${product.category}</strong> - phân loại <strong>${product.subcategory || ''}</strong>, sản phẩm được Bake it! tuyển chọn kỹ lưỡng để mang lại trải nghiệm sử dụng dễ dàng, an toàn.</p>
        <p>Giúp bạn tiết kiệm thời gian, tối ưu công đoạn chuẩn bị và tạo ra những món bánh thơm ngon, đẹp mắt hơn mỗi ngày.</p>
    `;
    document.getElementById('product-desc').innerHTML = shortDesc;
    document.getElementById('full-description-text').innerHTML = shortDesc;
    renderProductReviews(product);

    // Load Ảnh chính
    const imageUrl = getProductImageUrl(product.img_path);
    const mainImageBox = document.getElementById('main-image-box');
    if (mainImageBox) {
        mainImageBox.style.backgroundImage = `url('${imageUrl}')`;
    }

    // BỘ CHỌN SỐ LƯỢNG
    const qtyInput = document.querySelector('.qty-input');
    const minusBtn = document.querySelector('.qty-btn.minus');
    const plusBtn = document.querySelector('.qty-btn.plus');

    if (minusBtn && qtyInput) {
        minusBtn.addEventListener('click', () => {
            qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
        });
    }
    if (plusBtn && qtyInput) {
        plusBtn.addEventListener('click', () => {
            qtyInput.value = Number(qtyInput.value) + 1;
        });
    }

    // HIỂN THỊ BANNER TOAST KHI MUA
    const toastBanner = document.getElementById('toast-banner');
    const showToast = (message) => {
        if (window.CartStorage && typeof window.CartStorage.showToast === 'function') {
            window.CartStorage.showToast(message);
            return;
        }
        if (toastBanner) {
            toastBanner.textContent = message;
            toastBanner.classList.remove('hidden');
            setTimeout(() => toastBanner.classList.add('hidden'), 3000);
        }
    };

    // NÚT "THÊM VÀO GIỎ" / "MUA NGAY" CỦA SẢN PHẨM CHÍNH TRÊN TRANG
    const btnAddCart = document.getElementById('btn-add-cart');
    const btnBuyNow = document.getElementById('btn-buy-now');

    const getSelectedQty = () => {
        if (!qtyInput) return 1;
        return Math.max(1, Number(qtyInput.value) || 1);
    };

    if (btnAddCart) {
        btnAddCart.addEventListener('click', () => {
            const qty = getSelectedQty();
            if (window.CartStorage && typeof window.CartStorage.addItem === 'function') {
                window.CartStorage.addItem(product.id, qty);
            }
            showToast(`Đã thêm ${qty} "${product.title}" vào giỏ hàng! 🛒`);
        });
    }

    if (btnBuyNow) {
        btnBuyNow.addEventListener('click', () => {
            const qty = getSelectedQty();
            if (window.CartStorage && typeof window.CartStorage.addItem === 'function') {
                window.CartStorage.addItem(product.id, qty);
            }
            window.location.href = '../../Checkout/checkout.html';
        });
    }

    // FORM HỎI ĐÁP
    const faqForm = document.querySelector('.faq-form');
    if (faqForm) {
        faqForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const textarea = faqForm.querySelector('textarea');
            if (textarea && textarea.value.trim() !== '') {
                showToast('Câu hỏi của bạn đã được gửi. Bake it! sẽ phản hồi qua mail nhé!');
                textarea.value = '';
            }
        });
    }

    // SẢN PHẨM LIÊN QUAN
    const relatedGrid = document.getElementById('related-products-grid');

    if (relatedGrid) {
        let related = allProducts.filter(
            p => p.category === product.category && p.id !== product.id
        );

        if (related.length < 4) {
            const filler = allProducts.filter(
                p => p.id !== product.id && !related.includes(p)
            );
            related = related.concat(filler.slice(0, 4 - related.length));
        }

        related = related.slice(0, 4);

        relatedGrid.innerHTML = related.map(p => `
            <div class="product-card"
                 data-id="${p.id}"
                 style="cursor:pointer;">

                <a class="product-card-link" href="./product-detail.html?id=${p.id}">
                <div class="product-card-img"
                     style="background-image: url('${getProductImageUrl(p.img_path)}');">
                </div>

                <h4 class="product-card-title">${p.title}</h4>

                <div class="product-card-brand">
                    Danh mục:
                    <span style="color: #A77B54;">
                        ${p.category}
                    </span>
                </div>
                </a>

                <div class="product-card-footer">
                    <div class="product-card-price">
                        ${formatVND(p.price)}
                    </div>

                    <button
                        class="product-card-btn add-to-cart-btn"
                        data-id="${p.id}">
                        +
                    </button>
                </div>
            </div>
        `).join('');

        relatedGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                if (window.CartStorage && typeof window.CartStorage.addItem === 'function') {
                    window.CartStorage.addItem(Number(btn.dataset.id), 1);
                    window.CartStorage.showToast('Đã thêm sản phẩm vào giỏ hàng! 🛒');
                } else {
                    showToast('Đã thêm sản phẩm vào giỏ hàng! 🛒');
                }

                btn.textContent = '✓';
                setTimeout(() => { btn.textContent = '+'; }, 700);
            });
        });
    }
});
