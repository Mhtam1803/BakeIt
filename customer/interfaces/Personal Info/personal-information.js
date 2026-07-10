document.addEventListener('DOMContentLoaded', () => {
    const ACCOUNT_KEY = 'bakeit_account';
    const ORDERS_KEY = 'bakeit_orders';
    const ORDERS_API_URL = '/api/orders';
    const formatVND = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

    // =========================================================
    // 1) CHUYỂN TAB (Thông tin cá nhân / Lịch sử / Bảo mật)
    // =========================================================
    window.switchTab = function (tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById('content-' + tabId);
        if (target) target.classList.remove('hidden');

        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('bg-[#f0f5f8]', 'border-l-4', 'border-[#82aac4]', 'text-stone-800', 'font-semibold');
            btn.classList.add('text-stone-600');
            const iconWrap = btn.querySelector('span.w-5');
            if (iconWrap) {
                iconWrap.classList.remove('bg-[#82aac4]/20', 'text-[#82aac4]');
                iconWrap.classList.add('bg-stone-100', 'text-stone-400');
            }
            const caret = btn.querySelector('.fa-caret-right');
            if (caret) { caret.classList.remove('text-[#82aac4]'); caret.classList.add('text-stone-300'); }
        });

        const activeBtn = document.getElementById('btn-' + tabId);
        if (activeBtn) {
            activeBtn.classList.add('bg-[#f0f5f8]', 'border-l-4', 'border-[#82aac4]', 'text-stone-800', 'font-semibold');
            activeBtn.classList.remove('text-stone-600');
            const iconWrap = activeBtn.querySelector('span.w-5');
            if (iconWrap) {
                iconWrap.classList.add('bg-[#82aac4]/20', 'text-[#82aac4]');
                iconWrap.classList.remove('bg-stone-100', 'text-stone-400');
            }
            const caret = activeBtn.querySelector('.fa-caret-right');
            if (caret) { caret.classList.add('text-[#82aac4]'); caret.classList.remove('text-stone-300'); }
        }
    };

    // =========================================================
    // 2) MODAL (Đổi mật khẩu / 2FA / Thiết bị)
    // =========================================================
    window.toggleModal = function (modalId, show) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const box = modal.querySelector('div');
        if (show) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                modal.classList.add('opacity-100');
                if (box) { box.classList.remove('scale-95'); box.classList.add('scale-100'); }
            });
        } else {
            modal.classList.remove('opacity-100');
            modal.classList.add('opacity-0');
            if (box) { box.classList.remove('scale-100'); box.classList.add('scale-95'); }
            setTimeout(() => modal.classList.add('hidden'), 200);
        }
    };

    // =========================================================
    // 3) TÀI KHOẢN / TRA CỨU ĐƠN VÃNG LAI
    // =========================================================
    const tbody = document.getElementById('order-history-tbody');
    let allOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const guestLookupBox = document.getElementById('guest-order-lookup');
    const lookupForm = document.getElementById('form-order-lookup');
    const raw = localStorage.getItem(ACCOUNT_KEY);
    const account = raw ? JSON.parse(raw) : null;
    let guestLookupResults = [];
    let pendingCancelOrderId = null;
    const cancelOrderModal = document.getElementById('modal-cancel-order');
    const cancelOrderForm = document.getElementById('form-cancel-order');
    const cancelOrderError = document.getElementById('cancel-order-error');
    const btnCloseCancelOrder = document.getElementById('btn-close-cancel-order');
    const btnDismissCancelOrder = document.getElementById('btn-cancel-order-dismiss');

    const getMyOrders = () => {
        if (!account) return [];
        return allOrders.filter(o =>
            (o.accountEmail && account.Email && o.accountEmail.toLowerCase() === account.Email.toLowerCase()) ||
            (o.email && account.Email && o.email.toLowerCase() === account.Email.toLowerCase())
        );
    };

    const getStatusLabel = (order) => {
        if (order.status === 'Cancelled') {
            return '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">Đã hủy</span>';
        }
        if (order.paymentMethod === 'COD') {
            return '<span class="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">Chờ giao hàng (COD)</span>';
        }
        return '<span class="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">Đã thanh toán online</span>';
    };

    const openCancelOrderModal = (orderId) => {
        const order = allOrders.find(o => String(o.id) === String(orderId));
        if (!order || order.status === 'Cancelled') return;

        pendingCancelOrderId = order.id;
        if (cancelOrderForm) cancelOrderForm.reset();
        if (cancelOrderError) cancelOrderError.classList.add('hidden');
        window.toggleModal('modal-cancel-order', true);
    };

    const closeCancelOrderModal = () => {
        pendingCancelOrderId = null;
        if (cancelOrderForm) cancelOrderForm.reset();
        if (cancelOrderError) cancelOrderError.classList.add('hidden');
        window.toggleModal('modal-cancel-order', false);
    };

    const requestCancelOrder = async (order, reason) => {
        const datasetOrderId = order.OrderID || order.id;
        const response = await fetch(`${ORDERS_API_URL}/${encodeURIComponent(datasetOrderId)}/cancel`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        return data;
    };

    const syncAdminOrderCache = (order, updatedDatasetOrder) => {
        const adminOrdersKey = 'bakeit_admin_orders';
        let cached = [];
        try {
            cached = JSON.parse(localStorage.getItem(adminOrdersKey) || '[]');
        } catch (error) {
            return;
        }
        if (!Array.isArray(cached) || !cached.length) return;

        const datasetOrderId = updatedDatasetOrder.OrderID || order.OrderID;
        const publicOrderCode = updatedDatasetOrder.PublicOrderCode || order.id;
        let hasChange = false;

        cached.forEach(item => {
            const sameOrder =
                String(item.id || item.OrderID || '') === String(datasetOrderId || '') ||
                String(item.PublicOrderCode || '') === String(publicOrderCode || '');

            if (!sameOrder) return;
            item.status = 'Cancelled';
            item.OrderStatus = 'Cancelled';
            item.trackingCode = '';
            item.TrackingCode = null;
            item.shippingCarrier = '';
            item.ShippingCarrier = null;
            item.cancelledAt = updatedDatasetOrder.CancelledAt;
            item.cancelReason = updatedDatasetOrder.CancelReason;
            item.fulfillment = Object.assign({}, item.fulfillment || {}, { deliveryStatus: 'Cancelled' });
            item.Fulfillment = Object.assign({}, item.Fulfillment || {}, { DeliveryStatus: 'Cancelled' });
            if (item.payment) item.payment.status = 'Failed';
            if (item.Payment) item.Payment.PaymentStatus = 'Failed';
            hasChange = true;
        });

        if (hasChange) {
            localStorage.setItem(adminOrdersKey, JSON.stringify(cached));
        }
    };

    const cancelOrder = async (orderId, reason) => {
        const order = allOrders.find(o => String(o.id) === String(orderId));
        if (!order || order.status === 'Cancelled') return;

        let updatedDatasetOrder;
        try {
            updatedDatasetOrder = await requestCancelOrder(order, reason);
        } catch (error) {
            if (cancelOrderError) {
                cancelOrderError.textContent = 'Không thể cập nhật trạng thái sang admin. Hãy chạy bằng server.js rồi thử lại.';
                cancelOrderError.classList.remove('hidden');
            }
            return;
        }

        order.status = 'Cancelled';
        order.cancelledAt = new Date().toISOString();
        order.cancelReason = reason;
        syncAdminOrderCache(order, updatedDatasetOrder);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(allOrders));
        closeCancelOrderModal();
        alert(`Đã hủy đơn ${order.id}.`);

        if (account) {
            renderOrders(getMyOrders(), 'Bạn chưa có đơn hàng nào. Hãy ghé Trang chủ để mua sắm nhé!');
        } else {
            guestLookupResults = guestLookupResults.map(item =>
                String(item.id) === String(order.id) ? order : item
            );
            renderOrders(guestLookupResults, 'Không tìm thấy đơn hàng khớp với thông tin bạn nhập.');
        }
    };

    const bindCancelOrderButtons = () => {
        tbody.querySelectorAll('.btn-cancel-order').forEach(btn => {
            btn.addEventListener('click', () => openCancelOrderModal(btn.dataset.orderId));
        });
    };

    if (btnCloseCancelOrder) {
        btnCloseCancelOrder.addEventListener('click', closeCancelOrderModal);
    }

    if (btnDismissCancelOrder) {
        btnDismissCancelOrder.addEventListener('click', closeCancelOrderModal);
    }

    if (cancelOrderModal) {
        cancelOrderModal.addEventListener('click', (event) => {
            if (event.target === cancelOrderModal) closeCancelOrderModal();
        });
    }

    if (cancelOrderForm) {
        cancelOrderForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const selectedReason = cancelOrderForm.querySelector('input[name="cancel-reason"]:checked');
            if (!selectedReason) {
                if (cancelOrderError) {
                    cancelOrderError.textContent = 'Vui lòng chọn lý do hủy đơn.';
                    cancelOrderError.classList.remove('hidden');
                }
                return;
            }
            if (!pendingCancelOrderId) return;
            cancelOrder(pendingCancelOrderId, selectedReason.value);
        });
    }

    const renderOrders = (orders, emptyMessage) => {
        if (!orders.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-xs text-stone-400">${emptyMessage}</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const productSummary = order.items.map(i => `${i.title} x${i.qty}`).join(', ');
            const statusLabel = getStatusLabel(order);
            const isCancelled = order.status === 'Cancelled';
            const actionButton = isCancelled
                ? '<button type="button" class="order-action-disabled" disabled>Đã hủy</button>'
                : `<button type="button" class="btn-cancel-order" data-order-id="${order.id}">Hủy đơn</button>`;
            return `
                <tr>
                    <td class="p-4 font-bold text-[#5a2d16]">${order.id}</td>
                    <td class="p-4 text-xs text-stone-400">${new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                    <td class="p-4 font-medium">${productSummary}</td>
                    <td class="p-4 text-right font-semibold text-[#D96B43]">${formatVND(order.total)}</td>
                    <td class="p-4 text-center">${statusLabel}</td>
                    <td class="p-4 text-center">${actionButton}</td>
                </tr>
            `;
        }).join('');
        bindCancelOrderButtons();
    };

    if (!account) {
        document.title = 'Tra cứu đơn hàng - Bake it!';
        document.getElementById('aside-username').textContent = 'Khách vãng lai';
        document.getElementById('aside-avatar').textContent = 'B';
        document.getElementById('btn-logout').classList.add('hidden');
        document.getElementById('btn-part-1').classList.add('hidden');
        document.getElementById('btn-part-3').classList.add('hidden');
        document.getElementById('order-section-title').innerHTML = '<i class="fa-solid fa-magnifying-glass mr-2 text-sm text-[#82aac4]"></i> Tra cứu đơn hàng';
        document.getElementById('order-section-desc').textContent = 'Nhập mã đơn hàng và SĐT hoặc email đã dùng khi đặt hàng để xem thông tin đơn.';
        guestLookupBox.classList.remove('hidden');
        window.switchTab('part-2');
        renderOrders([], 'Nhập thông tin bên trên để tra cứu đơn hàng của bạn.');
    } else {
        const displayName = account.FullName || 'Thành viên Bake it!';
        const usernameTag = '@' + (account.Email ? account.Email.split('@')[0] : 'member');
        const initial = displayName.trim().charAt(0).toUpperCase() || 'B';

        document.getElementById('aside-username').textContent = usernameTag;
        document.getElementById('aside-avatar').textContent = initial;

        // Đổ dữ liệu vào form hồ sơ cá nhân
        document.getElementById('profile-fullname').value = displayName;
        document.getElementById('profile-username').value = usernameTag;
        document.getElementById('profile-email').value = account.Email || '';
        document.getElementById('profile-phone').value = account.Phone || '';
        document.getElementById('profile-address').value = account.Address || '';
        const phoneMasked = document.getElementById('profile-phone-masked');
        if (phoneMasked && account.Phone) {
            phoneMasked.textContent = account.Phone.slice(0, 6) + '***' + account.Phone.slice(-2);
        }

        // Lưu thay đổi hồ sơ
        document.getElementById('form-profile').addEventListener('submit', (e) => {
            e.preventDefault();
            account.FullName = document.getElementById('profile-fullname').value.trim();
            account.Phone = document.getElementById('profile-phone').value.trim();
            account.Address = document.getElementById('profile-address').value.trim();
            localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
            alert('🎉 Đã cập nhật thông tin thành công!');
            document.getElementById('aside-username').textContent = '@' + (account.Email ? account.Email.split('@')[0] : 'member');
        });

        // Đổi mật khẩu (mô phỏng, kiểm tra mật khẩu hiện tại thật)
        document.getElementById('form-change-password').addEventListener('submit', (e) => {
            e.preventDefault();
            const current = document.getElementById('cp-current').value.trim();
            const newPass = document.getElementById('cp-new').value.trim();
            const err = document.getElementById('cp-error');
            if (current !== account.Password) {
                err.textContent = '❌ Mật khẩu hiện tại không đúng!';
                err.classList.remove('hidden');
                return;
            }
            err.classList.add('hidden');
            account.Password = newPass;
            localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
            alert('🔒 Cập nhật mật khẩu thành công!');
            window.toggleModal('modal-password', false);
            e.target.reset();
        });

        // Đăng xuất
        document.getElementById('btn-logout').addEventListener('click', () => {
            localStorage.removeItem(ACCOUNT_KEY);
            alert('Đã đăng xuất tài khoản!');
            window.location.href = '../Category/ProductList/product-list.html';
        });

        renderOrders(getMyOrders(), 'Bạn chưa có đơn hàng nào. Hãy ghé Trang chủ để mua sắm nhé!');
    }

    if (lookupForm) {
        lookupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const orderId = document.getElementById('lookup-order-id').value.trim().toUpperCase();
            const contact = document.getElementById('lookup-contact').value.trim().toLowerCase();

            if (!orderId || !contact) {
                alert('Vui lòng nhập mã đơn hàng và SĐT hoặc email đã đặt hàng.');
                return;
            }

            guestLookupResults = allOrders.filter(order => {
                const sameOrder = String(order.id || '').toUpperCase() === orderId;
                const samePhone = String(order.phone || '').toLowerCase() === contact;
                const sameEmail = String(order.email || '').toLowerCase() === contact;
                return sameOrder && (samePhone || sameEmail);
            });

            renderOrders(guestLookupResults, 'Không tìm thấy đơn hàng khớp với thông tin bạn nhập.');
        });
    }

});
