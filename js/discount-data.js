// discount-data.js - 打折商品数据管理
;(function() {
    'use strict';

    const DISCOUNT_PRODUCTS_STORAGE_KEY = 'supermarket_discount_products';
    let discountProducts = [];

    function initDiscountData() {
        loadDiscountProductsData();
    }

    function loadDiscountProductsData() {
        if (!isLocalStorageAvailable()) return;

        const saved = localStorage.getItem(DISCOUNT_PRODUCTS_STORAGE_KEY);
        if (saved) {
            try {
                discountProducts = JSON.parse(saved);
                console.log('加载打折商品数据:', discountProducts);
            } catch (e) {
                console.warn('打折商品数据解析失败，使用默认空数组:', e);
                discountProducts = [];
            }
        }
    }

    function saveDiscountProductsData() {
        if (!isLocalStorageAvailable()) return;
        localStorage.setItem(DISCOUNT_PRODUCTS_STORAGE_KEY, JSON.stringify(discountProducts));
    }

    function isLocalStorageAvailable() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // 辅助函数：获取商品单位
    function getUnit(type) {
        if (type === 'cigarette') return '包';
        if (type === 'beverage' || type === 'liquor') return '瓶';
        if (type === 'snack') return '个';
        if (type === 'frozen') return '袋';
        if (type === 'kitchen' || type === 'living') return '件';
        return '公斤';
    }

    const DiscountProductManager = {
        // 创建独立的打折商品

        createDiscountProduct(originalProductName, discount, stock, reason = '临期处理', unit = null, pricingMethod = 'discount', fixedPrice = null) {
            console.log('创建打折商品:', { originalProductName, discount, stock, reason, unit, pricingMethod, fixedPrice });

            if (!originalProductName || stock <= 0) {
                throw new Error('商品名称和库存不能为空');
            }

            // 验证定价方式
            if (pricingMethod === 'discount') {
                if (discount <= 0 || discount > 1) {
                    throw new Error('折扣率范围0.01-1.0');
                }
            } else if (pricingMethod === 'fixed') {
                if (fixedPrice === null || fixedPrice <= 0) {
                    throw new Error('固定价格必须大于0');
                }
            } else {
                throw new Error('无效的定价方式');
            }

            // 查找原商品信息
            let originalProduct = null;
            let productType = '';
            for (const [type, cat] of Object.entries(categories)) {
                const product = cat.list.find(p => p.name === originalProductName);
                if (product) {
                    originalProduct = product;
                    productType = type;
                    break;
                }
            }

            if (!originalProduct) {
                throw new Error('原商品不存在');
            }

            // 检查是否已存在同名打折商品
            if (discountProducts.some(p => p.originalName === originalProductName && p.isActive)) {
                throw new Error('该商品已存在打折信息');
            }

            // 计算打折价格
            let discountPrice;
            if (pricingMethod === 'discount') {
                discountPrice = parseFloat((originalProduct.price * discount).toFixed(2));
            } else {
                discountPrice = parseFloat(fixedPrice);

                // 验证固定价格不能高于原价
                if (discountPrice >= originalProduct.price) {
                    throw new Error('打折价格不能高于或等于原价');
                }
            }

            // 确定单位：优先使用传入的单位，否则使用原商品单位，最后使用默认单位
            const finalUnit = unit || originalProduct.unit || getUnit(productType);

            // 创建独立的打折商品
            const discountProduct = {
                id: Date.now(),
                name: `${originalProduct.name}(特价)`,
                originalName: originalProduct.name,
                type: productType,
                icon: originalProduct.icon,
                originalPrice: originalProduct.price,
                discount: pricingMethod === 'discount' ? parseFloat(discount) : parseFloat((discountPrice / originalProduct.price).toFixed(2)),
                discountPrice: discountPrice,
                stock: parseFloat(stock),
                unit: finalUnit,
                reason: reason,
                pricingMethod: pricingMethod, // 新增：定价方式
                fixedPrice: pricingMethod === 'fixed' ? parseFloat(fixedPrice) : null, // 新增：固定价格
                createTime: new Date().toISOString(),
                isActive: true,
                isDiscountProduct: true
            };



            discountProducts.push(discountProduct);
            saveDiscountProductsData();
            console.log('打折商品创建成功:', discountProduct);
            return discountProduct;
        },



        // 更新打折商品库存
        updateDiscountStock(productId, soldAmount) {
            const product = discountProducts.find(p => p.id === productId);
            if (!product) {
                throw new Error('打折商品不存在');
            }

            if (product.stock < soldAmount) {
                throw new Error('打折商品库存不足');
            }

            product.stock -= soldAmount;

            if (product.stock <= 0) {
                product.isActive = false;
                // ========== 新增代码：库存为0时刷新销售区 ==========
                setTimeout(() => {
                    if (typeof window.refreshAll === 'function') {
                        window.refreshAll();
                    }
                }, 100);
            }

            saveDiscountProductsData();
            return product;
        },

        // 删除打折商品
        removeDiscountProduct(productId) {
            const index = discountProducts.findIndex(p => p.id === productId);
            if (index !== -1) {
                discountProducts.splice(index, 1);
                saveDiscountProductsData();
                return true;
            }
            return false;
        },

        // 获取所有活跃的打折商品
        getAllDiscountProducts() {
            const activeProducts = discountProducts.filter(product => product.isActive);
            console.log('获取所有打折商品:', activeProducts);
            return activeProducts;
        },

        // 根据原商品名称查找打折商品
        getDiscountProductByOriginalName(originalName) {
            return discountProducts.find(p => p.originalName === originalName && p.isActive);
        },



        // 根据商品名称查找打折商品（新增方法）
        getDiscountProduct(productName) {
            return discountProducts.find(p => p.name === productName && p.isActive);
        },


        // 搜索打折商品
        searchDiscountProducts(keyword) {
            if (!keyword) return this.getAllDiscountProducts();

            const lowerKeyword = keyword.toLowerCase();
            return this.getAllDiscountProducts().filter(product =>
                product.name.toLowerCase().includes(lowerKeyword) ||
                product.originalName.toLowerCase().includes(lowerKeyword) ||
                product.reason.toLowerCase().includes(lowerKeyword)
            );
        }
    };

    // 初始化
    initDiscountData();
    window.DiscountProductManager = DiscountProductManager;
    console.log('打折商品数据模块加载完成');
})();