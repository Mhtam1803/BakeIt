document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item) => {
        const button = item.querySelector('.faq-question-btn');

        const openFaq = () => {
            faqItems.forEach((faq) => {
                faq.classList.remove('active');
                faq.querySelector('.faq-question-btn').setAttribute('aria-expanded', 'false');
            });

            item.classList.add('active');
            button.setAttribute('aria-expanded', 'true');
        };

        const closeFaq = () => {
            item.classList.remove('active');
            button.setAttribute('aria-expanded', 'false');
        };

        item.addEventListener('mouseenter', openFaq);
        item.addEventListener('focusin', openFaq);
        item.addEventListener('mouseleave', closeFaq);
        item.addEventListener('focusout', (event) => {
            if (!item.contains(event.relatedTarget)) {
                closeFaq();
            }
        });
    });
});
