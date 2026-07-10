document.addEventListener('DOMContentLoaded', async () => {
    const formatVND = (amount) => amount.toLocaleString('vi-VN') + 'đ';
    
    // Gốc lùi cấp để đi từ thư mục hiện tại ra ngoài chứa thư mục assets/
    const IMG_ROOT = '../../../'; 
    const PAGE_SIZE = 12;
    const dataUrl = '../../../../datasets/Products.json';
    const PRODUCT_REQUEST_API_URL = '/api/product-requests';

    // --- HÀM TẢI DỮ LIỆU SẢN PHẨM ---
    const loadProducts = async () => {
        try {
            const response = await fetch(dataUrl);
            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data : (data.products || []);
            }
        } catch (error) {
            console.error('Không thể tải dữ liệu từ file Products.json:', error);
        }
        return [];
    };

    // --- HÀM TỰ ĐỘNG PHÂN TÍCH VÀ BIẾN ĐỔI ĐƯỜNG DẪN ẢNH SỬA LỖI TRẮNG ẢNH ---
    const getProductImageUrl = (imgPath, product = null) => {
        const title = product && product.title ? product.title.trim() : '';
        const cat = product && product.category ? product.category.toLowerCase() : '';

        // TRƯỜNG HỢP 1: Nếu img_path là một link mạng (bắt đầu bằng http:// hoặc https://) -> GIỮ NGUYÊN LINK MẠNG ONLINE
        if (imgPath && /^https?:\/\//i.test(imgPath.trim())) {
            return imgPath.trim();
        }

        if (imgPath && !imgPath.includes("LOCAL_SET")) {
            let normalized = imgPath.replace(/\\/g, '/').trim();
            normalized = normalized.replace(/^(\.\.\/|\.\/)+/, '');
            return IMG_ROOT + normalized;
        }

        // TRƯỜNG HỢP 2: Nếu Set nguyên liệu bị thiếu đường dẫn thì fallback theo tên file trong máy
        if (cat.includes("set") || !imgPath) {
            return `${IMG_ROOT}assets/images/products/Set Nguyen Lieu/${title}.jpg`;
        }

        // TRƯỜNG HỢP 3: Các sản phẩm thông thường (Dụng cụ/Nguyên liệu cơ bản) dùng đường dẫn file trong máy
        let normalized = imgPath.replace(/\\/g, '/').trim();
        // Xóa bỏ các ký tự dấu chấm lùi tầng thừa thãi ở đầu chuỗi (ví dụ: ../ hay ./) để tránh vỡ ảnh trang ngoài
        normalized = normalized.replace(/^(\.\.\/|\.\/)+/, '');
        return IMG_ROOT + normalized;
    };

    const NEW_PRODUCTS_STORAGE_KEY = 'bakeit_new_product_ids';

    function getRandomNewProductIds(products, count = 10) {
        const productIds = products
            .map(product => Number(product.id))
            .filter(id => Number.isFinite(id));

        try {
            const storedIds = JSON.parse(sessionStorage.getItem(NEW_PRODUCTS_STORAGE_KEY) || '[]');
            if (
                Array.isArray(storedIds) &&
                storedIds.length === Math.min(count, productIds.length) &&
                storedIds.every(id => productIds.includes(Number(id)))
            ) {
                return new Set(storedIds.map(Number));
            }
        } catch (error) {
            console.warn('Không thể đọc danh sách sản phẩm mới:', error);
        }

        const shuffledIds = productIds.slice();
        for (let i = shuffledIds.length - 1; i > 0; i--) {
            const randomValue = window.crypto && window.crypto.getRandomValues
                ? window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
                : Math.random();
            const j = Math.floor(randomValue * (i + 1));
            [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
        }

        const selectedIds = shuffledIds.slice(0, Math.min(count, shuffledIds.length));
        sessionStorage.setItem(NEW_PRODUCTS_STORAGE_KEY, JSON.stringify(selectedIds));
        return new Set(selectedIds);
    }

    function applyRandomNewProducts(products) {
        const newProductIds = getRandomNewProductIds(products, 10);
        products.forEach(product => {
            product.is_new = newProductIds.has(Number(product.id));
        });
    }

    const allProducts = await loadProducts();
    applyRandomNewProducts(allProducts);
    window.PRODUCTS_DATA = allProducts;

    const state = {
        category: 'all',
        subcategory: 'all',
        priceRanges: [], 
        keyword: '',
        sort: 'Phổ biến',
        page: 1
    };

    const defaultState = {
        category: 'all',
        subcategory: 'all',
        keyword: '',
        sort: 'Phổ biến',
        page: 1
    };

    function readStateFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const pageFromUrl = Number(params.get('page'));

        state.category = params.get('category') || defaultState.category;
        state.subcategory = params.get('subcategory') || defaultState.subcategory;
        state.keyword = (params.get('keyword') || defaultState.keyword).toLowerCase().trim();
        state.sort = params.get('sort') || defaultState.sort;
        state.page = Number.isInteger(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : defaultState.page;
        state.priceRanges = (params.get('prices') || '')
            .split(',')
            .filter(Boolean)
            .map(range => {
                const [min, max] = range.split('-').map(Number);
                return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
            })
            .filter(Boolean);
    }

    function writeStateToUrl() {
        const params = new URLSearchParams();

        if (state.page !== defaultState.page) params.set('page', String(state.page));
        if (state.category !== defaultState.category) params.set('category', state.category);
        if (state.subcategory !== defaultState.subcategory) params.set('subcategory', state.subcategory);
        if (state.keyword !== defaultState.keyword) params.set('keyword', state.keyword);
        if (state.sort !== defaultState.sort) params.set('sort', state.sort);
        if (state.priceRanges.length > 0) {
            params.set('prices', state.priceRanges.map(range => `${range.min}-${range.max}`).join(','));
        }

        const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({ productListState: { ...state } }, '', nextUrl);
    }

    function updateFilterControlsFromState() {
        if (searchInput) searchInput.value = state.keyword;
        if (sortSelect) sortSelect.value = state.sort;

        priceCheckboxes.forEach(cb => {
            const min = Number(cb.dataset.min);
            const max = Number(cb.dataset.max);
            cb.checked = state.priceRanges.some(range => range.min === min && range.max === max);
        });

        document.querySelectorAll('.category-tree li').forEach(item => item.classList.remove('active'));
        if (state.category === 'all') {
            document.querySelector('.category-tree > li[data-category="all"]')?.classList.add('active');
        } else {
            document.querySelector(`.category-tree > li[data-category="${state.category}"]`)?.classList.add('active');
            if (state.subcategory !== 'all') {
                document.querySelector(`.category-tree li[data-parent="${state.category}"][data-subcategory="${state.subcategory}"]`)?.classList.add('active');
            }
        }

        document.querySelectorAll('.category-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.category === state.category);
        });
    }

    const mainGrid = document.getElementById('shop-main-grid');
    const promoGrid = document.getElementById('promo-mini-grid');
    const tagsContainer = document.getElementById('tags-container');
    const resultsCountText = document.querySelector('.results-count');
    const sortSelect = document.querySelector('.sort-select-wrapper select');
    const paginationWrapper = document.querySelector('.pagination-wrapper');
    const searchInput = document.getElementById('search-input'); 
    const categoryTree = document.querySelector('.category-tree');
    const priceCheckboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
    const btnClearFilters = document.getElementById('btn-clear-filters');

    const uniqueCategories = [...new Set(allProducts.map(p => p.category))];
    if (tagsContainer) {
        tagsContainer.innerHTML = [
            `<div class="category-pill active" data-category="all">Tất cả sản phẩm</div>`,
            ...uniqueCategories.map(cat => `<div class="category-pill" data-category="${cat}">${cat}</div>`)
        ].join('');
    }

    readStateFromUrl();
    updateFilterControlsFromState();

    function getFilteredProducts() {
        let result = allProducts.slice();

        if (state.category !== 'all') {
            result = result.filter(p => p.category === state.category);
        }

        if (state.subcategory !== 'all') {
            result = result.filter(p => p.subcategory && p.subcategory.toString() === state.subcategory.toString());
        }

        if (state.priceRanges.length > 0) {
            result = result.filter(p =>
                state.priceRanges.some(range => p.price >= range.min && p.price <= range.max)
            );
        }

        if (state.keyword) {
            result = result.filter(p =>
                p.title.toLowerCase().includes(state.keyword) ||
                p.category.toLowerCase().includes(state.keyword)
            );
        }

        if (state.sort === 'Giá tăng dần') {
            result.sort((a, b) => a.price - b.price);
        } else if (state.sort === 'Giá giảm dần') {
            result.sort((a, b) => b.price - a.price);
        } else if (state.sort === 'Phổ biến') {
            result.sort((a, b) => {
                const aPopular = Number(a.is_popular || 0);
                const bPopular = Number(b.is_popular || 0);
                if (aPopular !== bPopular) return bPopular - aPopular;
                return (Number(b.sales || 0)) - (Number(a.sales || 0));
            });
        } else if (state.sort === 'Mới nhất') {
            result.sort((a, b) => {
                if (Number(a.is_new) !== Number(b.is_new)) return Number(b.is_new) - Number(a.is_new);
                return b.id - a.id;
            });
        } else {
            result.sort((a, b) => b.id - a.id);
        }

        return result;
    }

    function productCardHTML(prod) {
        const imageUrl = getProductImageUrl(prod.img_path, prod);
        const detailUrl = `../ProductDetail/product-detail.html?id=${prod.id}`;
        return `
            <div class="product-card" data-id="${prod.id}">
                <a class="product-card-link" href="${detailUrl}">
                <div class="product-card-media">
                    <div class="product-card-img" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;"></div>
                    ${prod.is_new ? '<span class="product-card-badge">Mới</span>' : ''}
                </div>
                <h4 class="product-card-title" title="${prod.title}">${prod.title}</h4>
                <div class="product-card-brand">Danh mục: <span style="color: #A77B54; font-weight:600;">${prod.category}</span></div>
                </a>
                <div class="product-card-footer">
                    <div class="product-card-price">${formatVND(prod.price)}</div>
                    <button class="product-card-btn add-to-cart-btn" data-id="${prod.id}">+</button>
                </div>
            </div>
        `;
    }

    function renderMainGrid() {
        if (!mainGrid) return;
        const filtered = getFilteredProducts();

        mainGrid.classList.remove('fade-in');
        void mainGrid.offsetWidth; 

        if (filtered.length === 0) {
            mainGrid.innerHTML = `
                <div style="grid-column: span 4; text-align: center; padding: 60px 20px; color: #9c8476;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🍞</div>
                    <h3 style="color: #4a3329; margin-bottom: 10px; font-weight: 700;">Sản phẩm đang được cập nhật</h3>
                    <p style="font-size: 14px; color: #7c6b61;">Bake it! đang chuẩn bị những nguyên liệu tươi ngon nhất cho danh mục này. Bạn quay lại sau nhé!</p>
                </div>
            `;
            if (resultsCountText) resultsCountText.textContent = `Hiển thị 0 kết quả`;
            renderPagination(0);
        } else {
            const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            if (state.page > totalPages) {
                state.page = totalPages;
                writeStateToUrl();
            }
            const startIdx = (state.page - 1) * PAGE_SIZE;
            const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

            mainGrid.innerHTML = pageItems.map(productCardHTML).join('');

            if (resultsCountText) {
                resultsCountText.textContent = `Hiển thị ${startIdx + 1} - ${startIdx + pageItems.length} trong tổng số ${filtered.length} kết quả`;
            }

            bindCardEvents(mainGrid);
            renderPagination(totalPages);
        }
        
        mainGrid.classList.add('fade-in');
    }

    function renderPagination(totalPages) {
        if (!paginationWrapper) return;
        if (totalPages <= 1) {
            paginationWrapper.innerHTML = '';
            return;
        }
        let html = '';
        
        if (state.page > 1) {
            html += `<button class="page-nav-btn" data-page="${state.page - 1}">&laquo;</button>`;
        }
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn" data-page="${i}" style="min-width:36px;height:36px;border-radius:6px;border:1px solid #E6DEC9;background:${i === state.page ? '#4a3329' : '#fff'};color:${i === state.page ? '#fff' : '#4a3329'};cursor:pointer;font-weight:600;font-family:'Baloo 2',cursive;">${i}</button>`;
        }
        
        if (state.page < totalPages) {
            html += `<button class="page-nav-btn" data-page="${state.page + 1}">&raquo;</button>`;
        }

        paginationWrapper.innerHTML = html;
        paginationWrapper.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                state.page = Number(btn.dataset.page);
                writeStateToUrl();
                renderMainGrid();
                mainGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

 function bindCardEvents(container) {
        container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(window.CartStorage) {
                     window.CartStorage.addItem(Number(btn.dataset.id), 1);
                     window.CartStorage.showToast('Đã thêm sản phẩm vào giỏ hàng');
                } else {
                     alert("Đã thêm vào giỏ hàng!");
                }
                btn.textContent = '✓';
                btn.style.background = '#389e0d';
                setTimeout(() => {
                    btn.textContent = '+';
                    btn.style.background = '';
                }, 700);
            });
        });
    }
    function renderPromoGrid() {
        if (!promoGrid) return;
        const promoProducts = allProducts.slice(0, 6);
        
        promoGrid.innerHTML = promoProducts.map((prod, idx) => `
            <div class="mini-card" data-id="${prod.id}" style="cursor:pointer;">
                <a class="mini-card-link" href="../ProductDetail/product-detail.html?id=${prod.id}">
                <div class="mini-card-media">
                    <div class="mini-card-img" style="background-image: url('${getProductImageUrl(prod.img_path, prod)}'); background-size: cover; background-position: center;"></div>
                </div>
                <div class="mini-card-status" style="color: #d4591d; font-weight: 500;">
                    ● Số lượng có hạn
                </div>
                <h5 class="mini-card-title" title="${prod.title}">${prod.title}</h5>
                </a>
                <div class="mini-card-footer">
                    <div class="mini-card-price">${formatVND(prod.price - 5000)}</div>
                    <button class="mini-card-btn add-to-cart-btn" data-id="${prod.id}">Mua</button>
                </div>
            </div>
        `).join('');

        promoGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(window.CartStorage) {
                    window.CartStorage.addItem(Number(btn.dataset.id), 1);
                    window.CartStorage.showToast('Đã thêm sản phẩm vào giỏ hàng');
                } else {
                     alert("Đã thêm vào giỏ hàng!");
                }
                btn.textContent = 'Đã thêm ✓';
                setTimeout(() => btn.textContent = 'Mua', 700);
            });
        });
    }

    function syncCategorySelection(category, subcategory = 'all') {
        state.category = category;
        state.subcategory = subcategory;
        state.page = 1;
        updateFilterControlsFromState();
        writeStateToUrl();
        renderMainGrid();
    }

    if (categoryTree) {
        categoryTree.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const category = li.dataset.category || li.dataset.parent || 'all';
                const subcategory = li.dataset.subcategory || 'all';
                syncCategorySelection(category, subcategory);
            });
        });
    }

    if (tagsContainer) {
        tagsContainer.addEventListener('click', (e) => {
            const pill = e.target.closest('.category-pill');
            if (!pill) return;
            const cat = pill.dataset.category;
            syncCategorySelection(cat, 'all');
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    }

    priceCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            state.priceRanges = Array.from(priceCheckboxes)
                .filter(el => el.checked)
                .map(el => ({ min: Number(el.dataset.min), max: Number(el.dataset.max) }));
            state.page = 1;
            writeStateToUrl();
            renderMainGrid();
        });
    });

    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            state.category = 'all';
            state.subcategory = 'all';
            state.priceRanges = [];
            state.keyword = '';
            state.page = 1;
            if (searchInput) searchInput.value = '';
            priceCheckboxes.forEach(cb => cb.checked = false);
            syncCategorySelection('all', 'all');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.keyword = e.target.value.toLowerCase().trim();
            state.page = 1;
            writeStateToUrl();
            renderMainGrid();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sort = e.target.value;
            state.page = 1;
            writeStateToUrl();
            renderMainGrid();
        });
    }

    const requestForm = document.getElementById('product-request-form');
    const toastBanner = document.getElementById('toast-banner');
    const requestSubmitBtn = requestForm ? requestForm.querySelector('.form-submit-btn') : null;

    const saveProductRequest = async (requestData) => {
        const response = await fetch(PRODUCT_REQUEST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        return data;
    };

    if (requestForm) {
        requestForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const productName = document.getElementById('req-product-name').value.trim();
            const email = document.getElementById('req-email').value.trim();
            const note = document.getElementById('req-note').value.trim();

            if (requestSubmitBtn) {
                requestSubmitBtn.disabled = true;
                requestSubmitBtn.textContent = 'ĐANG GỬI...';
            }

            try {
                await saveProductRequest({
                    ProductName: productName,
                    Email: email,
                    Note: note
                });
            } catch (error) {
                alert('Không thể lưu yêu cầu vào datasets/ProductRequest.json. Hãy chạy bằng server.js thay vì Live Server/static server.');
                if (requestSubmitBtn) {
                    requestSubmitBtn.disabled = false;
                    requestSubmitBtn.textContent = 'GỬI YÊU CẦU';
                }
                return;
            }

            if (toastBanner) {
                toastBanner.classList.remove('hidden');
                setTimeout(() => {
                    toastBanner.classList.add('hidden');
                }, 3000);
            }
            
            requestForm.reset();
            if (requestSubmitBtn) {
                requestSubmitBtn.disabled = false;
                requestSubmitBtn.textContent = 'GỬI YÊU CẦU';
            }
        });
    }

    const navDropdownLinks = document.querySelectorAll('.nav-dropdown-link');
    navDropdownLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            const category = link.dataset.category;
            syncCategorySelection(category, 'all');
            
            const shopLayout = document.querySelector('.shop-layout');
            if (shopLayout) {
                const headerOffset = 100; 
                const elementPosition = shopLayout.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    renderMainGrid();
    renderPromoGrid();
});
