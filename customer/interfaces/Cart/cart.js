document.addEventListener('DOMContentLoaded', async () => {
    const formatVND = (amount) => amount.toLocaleString('vi-VN') + 'đ';
    const IMG_ROOT = '../';
    const dataUrl = '../../../datasets/Products.json';
    const SELECTED_CART_KEY = 'BAKEIT_SELECTED_CART_IDS';
    const getImageUrl = (imgPath) => (imgPath && imgPath.startsWith('http')) ? imgPath : `${IMG_ROOT}${imgPath || ''}`;
    const escapeHTML = (value = '') => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const loadProducts = async () => {
        try {
            const response = await fetch(dataUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return Array.isArray(data) ? data : (data.products || []);
        } catch (error) {
            console.error('Không thể tải dữ liệu sản phẩm cho giỏ hàng:', error);
            return [];
        }
    };

    const products = await loadProducts();
    window.PRODUCTS_DATA = products;

    const cartLayout = document.getElementById('cart-layout');
    const emptyState = document.getElementById('cart-empty-state');
    const tbody = document.getElementById('cart-table-body');
    const summaryItemCount = document.getElementById('summary-item-count');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotal = document.getElementById('summary-total');
    const btnCheckout = document.getElementById('btn-checkout-page');
    const selectAllCheckbox = document.getElementById('select-all-cart-items');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');

    let selectedIds = new Set();
    let hasSavedSelection = false;

    const readSelectedIds = () => {
        try {
            const raw = sessionStorage.getItem(SELECTED_CART_KEY);
            hasSavedSelection = raw !== null;
            const ids = raw ? JSON.parse(raw) : [];
            return new Set(Array.isArray(ids) ? ids.map(Number) : []);
        } catch (error) {
            hasSavedSelection = false;
            return new Set();
        }
    };

    const saveSelectedIds = () => {
        sessionStorage.setItem(SELECTED_CART_KEY, JSON.stringify([...selectedIds]));
        hasSavedSelection = true;
    };

    const syncSelectedIdsWithCart = (items) => {
        const cartIds = items.map(item => item.id);
        if (!hasSavedSelection) {
            selectedIds = new Set(cartIds);
            saveSelectedIds();
            return;
        }
        selectedIds = new Set([...selectedIds].filter(id => cartIds.includes(id)));
        saveSelectedIds();
    };

    const getSelectedItems = (items) => items.filter(item => selectedIds.has(item.id));

    const updateSelectionSummary = (items) => {
        const selectedItems = getSelectedItems(items);
        const totalCount = selectedItems.reduce((sum, i) => sum + i.qty, 0);
        const totalPrice = selectedItems.reduce((sum, i) => sum + i.subtotal, 0);

        summaryItemCount.textContent = `Tạm tính (${totalCount} sản phẩm đã chọn):`;
        summarySubtotal.textContent = formatVND(totalPrice);
        summaryTotal.textContent = formatVND(totalPrice);

        if (selectAllCheckbox) {
            selectAllCheckbox.checked = items.length > 0 && selectedItems.length === items.length;
            selectAllCheckbox.indeterminate = selectedItems.length > 0 && selectedItems.length < items.length;
        }

        if (btnDeleteSelected) {
            btnDeleteSelected.disabled = selectedItems.length === 0;
        }

        if (btnCheckout) {
            btnCheckout.disabled = selectedItems.length === 0;
            btnCheckout.textContent = selectedItems.length === 0 ? 'CHỌN SẢN PHẨM ĐỂ THANH TOÁN' : 'TIẾN HÀNH THANH TOÁN';
        }
    };

    function renderCartPage() {
        const items = CartStorage.getCartDetails();

        if (items.length === 0) {
            if (cartLayout) cartLayout.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        if (cartLayout) cartLayout.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        syncSelectedIdsWithCart(items);

        tbody.innerHTML = items.map(item => `
            <tr class="cart-table-row" data-id="${item.id}">
                <td class="col-select">
                    <input type="checkbox" class="cart-item-checkbox cart-select-checkbox" data-id="${item.id}" ${selectedIds.has(item.id) ? 'checked' : ''} aria-label="Chọn ${escapeHTML(item.title)}">
                </td>
                <td class="col-img">
                    <div class="cart-prod-img" style="background-image: url('${getImageUrl(item.img_path)}');"></div>
                </td>
                <td class="col-name">
                    <h4 class="cart-prod-name">${escapeHTML(item.title)}</h4>
                    <span class="cart-prod-brand">Danh mục: ${escapeHTML(item.category)}</span>
                </td>
                <td class="col-price">${formatVND(item.price)}</td>
                <td class="col-qty">
                    <div class="cart-qty-box">
                        <button class="cart-qty-btn minus" data-id="${item.id}" type="button">-</button>
                        <input type="number" class="cart-qty-input" data-id="${item.id}" value="${item.qty}" min="1">
                        <button class="cart-qty-btn plus" data-id="${item.id}" type="button">+</button>
                    </div>
                </td>
                <td class="col-subtotal">${formatVND(item.subtotal)}</td>
                <td class="col-remove">
                    <button class="btn-remove-item" data-id="${item.id}" title="Xóa mặt hàng này">×</button>
                </td>
            </tr>
        `).join('');

        updateSelectionSummary(items);

        bindRowEvents();
    }

    function bindRowEvents() {
        tbody.querySelectorAll('.cart-item-checkbox').forEach(input => {
            input.addEventListener('change', () => {
                const id = Number(input.dataset.id);
                if (input.checked) {
                    selectedIds.add(id);
                } else {
                    selectedIds.delete(id);
                }
                saveSelectedIds();
                updateSelectionSummary(CartStorage.getCartDetails());
            });
        });
        tbody.querySelectorAll('.cart-qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                const cart = CartStorage.getCart();
                const item = cart.find(i => i.id === id);
                if (item) CartStorage.setQty(id, Math.max(1, item.qty - 1));
                renderCartPage();
            });
        });
        tbody.querySelectorAll('.cart-qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                const cart = CartStorage.getCart();
                const item = cart.find(i => i.id === id);
                if (item) CartStorage.setQty(id, item.qty + 1);
                renderCartPage();
            });
        });
        tbody.querySelectorAll('.cart-qty-input').forEach(input => {
            input.addEventListener('change', () => {
                const id = Number(input.dataset.id);
                let val = parseInt(input.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                CartStorage.setQty(id, val);
                renderCartPage();
            });
        });
        tbody.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                selectedIds.delete(id);
                saveSelectedIds();
                CartStorage.removeItem(id);
                renderCartPage();
            });
        });
    }

    selectedIds = readSelectedIds();

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const items = CartStorage.getCartDetails();
            selectedIds = selectAllCheckbox.checked
                ? new Set(items.map(item => item.id))
                : new Set();
            saveSelectedIds();
            renderCartPage();
        });
    }

    if (btnDeleteSelected) {
        btnDeleteSelected.addEventListener('click', () => {
            if (selectedIds.size === 0) {
                alert('Vui lòng chọn sản phẩm cần xóa.');
                return;
            }

            selectedIds.forEach(id => CartStorage.removeItem(id));
            selectedIds = new Set();
            saveSelectedIds();
            renderCartPage();
        });
    }

// Thay thế đoạn xử lý click cũ trong file cart.js của bạn:
if (btnCheckout) {
    btnCheckout.addEventListener('click', () => {
        const items = CartStorage.getCartDetails();
        const selectedItems = getSelectedItems(items);
        if (items.length === 0) {
            alert('Giỏ hàng của bạn đang trống!');
            return;
        }
        if (selectedItems.length === 0) {
            alert('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.');
            return;
        }
        saveSelectedIds();
        // Chuyển hướng sang trang checkout nằm cùng thư mục
window.location.href = '../Checkout/checkout.html';    });
}
    renderCartPage();
});
