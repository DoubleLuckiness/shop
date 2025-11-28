// js/ripple.js
// Material Design 涟漪点击效果（纯原生，支持动态元素）

;(() => {
    'use strict';

    // 涟漪动画 CSS（自动注入，避免污染全局样式）
    const rippleCSS = `
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.7);
            transform: scale(0);
            animation: rippleAnim 0.6s linear;
            pointer-events: none;
            z-index: 10;
        }
        @keyframes rippleAnim {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        /* 深色按钮用深色涟漪 */
        .delete-btn .ripple,
        button[data-type="delete"] .ripple {
            background: rgba(0, 0, 0, 0.3);
        }
        
        @media (max-width: 768px) { /* 小屏减小涟漪大小 */
            .ripple {
                animation-duration: 0.4s;
            }
        }
    `;

    // 注入样式（只注入一次）
    if (!document.getElementById('ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = rippleCSS;
        document.head.appendChild(style);
    }

    // 核心涟漪函数
    function createRipple(event) {
        const button = event.currentTarget;

        if (button.disabled) return;

        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        button.appendChild(ripple);

        // 动画结束后自动移除
        setTimeout(() => ripple.remove(), 600);
    }

    // 需要添加涟漪的选择器（随时可增删）
    const rippleSelectors = [
        'button',
        '.btn',
        '.tab',
        '.product-card',
        '.inventory-tab',
        '.delete-btn',
        '.primary-btn',
        '.status-btn',
        '.edit-btn',
        '.print-btn',
        '.category-btn',
        '.inventory-tab'
    ].join(', ');

    // 初始化已有元素
    function initRippleElements(container = document) {
        container.querySelectorAll(rippleSelectors).forEach(el => {
            if (!el.classList.contains('ripple-initialized')) {
                el.classList.add('ripple-initialized');
                el.style.position = 'relative';
                el.style.overflow = 'hidden';
                el.style.cursor = 'pointer';
                el.addEventListener('click', createRipple);
            }
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initRippleElements());
    } else {
        initRippleElements();
    }

    // 暴露给全局，方便 refreshAll 时调用（推荐！）
    window.addRippleEffect = function(container = document) {
        initRippleElements(container);
    };

    console.log('涟漪效果已加载');
})();