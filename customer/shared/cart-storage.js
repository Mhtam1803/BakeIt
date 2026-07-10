(function () {
    const STORAGE_KEY = 'BAKEIT_CART';

    // Tạo thông báo Toast động nếu trang chưa có
    function ensureToast() {
        if (document.getElementById('cart-toast')) return;
        const toast = document.createElement('div');
        toast.id = 'cart-toast';
        toast.style.cssText = [
            'position: fixed', 'bottom: 30px', 'left: 50%', 'transform: translateX(-50%) translateY(20px)',
            'z-index: 99999', 'background: #8CBA80', 'color: #1a4012', 'padding: 14px 28px',
            'border-radius: 30px', 'font-weight: 600', 'box-shadow: 0 4px 15px rgba(140, 186, 128, 0.4)',
            'opacity: 0', 'transition: opacity 0.4s ease, transform 0.4s ease', 'pointer-events: none'
        ].join(';');
        document.body.appendChild(toast);
    }

    const CartStorage = {
        getCart() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (error) {
                return [];
            }
        },
        saveCart(cart) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
            this.dispatchUpdate(); // Báo cho toàn trang biết giỏ hàng đã thay đổi
        },
        addItem(id, qty = 1) {
            const cart = this.getCart();
            const existing = cart.find(item => item.id === id);
            if (existing) {
                existing.qty += qty;
            } else {
                cart.push({ id, qty });
            }
            this.saveCart(cart);
            return this.getItemCount();
        },
        setQty(id, qty) {
            const safeQty = Math.max(1, Number(qty) || 1);
            const cart = this.getCart().map(item => item.id === id ? { ...item, qty: safeQty } : item);
            this.saveCart(cart);
        },
        removeItem(id) {
            const cart = this.getCart().filter(item => item.id !== id);
            this.saveCart(cart);
        },
        clear() {
            this.saveCart([]);
        },
        getItemCount() {
            return this.getCart().reduce((sum, item) => sum + item.qty, 0);
        },
        getCartDetails() {
            const products = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
            return this.getCart().map(item => {
                const product = products.find(p => p.id === item.id);
                if (!product) return null;
                return { ...product, qty: item.qty, subtotal: product.price * item.qty };
            }).filter(Boolean);
        },
        getTotalPrice() {
            return this.getCartDetails().reduce((sum, item) => sum + item.subtotal, 0);
        },
        showToast(message) {
            // Ưu tiên dùng banner toast có sẵn trong HTML (của trang List và Detail)
            const existingToast = document.getElementById('toast-banner');
            if (existingToast) {
                existingToast.textContent = message;
                existingToast.classList.remove('hidden');
                setTimeout(() => existingToast.classList.add('hidden'), 3000);
                return;
            }
            // Nếu không có thì dùng toast động
            ensureToast();
            const toast = document.getElementById('cart-toast');
            toast.textContent = message;
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
            clearTimeout(toast._hideTimer);
            toast._hideTimer = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(20px)';
            }, 2500);
        },
        dispatchUpdate() {
            // Phát sự kiện để Header (global-layout.js) và trang Cart tự động cập nhật
            document.dispatchEvent(new CustomEvent('cart:updated', { detail: this.getCart() }));
        }
    };

    window.CartStorage = CartStorage;
})();