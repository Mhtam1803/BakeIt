document.addEventListener("DOMContentLoaded", () => {
    const ACCOUNT_STORAGE_KEY = 'bakeit_account';

    const getStoredAccount = () => {
        try {
            const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    };

    // 1. TỰ ĐỘNG DÒ ĐƯỜNG DẪN GỐC (Tránh lỗi vỡ hình)
    // Tự động tìm xem file JS đang được gọi từ đâu để lấy rootPath chuẩn xác
    let rootPath = '../';
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
        const src = script.getAttribute('src');
        if (src && src.includes('global-layout.js')) {
            rootPath = src.substring(0, src.indexOf('shared/'));
            break;
        }
    }

    const homeFolder = 'interfaces/1.Landing Page'; 

    // 2. TỰ ĐỘNG BƠM CSS HEADER VÀO MỌI TRANG
    if (!document.querySelector(`link[href*="style.css"]`)) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = `${rootPath}${homeFolder}/Css/style.css`;
        document.head.appendChild(cssLink);
    }

    // 2b. BƠM CSS HEADER/FOOTER DÙNG CHUNG SAU CÙNG
    // Mỗi trang trước đây tự định nghĩa lại .site-header/.nav-tab/.footer-content...
    // với giá trị khác nhau -> header/footer bị lệch giữa các trang.
    // Nạp 2 file này SAU CÙNG (cuối <head>) để nó luôn thắng CSS riêng của từng trang,
    // đảm bảo header/footer luôn giống nhau ở mọi nơi.
    ['component-header.css', 'component-footer.css'].forEach((fileName) => {
        const href = `${rootPath}shared/${fileName}`;
        if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    });

    const headerPlaceholder = document.getElementById('global-header-placeholder');
    const footerPlaceholder = document.getElementById('global-footer-placeholder');

    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = `
        <header class="site-header">
            <div class="header-top">
                <a href="${rootPath}${homeFolder}/main.html" class="header-logo-link">
                    <img src="${rootPath}${homeFolder}/Images/logo.png" alt="Logo Bake it!" class="header-logo-img">
                </a>
                
                <div class="search-container">
                    <input type="search" id="search-input" placeholder="Tìm kiếm nguyên liệu, dụng cụ làm bánh..." class="search-input">
                </div>
                
                <div class="user-actions">
                    <div class="cart-wrapper" style="position: relative; display: inline-flex; cursor: pointer; padding: 4px;" onclick="window.location.href='${rootPath}interfaces/Cart/cart.html'">
                        <div class="cart-trigger" style="display: inline-flex; position: relative;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#5C3D2E" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
                            <span class="cart-badge" id="header-cart-badge" style="position: absolute; top: -5px; right: -5px; background: #A77B54; color: white; border-radius: 50%; padding: 2px 6px; font-size: 11px;">0</span>
                        </div>
                    </div>
                    
                    <div id="header-account-area" style="cursor: pointer; padding: 4px;">
                        </div>
                </div>
            </div>

            <nav class="site-navigation">
                <a href="${rootPath}${homeFolder}/main.html" class="nav-tab">Trang chủ</a>
                <div class="nav-item-dropdown">
                    <a href="${rootPath}interfaces/Category/ProductList/product-list.html" class="nav-tab">Category <span class="arrow-down">▼</span></a>
                    <div class="dropdown-menu">
                        <a href="${rootPath}interfaces/Category/ProductList/product-list.html">Set nguyên liệu tiện lợi</a>
                        <a href="${rootPath}interfaces/Category/ProductList/product-list.html">Nguyên liệu làm bánh</a>
                        <a href="${rootPath}interfaces/Category/ProductList/product-list.html">Dụng cụ làm bánh</a>
                    </div>
                </div>
                <a href="${rootPath}interfaces/Blog/blog.html" class="nav-tab">Blog</a>
                <a href="${rootPath}interfaces/About Us/main.html" class="nav-tab">About us</a>
            </nav>
        </header>
        `;
    }

