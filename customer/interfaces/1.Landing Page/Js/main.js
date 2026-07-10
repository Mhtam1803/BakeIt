document.addEventListener('DOMContentLoaded', () => {
    // Chỉ cần bắt sự kiện click trên cái khung chứa 3 banner đó
    const kitContainer = document.querySelector('.popular-kit-grid');
    
    if (kitContainer) {
        kitContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.kit-card');
            if (card) {
                const id = card.dataset.id; // Lấy cái ID 51, 52, 53 từ data-id
                window.location.href = `../../Category/ProductDetail/product-detail.html?id=${id}`;
            }
        });
    }
});
