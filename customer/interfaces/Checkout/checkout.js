document.addEventListener('DOMContentLoaded', async () => {
    const formatVND = (amount) => amount.toLocaleString('vi-VN') + 'đ';
    const IMG_ROOT = '../../';
    const dataUrl = '../../../datasets/Products.json';
    const ORDERS_API_URL = '/api/orders';
    const SELECTED_CART_KEY = 'BAKEIT_SELECTED_CART_IDS';
    const getImageUrl = (imgPath) => (imgPath && imgPath.startsWith('http')) ? imgPath : `${IMG_ROOT}${imgPath || ''}`;

    const loadProducts = async () => {
        try {
            const response = await fetch(dataUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return Array.isArray(data) ? data : (data.products || []);
        } catch (error) {
            console.error('Không thể tải dữ liệu sản phẩm cho trang thanh toán:', error);
            return [];
        }
    };

    const products = await loadProducts();
    window.PRODUCTS_DATA = products;

    // Nếu khách đã đăng nhập, tự điền sẵn thông tin và ghi nhớ email tài khoản vào đơn hàng
    const storedAccountRaw = localStorage.getItem('bakeit_account');
    const storedAccount = storedAccountRaw ? JSON.parse(storedAccountRaw) : null;
    if (storedAccount) {
        const elName = document.getElementById('txt-fullname');
        const elPhone = document.getElementById('txt-phone');
        const elEmail = document.getElementById('txt-email');
        const elAddress = document.getElementById('txt-address');
        if (elName && !elName.value) elName.value = storedAccount.FullName || '';
        if (elPhone && !elPhone.value) elPhone.value = storedAccount.Phone || '';
        if (elEmail && !elEmail.value) elEmail.value = storedAccount.Email || '';
        if (elAddress && !elAddress.value) elAddress.value = storedAccount.Address || '';
    }

    const paymentRadios = document.querySelectorAll('input[name="payment-option"]');
    const qrPaymentArea = document.getElementById('qr-payment-area');
    const qrDynamicImg = document.getElementById('qr-dynamic-img');
    const qrInstruction = document.getElementById('qr-instruction');
    const btnSubmitOrder = document.getElementById('btn-submit-order');
    const successOverlay = document.getElementById('success-overlay');
    const lblOrderId = document.getElementById('lbl-order-id');
    const successMethodMsg = document.getElementById('success-method-msg');
    const btnSuccessClose = document.getElementById('btn-success-close');
    const checkoutItemsList = document.getElementById('checkout-items-list');
    const checkoutSubtotal = document.getElementById('checkout-subtotal');
    const checkoutTotal = document.getElementById('checkout-total');

    // Khai báo biến DOM Coupon
    const txtCoupon = document.getElementById('txt-coupon');
    const btnApplyCoupon = document.getElementById('btn-apply-coupon');
    const couponMessage = document.getElementById('coupon-message');
    const checkoutDiscount = document.getElementById('checkout-discount');
    const rowDiscount = document.getElementById('row-discount');

    // Biến toàn cục lưu trạng thái coupon đang dùng
    let currentDiscountAmount = 0;
    let appliedCouponCode = "";

    const ORDER_INFO_MEMO = 'Thanh toan don hang Bake It';
    const getSelectedCartIds = () => {
        try {
            const raw = sessionStorage.getItem(SELECTED_CART_KEY);
            if (raw === null) return null;
            const ids = raw ? JSON.parse(raw) : [];
            return Array.isArray(ids) ? ids.map(Number) : [];
        } catch (error) {
            return null;
        }
    };

    const getCheckoutCartDetails = () => {
        const items = CartStorage.getCartDetails();
        const selectedIds = getSelectedCartIds();
        return selectedIds === null ? items : items.filter(item => selectedIds.includes(item.id));
    };

    const buildQrLinks = (amount) => ({
        MOMO: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=2026_momo_payment_bakeit_amount_${amount}`,
        BANK_QR: `https://img.vietqr.io/image/970415-123456789-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(ORDER_INFO_MEMO)}&accountName=BAKE%20IT%20BAKERY`
    });

    const saveOrderToDataset = async (orderRecord) => {
        const response = await fetch(ORDERS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderRecord)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        return data;
    };

    const renderCheckoutSummary = () => {
        const items = getCheckoutCartDetails();
        if (!checkoutItemsList || !checkoutSubtotal || !checkoutTotal) return;

        if (!items.length) {
            checkoutItemsList.innerHTML = '<div style="color:#9c8476; padding: 8px 0;">Giỏ hàng đang trống.</div>';
            checkoutSubtotal.textContent = '0đ';
            checkoutTotal.textContent = '0đ';
            btnSubmitOrder.disabled = true;
            btnSubmitOrder.textContent = 'GIỎ HÀNG ĐANG TRỐNG';
            return;
        }

        btnSubmitOrder.disabled = false;
        btnSubmitOrder.textContent = 'XÁC NHẬN ĐẶT HÀNG';

        checkoutItemsList.innerHTML = items.map(item => `
            <div class="checkout-mini-product">
                <div class="checkout-mini-img" style="background-image: url('${getImageUrl(item.img_path)}');"></div>
                <div class="checkout-mini-info">
                    <div class="checkout-mini-name">${item.title}</div>
                    <div class="checkout-mini-meta">${item.qty} × ${formatVND(item.price)}</div>
                </div>
                <div class="checkout-mini-subtotal">${formatVND(item.subtotal)}</div>
            </div>
        `).join('');

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        checkoutSubtotal.textContent = formatVND(subtotal);

        // Logic xử lý hiển thị tiền giảm giá
        if (currentDiscountAmount > 0) {
            checkoutDiscount.textContent = '-' + formatVND(currentDiscountAmount);
            rowDiscount.classList.remove('hidden');
        } else {
            rowDiscount.classList.add('hidden');
        }

        // Tổng cộng sau khi đã áp dụng mã giảm giá
        const finalTotal = Math.max(0, subtotal - currentDiscountAmount);
        checkoutTotal.textContent = formatVND(finalTotal);

        // Cập nhật link ảnh QR Code chính xác theo giá trị finalTotal sau giảm
        const qrLinks = buildQrLinks(finalTotal);
        qrDynamicImg.dataset.momo = qrLinks.MOMO;
        qrDynamicImg.dataset.bank = qrLinks.BANK_QR;

        // Nếu đang chọn ví điện tử hoặc ngân hàng thì cập nhật lại ảnh hiển thị ngay lập tức
        const currentMethod = document.querySelector('input[name="payment-option"]:checked').value;
        if (currentMethod !== 'COD') {
            qrDynamicImg.src = currentMethod === 'MOMO' ? qrLinks.MOMO : qrLinks.BANK_QR;
        }
    };

    // Xử lý sự kiện click nút áp dụng Coupon mã giảm giá
    btnApplyCoupon.addEventListener('click', () => {
        const couponCode = txtCoupon.value.trim().toUpperCase();
        couponMessage.className = 'coupon-msg'; // Reset class
        couponMessage.classList.remove('hidden');
        
        if (!couponCode) {
            couponMessage.textContent = 'Vui lòng nhập mã giảm giá!';
            couponMessage.classList.add('error');
            return;
        }

        const items = getCheckoutCartDetails();
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

        if (subtotal === 0) {
            couponMessage.textContent = 'Giỏ hàng trống, không thể áp dụng!';
            couponMessage.classList.add('error');
            return;
        }

        // Định nghĩa danh sách các mã giảm giá hợp lệ
        if (couponCode === 'BAKEIT10') {
            currentDiscountAmount = Math.round(subtotal * 0.1); // Giảm 10% tổng hóa đơn
            appliedCouponCode = couponCode;
            couponMessage.textContent = `Áp dụng thành công mã BAKEIT10 (Giảm 10%)`;
            couponMessage.classList.add('success');
        } else if (couponCode === 'GIAM50K') {
            currentDiscountAmount = subtotal > 100000 ? 50000 : subtotal; // Giảm 50.000đ
            appliedCouponCode = couponCode;
            couponMessage.textContent = `Áp dụng thành công mã GIAM50K (Giảm 50.000đ)`;
            couponMessage.classList.add('success');
        } else {
            currentDiscountAmount = 0;
            appliedCouponCode = "";
            couponMessage.textContent = 'Mã giảm giá không hợp lệ hoặc đã hết hạn!';
            couponMessage.classList.add('error');
        }

        // Chạy lại hàm cập nhật tổng bill hiển thị
        renderCheckoutSummary();
    });

    paymentRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const selectedMethod = event.target.value;
            if (selectedMethod === 'COD') {
                qrPaymentArea.classList.add('hidden');
                return;
            }

            qrInstruction.textContent = selectedMethod === 'MOMO'
                ? 'Vui lòng dùng Ví MoMo quét mã bên dưới để thanh toán:'
                : 'Mở App Ngân hàng quét mã VietQR để chuyển khoản:';
            qrDynamicImg.src = selectedMethod === 'MOMO' ? qrDynamicImg.dataset.momo : qrDynamicImg.dataset.bank;
            qrPaymentArea.classList.remove('hidden');
        });
    });

    btnSubmitOrder.addEventListener('click', async () => {
        const fullname = document.getElementById('txt-fullname').value.trim();
        const phone = document.getElementById('txt-phone').value.trim();
        const address = document.getElementById('txt-address').value.trim();

        if (!fullname || !phone || !address) {
            alert('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng!');
            return;
        }

        if (!getCheckoutCartDetails().length) {
            alert('Giỏ hàng đang trống, không thể tạo đơn hàng.');
            return;
        }

        const generatedOrderId = 'BK-' + Math.floor(100000 + Math.random() * 900000);
        lblOrderId.textContent = generatedOrderId;

        const currentMethod = document.querySelector('input[name="payment-option"]:checked').value;
        const cartItems = getCheckoutCartDetails();
        const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        // Tạo bản ghi đơn hàng lưu vào localStorage (Có bổ sung thông tin coupon)
        const orderRecord = {
            id: generatedOrderId,
            fullname: fullname,
            phone: phone,
            email: document.getElementById('txt-email').value.trim(),
            address: address,
            notes: document.getElementById('txt-notes').value.trim(),
            paymentMethod: currentMethod,
            items: cartItems,
            subtotal: subtotal, // Tiền hàng chưa giảm
            couponCode: appliedCouponCode, // Mã giảm giá áp dụng
            discount: currentDiscountAmount, // Số tiền được giảm
            total: Math.max(0, subtotal - currentDiscountAmount), // Số tiền thực tế khách trả
            createdAt: new Date().toISOString(),
            accountEmail: storedAccount ? storedAccount.Email : null
        };

        btnSubmitOrder.disabled = true;
        btnSubmitOrder.textContent = 'ĐANG LƯU ĐƠN HÀNG...';

        let savedOrder;
        try {
            savedOrder = await saveOrderToDataset(orderRecord);
        } catch (error) {
            btnSubmitOrder.disabled = false;
            btnSubmitOrder.textContent = 'XÁC NHẬN ĐẶT HÀNG';
            alert('Không thể lưu đơn hàng vào datasets/Orders.json. Hãy chạy bằng server.js thay vì Live Server/static server.');
            return;
        }

        orderRecord.OrderID = savedOrder.OrderID;
        orderRecord.CustomerID = savedOrder.CustomerID;
        orderRecord.TrackingCode = savedOrder.TrackingCode;

        const existingOrders = JSON.parse(localStorage.getItem('bakeit_orders') || '[]');
        existingOrders.unshift(orderRecord);
        localStorage.setItem('bakeit_orders', JSON.stringify(existingOrders));

        successMethodMsg.textContent = currentMethod === 'COD'
            ? 'Đơn hàng của bạn sẽ được ship COD và thanh toán khi nhận hàng.'
            : 'Hệ thống đã ghi nhận khoản thanh toán trực tuyến của bạn.';

        successOverlay.classList.remove('hidden');
        setTimeout(() => successOverlay.classList.add('show'), 10);
    });

    btnSuccessClose.addEventListener('click', () => {
        const selectedIds = getSelectedCartIds();
        if (selectedIds && selectedIds.length) {
            selectedIds.forEach(id => CartStorage.removeItem(id));
            sessionStorage.removeItem(SELECTED_CART_KEY);
        } else {
            CartStorage.clear();
        }
        window.location.href = '../Category/ProductList/product-list.html';
    });

    renderCheckoutSummary();
});