if (footerPlaceholder) {
        footerPlaceholder.innerHTML = `
        <footer class="site-footer">
            <div class="footer-container">
                
                <div class="footer-brand-column">
                    <div class="footer-logo-frame">
                        <img src="${rootPath}${homeFolder}/Images/logo.png" alt="Logo Bake it!" class="footer-logo-img">
                    </div>
                    <p class="footer-tagline">
                        Bake it! cung cấp nguyên liệu làm bánh tươi ngon và dụng cụ nướng chất lượng hàng đầu, khơi nguồn đam mê làm bánh trong căn bếp của bạn.
                    </p>
                    <div class="footer-contact-list">
                        <div class="footer-contact-item">
                            <span class="contact-icon">📍</span> <span class="contact-text">123 Đường Bếp Ngọt, Quận 1, TP. HCM</span>
                        </div>
                        <div class="footer-contact-item">
                            <span class="contact-icon">✉️</span> <span class="contact-text">support@bakeit.vn</span>
                        </div>
                        <div class="footer-contact-item">
                            <span class="contact-icon">📞</span> <span class="contact-text">Hotline: 1900 1234</span>
                        </div>
                    </div>
                </div>

                <div class="footer-links-column">
                    <h4 class="footer-column-title">Khám phá</h4>
                    <div class="footer-links-list">
                        <a href="${rootPath}interfaces/Category/ProductList/product-list.html#products-section" class="footer-link">Sản phẩm</a>
                        <a href="${rootPath}interfaces/Category/ProductList/product-list.html#promo-section" class="footer-link">Combo khuyến mãi</a>
                    </div>
                </div>

                <div class="footer-links-column">
                    <h4 class="footer-column-title">Hỗ trợ</h4>
                    <div class="footer-links-list">
                        <a href="${rootPath}interfaces/Support/can-ho-tro.html" class="footer-link">Cần hỗ trợ</a>
                        <a href="${rootPath}interfaces/Support/chinh-sach-doi-tra.html" class="footer-link">Chính sách đổi trả</a>
                        <a href="${rootPath}interfaces/Support/giao-hang-thanh-toan.html" class="footer-link">Giao hàng & thanh toán</a>
                        <a href="${rootPath}interfaces/Category/ProductList/product-list.html#product-request-section" class="footer-link">Yêu cầu sản phẩm</a>
                    </div>
                </div>

                <div class="footer-social-column">
                    <h4 class="footer-column-title">Theo dõi</h4>
                    <p class="footer-social-text">Nhận ưu đãi mới nhất qua mạng xã hội của chúng tôi.</p>
                    <div class="social-icons-group">
                        <a href="#" class="icon-circle">f</a>
                        <a href="#" class="icon-circle">Z</a>
                    </div>
                </div>
            </div>

            <div class="footer-copyright">
                © ${new Date().getFullYear()} Bake it!. Tất cả các quyền được bảo lưu. Thiết kế với <span>tâm huyết</span> dành cho người yêu bánh.
            </div>
        </footer>
        `;
    }

    // --- Logic render User Area ---
    const renderAccountArea = () => {
        const area = document.getElementById('header-account-area');
        if (!area) return;
        const account = getStoredAccount();
        if (account) {
            const lastName = account.FullName.split(' ').pop();
            area.innerHTML = `
                <div class="account-menu-wrapper">
                <button class="account-menu-trigger" type="button" title="Tài khoản của ${account.FullName}" aria-label="Mở menu người dùng" aria-expanded="false">
                    <span style="font-weight:bold; font-size: 14px; color:#5C3D2E;">${lastName}</span>
                    <div class="avatar-placeholder" style="background:#5C3D2E; color:#fff; border-radius:50%; width:42px; height:42px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">
                        ${account.FullName.charAt(0)}
                    </div>
                </button>
                    <div class="account-dropdown-menu" role="menu">
                        <a href="${rootPath}interfaces/Personal Info/personal-information.html" role="menuitem">Thông tin tài khoản</a>
                        <a href="${rootPath}interfaces/Personal Info/personal-information.html#orders" role="menuitem">Tra cứu đơn hàng</a>
                        <button type="button" class="account-logout-btn font-sans" role="menuitem">Đăng xuất</button>
                    </div>
                </div>
            `;
        } else {
            area.innerHTML = `
                <div class="account-menu-wrapper">
                <button class="account-menu-trigger" type="button" title="Người dùng" aria-label="Mở menu người dùng" aria-expanded="false">
                <div class="avatar-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#5C3D2E" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                </button>
                    <div class="account-dropdown-menu" role="menu">
                        <a href="${rootPath}interfaces/0.Login/login.html" role="menuitem">Đăng nhập</a>
                        <a href="${rootPath}interfaces/Personal Info/personal-information.html" role="menuitem">Tra cứu đơn hàng</a>
                    </div>
                </div>
            `;
        }

        const trigger = area.querySelector('.account-menu-trigger');
        const wrapper = area.querySelector('.account-menu-wrapper');
        if (trigger && wrapper) {
            trigger.addEventListener('click', (event) => {
                event.stopPropagation();
                const isOpen = wrapper.classList.toggle('open');
                trigger.setAttribute('aria-expanded', String(isOpen));
            });
        }

        const logoutBtn = area.querySelector('.account-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem(ACCOUNT_STORAGE_KEY);
                window.location.href = `${rootPath}${homeFolder}/main.html`;
            });
        }
    };
    renderAccountArea();

    document.addEventListener('click', (event) => {
        const wrapper = document.querySelector('.account-menu-wrapper.open');
        if (wrapper && !wrapper.contains(event.target)) {
            wrapper.classList.remove('open');
            const trigger = wrapper.querySelector('.account-menu-trigger');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        }
    });

    // --- Logic Search chung trên Header ---
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;

            const keyword = searchInput.value.trim();
            if (!keyword) return;

            const searchUrl = `${rootPath}interfaces/Category/ProductList/product-list.html?keyword=${encodeURIComponent(keyword)}#products-section`;
            window.location.href = searchUrl;
        });
    }

    // --- Logic Cập nhật Số lượng Giỏ hàng trên Header ---
    const renderCartBadge = () => {
        if (typeof window.CartStorage !== 'undefined') {
            const badge = document.getElementById('header-cart-badge');
            if (badge) {
                const count = window.CartStorage.getItemCount();
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        }
    };
    renderCartBadge();
    document.addEventListener('cart:updated', renderCartBadge);
});
