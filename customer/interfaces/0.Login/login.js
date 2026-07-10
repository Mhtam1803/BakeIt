document.addEventListener('DOMContentLoaded', () => {
    // Đường dẫn trỏ về trang profile sau khi login thành công
    const PROFILE_PAGE_URL = "../Personal Info/personal-information.html"; 
    const REGISTERED_MEMBERS_KEY = 'bakeit_registered_members';
    const PASSWORD_RESETS_KEY = 'bakeit_password_resets';
    const MEMBERS_DATA_URL = '../../../datasets/Members.json';
    const CUSTOMERS_DATA_URL = '../../../datasets/Customers.json';
    const MEMBERS_API_URL = '/api/members';
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMsg = document.getElementById('login-error-msg');
    const registerErrorMsg = document.getElementById('register-error-msg');
    const passwordInputEl = document.getElementById('login-password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
    const authTitle = document.getElementById('auth-title');
    const authDesc = document.getElementById('auth-desc');
    const authSwitchText = document.getElementById('auth-switch-text');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordMsg = document.getElementById('forgot-password-msg');
    const forgotEmailInput = document.getElementById('forgot-email');
    const forgotNewPasswordInput = document.getElementById('forgot-new-password');
    const forgotConfirmPasswordInput = document.getElementById('forgot-confirm-password');
    const forgotPasswordClose = document.getElementById('forgot-password-close');
    const forgotPasswordCancel = document.getElementById('forgot-password-cancel');
    const FALLBACK_MEMBERS = [
        { MemberID: 1, CustomerID: 1001, Email: 'nguyenminhanh@gmail.com', Password: '123456', Role: 'Customer', Status: 'Blocked' },
        { MemberID: 2, CustomerID: 1002, Email: 'tranhoangnam@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' },
        { MemberID: 3, CustomerID: 1003, Email: 'lethuha@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' },
        { MemberID: 4, CustomerID: 1004, Email: 'phamgiabao@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' },
        { MemberID: 5, CustomerID: 1005, Email: 'hoanglinhchi@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' },
        { MemberID: 6, CustomerID: 1006, Email: 'phanquochuy@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' },
        { MemberID: 7, CustomerID: 1007, Email: 'vubaongoc@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' },
        { MemberID: 8, CustomerID: 1008, Email: 'dangducanh@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' },
        { MemberID: 9, CustomerID: 1009, Email: 'buithanhtam@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' },
        { MemberID: 10, CustomerID: 1010, Email: 'domylinh@gmail.com', Password: '123456', Role: 'Customer', Status: 'Active' }
    ];
    const FALLBACK_CUSTOMERS = [
        { CustomerID: 1001, FullName: 'Nguyen Minh Anh', Email: 'nguyenminhanh@gmail.com', Phone: '0900000000', LoyaltyPoint: 0, CustomerStatus: 'Blocked' },
        { CustomerID: 1002, FullName: 'Tran Hoang Nam', Email: 'tranhoangnam@gmail.com', Phone: '0900007919', LoyaltyPoint: 137, CustomerStatus: 'Active' },
        { CustomerID: 1003, FullName: 'Le Thu Ha', Email: 'lethuha@gmail.com', Phone: '0900015838', LoyaltyPoint: 274, CustomerStatus: 'Active' },
        { CustomerID: 1004, FullName: 'Pham Gia Bao', Email: 'phamgiabao@gmail.com', Phone: '0900023757', LoyaltyPoint: 411, CustomerStatus: 'Active' },
        { CustomerID: 1005, FullName: 'Hoang Linh Chi', Email: 'hoanglinhchi@gmail.com', Phone: '0900031676', LoyaltyPoint: 548, CustomerStatus: 'Active' },
        { CustomerID: 1006, FullName: 'Phan Quoc Huy', Email: 'phanquochuy@gmail.com', Phone: '0900039595', LoyaltyPoint: 685, CustomerStatus: 'Active' },
        { CustomerID: 1007, FullName: 'Vu Bao Ngoc', Email: 'vubaongoc@gmail.com', Phone: '0900047514', LoyaltyPoint: 822, CustomerStatus: 'Active' },
        { CustomerID: 1008, FullName: 'Dang Duc Anh', Email: 'dangducanh@gmail.com', Phone: '0900055433', LoyaltyPoint: 959, CustomerStatus: 'Active' },
        { CustomerID: 1009, FullName: 'Bui Thanh Tam', Email: 'buithanhtam@gmail.com', Phone: '0900063352', LoyaltyPoint: 1096, CustomerStatus: 'Active' },
        { CustomerID: 1010, FullName: 'Do My Linh', Email: 'domylinh@gmail.com', Phone: '0900071271', LoyaltyPoint: 1233, CustomerStatus: 'Active' }
    ];

    const getRegisteredMembers = () => {
        try {
            return JSON.parse(localStorage.getItem(REGISTERED_MEMBERS_KEY) || '[]');
        } catch (error) {
            return [];
        }
    };

    const saveRegisteredMembers = (members) => {
        localStorage.setItem(REGISTERED_MEMBERS_KEY, JSON.stringify(members));
    };

    const getPasswordResets = () => {
        try {
            return JSON.parse(localStorage.getItem(PASSWORD_RESETS_KEY) || '{}');
        } catch (error) {
            return {};
        }
    };

    const savePasswordResets = (resets) => {
        localStorage.setItem(PASSWORD_RESETS_KEY, JSON.stringify(resets));
    };

    const getEffectivePassword = (member) => {
        const resets = getPasswordResets();
        const emailKey = member.Email ? member.Email.toLowerCase() : '';
        return resets[emailKey] || member.Password;
    };

    const loadJson = async (url, fallback = []) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return Array.isArray(data) ? data : fallback;
        } catch (error) {
            console.warn(`Không thể tải ${url}:`, error);
            return fallback;
        }
    };

    const apiJson = async (url, options = {}) => {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.message || `HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }
        return data;
    };

    const loadMembers = async () => {
        try {
            const data = await apiJson(MEMBERS_API_URL);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            const seedMembers = await loadJson(MEMBERS_DATA_URL, FALLBACK_MEMBERS);
            return [...seedMembers, ...getRegisteredMembers()];
        }
    };

    const registerMemberToDataset = async (member) => {
        return apiJson(`${MEMBERS_API_URL}/register`, {
            method: 'POST',
            body: JSON.stringify(member)
        });
    };

    const updateMemberPasswordInDataset = async (email, password) => {
        return apiJson(`${MEMBERS_API_URL}/password`, {
            method: 'PATCH',
            body: JSON.stringify({ Email: email, Password: password })
        });
    };

    const buildAccountData = (member, customer = {}) => ({
        CustomerID: member.CustomerID || customer.CustomerID || Date.now(),
        Email: member.Email,
        FullName: member.FullName || customer.FullName || 'Thành viên Bake it!',
        Phone: member.Phone || customer.Phone || '',
        LoyaltyPoint: customer.LoyaltyPoint || 0,
        Address: member.Address || customer.Address || '',
        Password: getEffectivePassword(member)
    });

    const openForgotPasswordModal = () => {
        if (!forgotPasswordModal || !forgotPasswordForm) return;
        forgotPasswordForm.reset();
        if (forgotPasswordMsg) forgotPasswordMsg.classList.add('hidden');
        if (forgotEmailInput) forgotEmailInput.value = document.getElementById('login-email').value.trim();
        forgotPasswordModal.classList.remove('hidden');
        forgotPasswordModal.classList.add('flex');
    };

    const closeForgotPasswordModal = () => {
        if (!forgotPasswordModal || !forgotPasswordForm) return;
        forgotPasswordForm.reset();
        if (forgotPasswordMsg) forgotPasswordMsg.classList.add('hidden');
        forgotPasswordModal.classList.add('hidden');
        forgotPasswordModal.classList.remove('flex');
    };

    const showForgotPasswordMessage = (message, type = 'error') => {
        if (!forgotPasswordMsg) return;
        forgotPasswordMsg.textContent = message;
        forgotPasswordMsg.className = `rounded-xl p-2 text-center text-[11px] font-medium ${type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`;
        forgotPasswordMsg.classList.remove('hidden');
    };

    const setAuthMode = (mode) => {
        const isRegister = mode === 'register';
        loginForm.classList.toggle('hidden', isRegister);
        registerForm.classList.toggle('hidden', !isRegister);
        authTitle.textContent = isRegister ? 'Đăng ký Thành viên' : 'Đăng nhập Thành viên';
        authDesc.textContent = isRegister
            ? 'Tạo tài khoản Bake it! để lưu thông tin và theo dõi đơn hàng dễ hơn'
            : 'Vui lòng điền thông tin tài khoản Bake it! của bạn';
        authSwitchText.textContent = isRegister ? 'Đã có tài khoản Bake it!?' : 'Chưa có tài khoản Bake it!?';
        toggleAuthModeBtn.textContent = isRegister ? 'Đăng nhập' : 'Đăng ký thành viên';
        if (errorMsg) errorMsg.classList.add('hidden');
        if (registerErrorMsg) registerErrorMsg.classList.add('hidden');
    };

    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.addEventListener('click', () => {
            const nextMode = registerForm.classList.contains('hidden') ? 'register' : 'login';
            setAuthMode(nextMode);
        });
    }

    if (passwordInputEl && togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPasswordHidden = passwordInputEl.type === 'password';
            passwordInputEl.type = isPasswordHidden ? 'text' : 'password';
            togglePasswordBtn.setAttribute('aria-label', isPasswordHidden ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            togglePasswordBtn.setAttribute('aria-pressed', String(isPasswordHidden));
            togglePasswordBtn.innerHTML = isPasswordHidden
                ? '<i class="fa-regular fa-eye-slash"></i>'
                : '<i class="fa-regular fa-eye"></i>';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 

            const emailInput = document.getElementById('login-email').value.trim();
            const passwordInput = document.getElementById('login-password').value.trim();

            if (errorMsg) errorMsg.classList.add('hidden');

            try {
                const customers = await loadJson(CUSTOMERS_DATA_URL, FALLBACK_CUSTOMERS);
                const members = await loadMembers();

                const matchedMember = members.find(m => m.Email && m.Email.toLowerCase() === emailInput.toLowerCase());
                const matchedCustomer = customers.find(c =>
                    (c.Email && c.Email.toLowerCase() === emailInput.toLowerCase()) ||
                    c.CustomerID === matchedMember?.CustomerID
                );

                if (matchedMember && matchedMember.Status === 'Blocked') {
                    if (errorMsg) {
                        errorMsg.textContent = '❌ Tài khoản này đang bị khóa!';
                        errorMsg.classList.remove('hidden');
                    }
                    return;
                }

                if (matchedMember && passwordInput === getEffectivePassword(matchedMember)) {
                    const accountData = buildAccountData(matchedMember, matchedCustomer);
                    alert(`🎉 Chào mừng ${accountData.FullName} quay trở lại Bake it!`);

                    // Lưu trạng thái đăng nhập vào localStorage
                    localStorage.setItem('bakeit_account', JSON.stringify(accountData));

                    // Đăng nhập thành công -> Bay sang trang thông tin cá nhân
                    window.location.href = PROFILE_PAGE_URL;
                } else {
                    // Sai email hoặc pass
                    if (errorMsg) {
                        errorMsg.textContent = '❌ Email hoặc mật khẩu không chính xác!';
                        errorMsg.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error("Lỗi xác thực:", error);
                alert("Không thể kết nối đến dữ liệu khách hàng. Hãy đảm bảo đang chạy Live Server!");
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const fullName = document.getElementById('register-fullname').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const phone = document.getElementById('register-phone').value.trim();
            const password = document.getElementById('register-password').value.trim();
            const confirmPassword = document.getElementById('register-confirm-password').value.trim();

            if (registerErrorMsg) registerErrorMsg.classList.add('hidden');

            if (password !== confirmPassword) {
                registerErrorMsg.textContent = '❌ Mật khẩu nhập lại không khớp!';
                registerErrorMsg.classList.remove('hidden');
                return;
            }

            const members = await loadMembers();
            const emailExists = members.some(member =>
                member.Email.toLowerCase() === email.toLowerCase()
            );

            if (emailExists) {
                registerErrorMsg.textContent = '❌ Email này đã được đăng ký!';
                registerErrorMsg.classList.remove('hidden');
                return;
            }

            const memberPayload = {
                FullName: fullName,
                Email: email,
                Phone: phone,
                Password: password,
            };

            let newMember;
            try {
                newMember = await registerMemberToDataset(memberPayload);
                localStorage.removeItem(REGISTERED_MEMBERS_KEY);
            } catch (error) {
                registerErrorMsg.textContent = error.status === 409
                    ? '❌ Email này đã được đăng ký!'
                    : '❌ Không thể ghi tài khoản vào datasets/Members.json. Hãy chạy bằng server.js thay vì Live Server/static server.';
                registerErrorMsg.classList.remove('hidden');
                return;
            }

            localStorage.setItem('bakeit_account', JSON.stringify(buildAccountData(newMember)));

            alert('🎉 Đăng ký thành viên thành công!');
            window.location.href = PROFILE_PAGE_URL;
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', openForgotPasswordModal);
    }

    [forgotPasswordClose, forgotPasswordCancel].forEach(btn => {
        if (btn) btn.addEventListener('click', closeForgotPasswordModal);
    });

    if (forgotPasswordModal) {
        forgotPasswordModal.addEventListener('click', (event) => {
            if (event.target === forgotPasswordModal) closeForgotPasswordModal();
        });
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = forgotEmailInput.value.trim().toLowerCase();
            const newPassword = forgotNewPasswordInput.value.trim();
            const confirmPassword = forgotConfirmPasswordInput.value.trim();

            if (newPassword.length < 6) {
                showForgotPasswordMessage('❌ Mật khẩu mới phải có tối thiểu 6 ký tự.');
                return;
            }

            if (newPassword !== confirmPassword) {
                showForgotPasswordMessage('❌ Mật khẩu nhập lại không khớp.');
                return;
            }

            const members = await loadMembers();
            const matchedMember = members.find(member => member.Email && member.Email.toLowerCase() === email);

            if (!matchedMember) {
                showForgotPasswordMessage('❌ Không tìm thấy tài khoản với email này.');
                return;
            }

            if (matchedMember.Status === 'Blocked') {
                showForgotPasswordMessage('❌ Tài khoản này đang bị khóa, không thể đặt lại mật khẩu.');
                return;
            }

            try {
                await updateMemberPasswordInDataset(email, newPassword);
                localStorage.removeItem(PASSWORD_RESETS_KEY);
            } catch (error) {
                showForgotPasswordMessage('❌ Không thể cập nhật Members.json. Hãy chạy bằng server.js thay vì Live Server/static server.');
                return;
            }

            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = newPassword;
            showForgotPasswordMessage('✅ Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.', 'success');
            setTimeout(closeForgotPasswordModal, 900);
        });
    }
});
