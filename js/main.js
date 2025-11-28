// main.js

let editingProduct = null; // 当前正在编辑的商品 {type, product}
// ==================== 品类推荐单位映射 ====================
const categoryRecommendedUnits = {
    fruit: ['公斤', '斤', '个', '盒'],
    vegetable: ['公斤', '斤', '把', '个'],
    snack: ['袋', '包', '个', '盒', '箱'],
    cigarette: ['包', '条', '盒'],
    liquor: ['瓶', '杯', '箱', '升'],
    beverage: ['瓶', '罐', '杯', '盒', '箱'],
    frozen: ['袋', '盒', '公斤', '包'],
    kitchen: ['个', '把', '套', '件'],
    living: ['件', '个', '瓶', '提', '包']
};
// ==================== main.js（完整版：localStorage 持久化 + 修复加载逻辑）================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTabs();
    initSales();          // 必须在这里调用
    initInventory();
    initStockManagement();
    // initProductManagement();
    initDelivery();       // 新增：初始化预约配送
    initReturnManagement();  // 新增
    initFullProductManagement();   // 新增这行
    initSalesRecords();  // 新增这行
    // 添加事件监听器
    initEventListeners();

    // 新增：初始化库存选项卡监听
    initInventoryTabsListener();

    // 新增搜索功能初始化
    initSearch();
    window.inventoryManager = new InventoryManager();
    refreshAll();
    console.log('页面初始化完成');
    // 响应式监听
    window.addEventListener('resize', refreshAll);

});

function initEventListeners() {
    // 监听商品编辑请求
    document.addEventListener('productEditRequest', function(e) {
        const { type, name } = e.detail;

        startEditProduct(type, name);
    });

    document.addEventListener('click', (e) => {
        if (e.target.id === 'clearAllDeliveriesBtn') clearAllDeliveries();
        if (e.target.id === 'sortBtn') sortDeliveries();
    });
}
// ==================== localStorage 检测 ====================
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

const storageAvailable = isLocalStorageAvailable();

// 在加载数据时进行验证
function loadData() {
    if (!storageAvailable) {
        showWarning();
        return;
    }

    const saved = localStorage.getItem('supermarket_categories');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            console.log('原始 saved 数据:', saved);

            Object.keys(categories).forEach(key => {
                if (parsed[key] && parsed[key].list && Array.isArray(parsed[key].list)) {
                    // 修复：确保每个 item 有完整字段并进行数据验证
                    categories[key].list = parsed[key].list.map(p => {
                        const product = {
                            name: p.name || '',
                            price: parseFloat(p.price) || 0,
                            icon: p.icon || '',
                            initialStock: parseFloat(p.initialStock) || 0,
                            sold: parseFloat(p.sold) || 0,
                            type: p.type || key,
                            unit: p.unit || getDefaultUnit(key),
                            loss: parseFloat(p.loss) || 0 // 确保损耗量字段被加载
                        };

                        // 数据验证
                        if (!validateProductData(product)) {
                            console.warn('无效的商品数据:', product);
                        }

                        return product;
                    });
                    console.log(`加载 ${key} 成功，示例 price:`, categories[key].list[0]?.price);
                }
            });
            console.log('所有数据加载完成');
        } catch (e) {
            console.warn('localStorage 数据解析失败，使用默认数据:', e);
            localStorage.removeItem('supermarket_categories');
        }
    } else {
        console.log('无保存数据，使用默认初始值');
        enhanceInitialData();
    }

    // ==================== 新增：加载预约配送数据 ====================
    const savedDeliveries = localStorage.getItem('supermarket_deliveries');
    if (savedDeliveries) {
        try {
            const parsedDeliveries = JSON.parse(savedDeliveries);
            if (Array.isArray(parsedDeliveries)) {
                deliveries = parsedDeliveries;
                // 重新计算deliveryCounter
                if (deliveries.length > 0) {
                    deliveryCounter = Math.max(...deliveries.map(d => d.id)) + 1;
                }
                console.log('预约配送数据加载成功，记录数:', deliveries.length);
            }
        } catch (e) {
            console.warn('预约配送数据解析失败，使用默认数据:', e);
            localStorage.removeItem('supermarket_deliveries');
        }
    } else {
        console.log('无预约配送保存数据，使用默认初始值');
        deliveries = []; // 确保初始化为空数组
    }

    // ==================== 新增：加载销售记录数据 ====================
    const savedSalesRecords = localStorage.getItem('supermarket_sales_records');
    if (savedSalesRecords) {
        try {
            const parsedSalesRecords = JSON.parse(savedSalesRecords);
            if (Array.isArray(parsedSalesRecords)) {
                salesRecords = parsedSalesRecords;
                // 重新计算salesRecordCounter
                if (salesRecords.length > 0) {
                    salesRecordCounter = Math.max(...salesRecords.map(r => r.id)) + 1;
                }
                console.log('销售记录数据加载成功，记录数:', salesRecords.length);
            }
        } catch (e) {
            console.warn('销售记录数据解析失败，使用默认数据:', e);
            localStorage.removeItem('supermarket_sales_records');
        }
    } else {
        console.log('无销售记录保存数据，使用默认初始值');
        salesRecords = []; // 确保初始化为空数组
    }

    // ... 其他数据加载逻辑保持不变
}

// 添加辅助函数
function getDefaultUnit(type) {
    const defaultUnits = {
        fruit: '公斤', vegetable: '公斤', snack: '个',
        cigarette: '包', liquor: '瓶', beverage: '瓶',
        frozen: '袋', kitchen: '件', living: '件'
    };
    return defaultUnits[type] || '个';
}

function enhanceInitialData() {
    Object.keys(categories).forEach(key => {
        categories[key].list.forEach(product => {
            if (!product.unit) {
                product.unit = getDefaultUnit(key);
            }
            if (product.loss === undefined) {
                product.loss = 0; // 确保所有商品都有损耗量字段
            }
        });
    });
    console.log('初始数据增强完成，包含损耗量字段');
}

// ==================== 保存数据（每次操作后调用）===================
function saveData() {
    if (!storageAvailable) return;
    // 确保所有商品都有单位字段
    Object.keys(categories).forEach(k => {
        categories[k].list.forEach(product => {
            if (!product.unit) {
                // 设置默认单位
                const defaultUnits = {
                    fruit: '公斤', vegetable: '公斤', snack: '个',
                    cigarette: '包', liquor: '瓶', beverage: '瓶',
                    frozen: '袋', kitchen: '件', living: '件'
                };
                product.unit = defaultUnits[k] || '个';
                console.log(`为 ${product.name} 设置默认单位:`, product.unit);
            }
            if (product.loss === undefined) {
                product.loss = 0; // 确保损耗量字段存在
            }
        });
    });

    const toSave = {};
    Object.keys(categories).forEach(k => {
            toSave[k] = { 
            list: categories[k].list.map(product => ({
                name: product.name,
                price: product.price,
                icon: product.icon,
                initialStock: product.initialStock,
                sold: product.sold,
                type: product.type,
                unit: product.unit, // 确保unit字段被保存
                loss: product.loss || 0 // 确保损耗量字段被保存
            }))
        };
    });
    localStorage.setItem('supermarket_categories', JSON.stringify(toSave));

    // ==================== 新增：保存预约配送数据 ====================
    localStorage.setItem('supermarket_deliveries', JSON.stringify(deliveries));
    console.log('预约配送数据已保存到 localStorage，记录数:', deliveries.length);

    // ==================== 新增：保存销售记录数据 ====================
    localStorage.setItem('supermarket_sales_records', JSON.stringify(salesRecords));
    console.log('销售记录数据已保存到 localStorage，记录数:', salesRecords.length);

    console.log('所有数据已保存到 localStorage');

}

// ==================== 警告提示（file:// 时显示）===================
function showWarning() {
    if (document.getElementById('storage-warning')) return;
    const div = document.createElement('div');
    div.id = 'storage-warning';
    div.style.cssText = `
        position:fixed;top:10px;left:50%;transform:translateX(-50%);
        background:#fff3cd;color:#856404;padding:12px 20px;border-radius:8px;
        box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;font-size:14px;
        max-width:90%;text-align:center;border:1px solid #ffeaa7;
    `;
    div.innerHTML = `
        <strong>数据无法保存！</strong><br>
        你正在用 <code>file://</code> 打开页面。<br>
        请用 <strong>Python http.server</strong> 或 VS Code Live Server 打开！<br>
        <span style="cursor:pointer;color:#d63384;" onclick="this.parentElement.parentElement.remove()">×</span>
    `;
    document.body.appendChild(div);
}

// ==================== 统一刷新（自动保存）===================
// 在 main.js 的 refreshAll 函数中添加会员价同步更新
function refreshAll() {
    console.log('refreshAll 执行，购物车商品数:', selectedProducts.length);

    // 新增：在刷新前同步更新所有会员商品的会员价
    if (typeof window.MemberProductManager !== 'undefined' &&
        typeof window.MemberProductManager.updateAllMemberPrices === 'function') {
        window.MemberProductManager.updateAllMemberPrices();
    }

    // 安全地调用各个更新函数
    try {
        window.updateProductList?.();
        console.log('updateProductList 执行完成');
    } catch (error) {
        console.error('updateProductList 执行出错:', error);
    }

    try {
        window.updateTotalPrice?.();
        console.log('updateTotalPrice 执行完成');
    } catch (error) {
        console.error('updateTotalPrice 执行出错:', error);
    }
    try {
        window.updateProductCards?.();
        console.log('updateProductCards 执行完成');
    } catch (error) {
        console.error('updateProductCards 执行出错:', error);
    }
    try {
        window.updateProductSelectOptions?.();
        console.log('updateProductSelectOptions 执行完成');
    } catch (error) {
        console.error('updateProductSelectOptions 执行出错:', error);
    }
    try {
        window.updateAllInventoryDetails?.();
        console.log('updateAllInventoryDetails 执行完成');
    } catch (error) {
        console.error('updateAllInventoryDetails 执行出错:', error);
    }
    try {
        window.updateProductManagementList?.();
        console.log('updateProductManagementList 执行完成');
    } catch (error) {
        console.error('updateProductManagementList 执行出错:', error);
    }
    try {
        updateStockProductOptions?.();
        console.log('updateStockProductOptions执行完成');
    } catch (error) {
        console.error('updateStockProductOptions 执行出错:', error);
    }
    try {
        window.updateDeliveryList?.();
        console.log('updateDeliveryList执行完成');
    } catch (error) {
        console.error('updateDeliveryList 执行出错:', error);
    }
    try {
        window.updateSalesRecordsList?.();
        console.log('updateSalesRecordsList执行完成');
    } catch (error) {
        console.error('updateSalesRecordsList 执行出错:', error);
    }

    // // 新增：刷新会员UI
    // if (typeof window.MemberUI !== 'undefined') {
    //     window.MemberUI.refresh();
    // }
      // 新增：在会员管理页面时更新会员验证UI状态
    if (typeof window.MemberUI !== 'undefined' && 
        typeof window.MemberUI.updateMemberVerificationUI === 'function') {
        window.MemberUI.updateMemberVerificationUI();
    }

    // 更新配送批量UI
    if (typeof updateDeliveryBatchUI === 'function') {
        setTimeout(updateDeliveryBatchUI, 100);
    }

    // 刷新打折商品UI
    if (typeof window.DiscountUI !== 'undefined') {
        window.DiscountUI.refresh();
    }

    saveData();
}
// ==================== 初始化选项卡 ====================
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(`${tab.dataset.tab}-tab`);
            if (target) target.classList.add('active');


            // 新增：切换tab时隐藏/显示确认按钮
            const confirmBtn = document.getElementById('confirmDeliveryProductsBtn');
            if (tab.dataset.tab === 'sales' && isSelectingForDelivery) {
                confirmBtn.style.display = 'inline-block';
            } else {
                confirmBtn.style.display = 'none';
            }
        });
    });

    document.querySelectorAll('.inventory-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.inventory-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.inventory-detail').forEach(d => d.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(`${tab.dataset.inventoryTab}-inventory-detail`);
            if (target) target.classList.add('active');
        });
    });

    document.querySelectorAll('.management-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.management-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.management-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(`${tab.dataset.managementTab}-management-content`);
            if (target) target.classList.add('active');
        });
    });
}

// ==================== 初始化销售区 ====================
function initSales() {
    console.log('initSales 开始');
    window.updateProductSelectOptions?.();
    window.updateProductCards?.();
    initCategoryFilter();

    const checkoutBtn = document.getElementById('checkoutBtn');
    const confirmDeliveryBtn = document.getElementById('confirmDeliveryProductsBtn');
    const confirmQuantityBtn = document.getElementById('confirmQuantityBtn');
    const cancelQuantityBtn = document.getElementById('cancelQuantityBtn');
    const modalQuantity = document.getElementById('modalQuantity');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
        console.log('checkoutBtn 已绑定');
    } else {
        console.error('找不到 id="checkoutBtn"，请检查 HTML');
    }
    
    if (confirmDeliveryBtn) {
        confirmDeliveryBtn.addEventListener('click', confirmDeliveryProducts);
    }

    // 新增：模态框按钮事件
    if (confirmQuantityBtn) {
        confirmQuantityBtn.addEventListener('click', addProductFromModal);
    }
    
    if (cancelQuantityBtn) {
        cancelQuantityBtn.addEventListener('click', closeQuantityModal);
    }
    
    if (modalQuantity) {
        modalQuantity.addEventListener('keypress', e => {
            if (e.key === 'Enter') addProductFromModal();
        });
    }

    // 移除原有的 addBtn 和 weightInput 事件监听
}

// 新增：从模态框添加商品
function addProductFromModal() {
    const quantityInput = document.getElementById('modalQuantity');
    const quantity = parseFloat(quantityInput.value);
    const product = window.currentSelectedProduct;

    if (!product || isNaN(quantity) || quantity <= 0) {
        alert('请输入有效数量');
        return;
    }

    // 调用原有的添加商品逻辑
    addProductToCart(product, quantity);
    closeQuantityModal();
    // 清空搜索框（确保这里也执行）
    const salesSearch = document.getElementById('salesSearch');
    if (salesSearch) {
        salesSearch.value = '';
    }

    // 恢复原始商品列表显示
    if (typeof window.updateProductCards === 'function') {
        window.updateProductCards();
    }
}

// 新增：关闭模态框
function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    modal.style.display = 'none';
    window.currentSelectedProduct = null;
}

// 新增：添加商品到购物车（重构原有的添加逻辑）
// 完整的 addProductToCart 函数
function addProductToCart(product, quantity) {
    console.log('添加商品到购物车:', product.name, quantity);

    if (!product || isNaN(quantity) || quantity <= 0) {
        alert('请输入有效数量');
        return;
    }

    // 检查是否是打折商品
    const isDiscountProduct = product.name.includes('(特价)');
    console.log('是否是打折商品:', isDiscountProduct);

    if (isDiscountProduct) {
        // 处理打折商品
        if (typeof window.DiscountProductManager !== 'undefined') {
            const discountProduct = DiscountProductManager.getDiscountProduct(product.name);

            console.log('找到的打折商品:', discountProduct);

            if (!discountProduct) {
                alert('打折商品不存在');
                return;
            }

            if (quantity > discountProduct.stock) {
                alert(`打折商品库存不足！当前库存 ${discountProduct.stock}${discountProduct.unit}`);
                return;
            }

            // 特价商品直接使用打折价格，不应用会员价
            const finalPrice = discountProduct.discountPrice;

            // 安全检查：确保价格有效
            if (typeof finalPrice !== 'number' || isNaN(finalPrice)) {
                console.error('无效的特价商品价格:', discountProduct);
                alert('商品价格数据异常，请刷新页面重试');
                return;
            }

            // 更新打折商品库存
            DiscountProductManager.updateDiscountStock(discountProduct.id, quantity);

            selectedProducts.push({
                name: discountProduct.name,
                type: discountProduct.type,
                price: finalPrice,
                originalPrice: discountProduct.originalPrice,
                weight: quantity,
                total: finalPrice * quantity,
                isDiscount: true,
                originalProductName: discountProduct.originalName,
                unit: discountProduct.unit
            });

            // 重新计算购物车中所有商品的价格
            recalculateCartPrices();

            // 检查价格冲突
            checkPriceConflicts();

            refreshAll();

            if (typeof window.DiscountUI !== 'undefined') {
                window.DiscountUI.refresh();
            }

            if (currentCategory === 'discount' && typeof window.updateProductCards === 'function') {
                window.updateProductCards();
            }

            return;
        } else {
            alert('打折商品系统未初始化');
            return;
        }
    } else {
        // 处理原价商品
        let foundProduct = null;
        for (const cat of Object.values(categories)) {
            const p = cat.list.find(item => item.name === product.name);
            if (p) { foundProduct = p; break; }
        }

        if (!foundProduct) {
            alert('商品未找到');
            return;
        }

        const remain = foundProduct.initialStock - foundProduct.sold;
        if (remain < quantity) {
            alert(`库存不足！当前剩余 ${remain.toFixed(2)}${getUnit(foundProduct.type)}`);
            return;
        }

        let finalPrice = foundProduct.price;

        // 安全检查：确保商品价格有效
        if (typeof finalPrice !== 'number' || isNaN(finalPrice)) {
            console.error('无效的商品价格:', foundProduct);
            alert('商品价格数据异常，请刷新页面重试');
            return;
        }

        // 检查购物车中是否已经存在该商品的特价版本
        let hasDiscountVersionInCart = false;
        if (typeof window.DiscountProductManager !== 'undefined') {
            const discountProduct = DiscountProductManager.getDiscountProductByOriginalName(product.name);
            if (discountProduct && discountProduct.isActive) {
                // 检查购物车中是否已经有该商品的特价版本
                hasDiscountVersionInCart = selectedProducts.some(item =>
                    item.isDiscount && item.originalProductName === product.name
                );
            }
        }

        // 应用会员价（如果购物车中没有该商品的特价版本）
        if (!hasDiscountVersionInCart &&
            typeof window.MemberProductManager !== 'undefined' &&
            typeof window.MemberManager !== 'undefined') {

            const memberPrice = window.MemberProductManager.getPriceForCurrentMember(product.name, foundProduct.price);

            // 安全检查：确保会员价格有效
            if (typeof memberPrice === 'number' && !isNaN(memberPrice)) {
                finalPrice = memberPrice;
            } else {
                console.warn('会员价格计算异常，使用原价:', memberPrice);
                finalPrice = foundProduct.price;
            }
        }

        foundProduct.sold += quantity;

        selectedProducts.push({
            name: foundProduct.name,
            type: foundProduct.type,
            price: finalPrice,
            originalPrice: foundProduct.price,
            weight: quantity,
            total: finalPrice * quantity,
            isDiscount: false,
            unit: foundProduct.unit
        });

        // 在添加商品后检查价格冲突
        checkPriceConflicts();

        refreshAll();
    }


    // 在函数末尾添加：清空搜索框
    const salesSearch = document.getElementById('salesSearch');
    if (salesSearch) {
        salesSearch.value = '';
    }
    // 恢复原始商品列表显示
    if (typeof window.updateProductCards === 'function') {
        window.updateProductCards();
    }
    // 重新计算总价和优惠
    if (typeof window.updateTotalPrice === 'function') {
        window.updateTotalPrice();
    }
}

function checkout() {
    console.log('checkout 被点击，当前商品数：', selectedProducts.length);
    if (selectedProducts.length === 0) {
        alert('购物车为空，无需结算');
        return;
    }
    // 保存销售记录
    saveSalesRecord();
    selectedProducts = [];          // 清空数组
    // 清空搜索框
    const salesSearch = document.getElementById('salesSearch');
    if (salesSearch) {
        salesSearch.value = '';
    }
    refreshAll();                   // 刷新 UI
    
}

// 保存整笔销售记录
function saveSalesRecord() {
    console.log('保存销售记录，商品数量:', selectedProducts.length);

    if (selectedProducts.length === 0) {
        console.log('没有商品需要保存');
        return;
    }

    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN');
    const dateKey = now.toISOString().split('T')[0];

    // 计算统计信息（确保数值有效）
    const totalAmount = selectedProducts.reduce((sum, product) => {
        const productTotal = product.total || 0;
        return sum + (isNaN(productTotal) ? 0 : productTotal);
    }, 0);

    const totalItems = selectedProducts.reduce((sum, product) => {
        const productWeight = product.weight || 0;
        return sum + (isNaN(productWeight) ? 0 : productWeight);
    }, 0);

    // 创建记录（确保所有字段都有有效值）
    const record = {
        id: salesRecordCounter++,
        timestamp: timestamp,
        dateKey: dateKey,
        products: selectedProducts.map(product => ({
            name: product.name || '未知商品',
            type: product.type || 'unknown',
            typeCn: typeNameMap[product.type] || '未知类型',
            price: product.price || 0,
            weight: product.weight || 0,
            total: product.total || 0,
            unit: getProductUnit(product)
        })),
        totalAmount: totalAmount,
        totalItems: totalItems,
        itemCount: selectedProducts.length
    };

    // 初始化 salesRecords 数组（如果不存在）
    if (!salesRecords || !Array.isArray(salesRecords)) {
        salesRecords = [];
    }

    salesRecords.push(record);
    console.log('销售记录创建成功:', record);

    // 关键：立即保存到 localStorage（通过统一的saveData函数）
    saveData();
}

// 新增：确认预约商品并返回
function confirmDeliveryProducts() {
    if (selectedProducts.length === 0) {
        alert('请先选择商品');
        return;
    }

    // 关键修复：如果是编辑模式，先恢复原来的库存
    if (isEditingDelivery && editingDeliveryId !== null) {
        const originalDelivery = deliveries.find(d => d.id === editingDeliveryId);
        if (originalDelivery && originalDelivery.status === 'pending') {
            restoreStockFromDelivery(originalDelivery);
        }
    }

    // 关键修复：只复制数据，但不要让销售区的 addProduct 扣库存
    // 所以我们这里要"撤销"之前在销售区扣的库存
    selectedProducts.forEach(item => {
        const product = categories[item.type]?.list.find(p => p.name === item.name);
        if (product) {
            product.sold -= item.weight; // 撤销销售区扣的库存
        }
    });

    tempDeliveryProducts = selectedProducts.map(p => ({...p})); // 深拷贝
    selectedProducts = []; // 清空销售区

    
    // 返回预约配送区
    document.querySelector('.tab[data-tab="delivery"]').click();
    updateSelectedProductsSummary();
    refreshAll();
}

// ==================== 分类筛选 ====================
function initCategoryFilter() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            if (typeof window.updateProductCards === 'function') window.updateProductCards();
        });
    });
}

// ==================== 添加商品到购物车 ====================
// 在 main.js 中添加价格冲突检测和重新计算逻辑
function checkPriceConflicts() {
    console.log('检查价格冲突...');

    // 按商品名称分组，检查是否有同一商品既有会员价又有打折价
    const productGroups = {};

    selectedProducts.forEach((item, index) => {
        const productName = item.originalProductName || item.name;
        if (!productGroups[productName]) {
            productGroups[productName] = [];
        }
        productGroups[productName].push({ index, item });
    });

    // 处理每个商品组的价格冲突
    Object.values(productGroups).forEach(group => {
        if (group.length > 1) {
            const hasDiscount = group.some(g => g.item.isDiscount);
            const hasMemberPrice = group.some(g => !g.item.isDiscount && g.item.price < g.item.originalPrice);

            if (hasDiscount && hasMemberPrice) {
                console.log(`商品 ${group[0].item.name} 存在价格冲突，恢复会员价为原价`);

                // 将非打折商品的价格恢复为原价
                group.forEach(g => {
                    if (!g.item.isDiscount && g.item.price < g.item.originalPrice) {
                        selectedProducts[g.index].price = g.item.originalPrice;
                        selectedProducts[g.index].total = g.item.originalPrice * g.item.weight;
                        console.log(`恢复 ${g.item.name} 价格为原价: ${g.item.originalPrice}`);
                    }
                });
            }
        }
    });
}
// 在 main.js 的 addProduct 函数中修改，添加价格重新计算逻辑
// 在 main.js 中修改 addProduct 函数


// 修改会员验证函数，验证后重新计算价格
function verifyMember() {
    const input = document.getElementById('verifyMemberInput');
    const nameOrPhone = input.value.trim();

    if (!nameOrPhone) {
        alert('请输入姓名或手机号');
        return;
    }

    const member = MemberManager.verifyMember(nameOrPhone);
    if (member) {
        // 验证成功
        const statusEl = document.getElementById('memberStatus');
        const infoEl = document.getElementById('memberInfo');
        const clearBtn = document.getElementById('clearMemberBtn');
        const verifyBtn = document.getElementById('verifyMemberBtn');

        statusEl.textContent = '已验证';
        statusEl.className = 'member-status verified';
        infoEl.innerHTML = `欢迎，${member.name}！享受会员专属价格`;
        infoEl.style.display = 'block';
        clearBtn.style.display = 'inline-block';
        verifyBtn.style.display = 'none';

        // 禁用输入框
        input.disabled = true;

        // 重新计算购物车中所有商品的价格
        recalculateCartPricesForMember();

        // 检查价格冲突
        checkPriceConflicts();

        // 刷新显示
        refreshAll();

        alert(`会员验证成功！欢迎 ${member.name}`);
    } else {
        alert('会员验证失败，请检查姓名或手机号是否正确');
    }
}



// 在 main.js 中添加价格重新计算函数
function recalculateCartPrices() {
    console.log('重新计算购物车价格...');

    // 遍历购物车中的所有商品
    selectedProducts.forEach((item, index) => {
        if (!item.isDiscount) {
            // 对于正常商品，检查是否有对应的特价商品在购物车中
            let hasDiscountVersionInCart = false;

            if (typeof window.DiscountProductManager !== 'undefined') {
                const discountProduct = DiscountProductManager.getDiscountProductByOriginalName(item.name);
                if (discountProduct && discountProduct.isActive) {
                    // 检查购物车中是否已经有该商品的特价版本
                    hasDiscountVersionInCart = selectedProducts.some(cartItem =>
                        cartItem.isDiscount && cartItem.originalProductName === item.name
                    );
                }
            }

            // 如果购物车中有特价版本，正常商品应该使用原价
            if (hasDiscountVersionInCart && item.price < item.originalPrice) {
                console.log(`商品 ${item.name} 有特价版本在购物车中，价格从 ${item.price} 恢复为 ${item.originalPrice}`);

                // 更新价格和总价
                selectedProducts[index].price = item.originalPrice;
                selectedProducts[index].total = item.originalPrice * item.weight;
            }
            // 如果购物车中没有特价版本，正常商品可以使用会员价
            else if (!hasDiscountVersionInCart &&
                typeof window.MemberProductManager !== 'undefined' &&
                typeof window.MemberManager !== 'undefined' &&
                window.MemberManager.getCurrentMember()) {

                const memberPrice = window.MemberProductManager.getPriceForCurrentMember(item.name, item.originalPrice);

                if (typeof memberPrice === 'number' && !isNaN(memberPrice) && memberPrice < item.originalPrice) {
                    console.log(`商品 ${item.name} 没有特价版本在购物车中，价格从 ${item.price} 调整为会员价 ${memberPrice}`);

                    // 更新价格和总价
                    selectedProducts[index].price = memberPrice;
                    selectedProducts[index].total = memberPrice * item.weight;
                }
            }
        }
    });
}

// 新增：为会员重新计算购物车价格
function recalculateCartPricesForMember() {
    console.log('为会员重新计算购物车价格...');

    selectedProducts.forEach((item, index) => {
        if (!item.isDiscount) {
            // 只对非打折商品应用会员价
            const currentMember = MemberManager.getCurrentMember();
            if (currentMember && typeof window.MemberProductManager !== 'undefined') {
                const memberPrice = window.MemberProductManager.getPriceForCurrentMember(item.name, item.originalPrice);

                if (typeof memberPrice === 'number' && !isNaN(memberPrice) && memberPrice < item.originalPrice) {
                    // 检查是否有该商品的特价版本在购物车中
                    const hasDiscountVersion = selectedProducts.some(p =>
                        p.isDiscount && p.originalProductName === item.name
                    );

                    if (!hasDiscountVersion) {
                        console.log(`为会员更新 ${item.name} 价格: ${item.price} -> ${memberPrice}`);
                        selectedProducts[index].price = memberPrice;
                        selectedProducts[index].total = memberPrice * item.weight;
                    }
                }
            }
        }
    });

    // 检查价格冲突
    checkPriceConflicts();
}

function validateProductData(product) {
    if (!product) return false;

    const checks = [
        typeof product.name === 'string',
        typeof product.price === 'number' && !isNaN(product.price),
        typeof product.initialStock === 'number' && !isNaN(product.initialStock),
        typeof product.sold === 'number' && !isNaN(product.sold)
    ];

    return checks.every(check => check === true);
}


// ==================== 初始化库存区 ====================
function initInventory() {
    if (typeof window.updateAllInventoryDetails === 'function') window.updateAllInventoryDetails();
}

// ==================== 统一进货管理 ====================
let stockTypeSelect, stockProductSelect;

function initStockManagement() {
    stockTypeSelect = document.getElementById('stockType');
    stockProductSelect = document.getElementById('stockProduct');
    const amountInput = document.getElementById('stockAmount');
    const addBtn = document.getElementById('addStockBtn');

    stockTypeSelect.addEventListener('change', updateStockProductOptions);
    updateStockProductOptions();

    addBtn.addEventListener('click', () => {
        const type = stockTypeSelect.value;
        const name = stockProductSelect.value;
        const amount = parseFloat(amountInput.value);

        if (!type || !name || isNaN(amount) || amount <= 0) {
            alert('请填写完整且有效的进货信息');
            return;
        }

        const product = categories[type].list.find(p => p.name === name);
        if (!product) {
            alert('商品不存在');
            return;
        }

        product.initialStock += amount;
        refreshAll();
        amountInput.value = '';
        alert(`成功为【${product.name}】添加 ${amount}${getUnit(type)} 进货`);
    });
}

// ==================== 刷新进货商品下拉框 ====================
function updateStockProductOptions() {
    if (!stockProductSelect || !stockTypeSelect) return;
    const type = stockTypeSelect.value;
    stockProductSelect.innerHTML = '<option value="">请选择商品</option>';
    if (categories[type]) {
        categories[type].list.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            stockProductSelect.appendChild(opt);
        });
    }
}

// ==================== 商品完整修改功能 ====================
// 开始编辑商品（点击「修改」按钮）
function startEditProduct(type, name) {
    console.log('开始编辑商品:', type, name); // 调试日志
    
    const cat = categories[type];
    const product = cat.list.find(p => p.name === name);
    if (!product) {
        console.error('商品未找到:', type, name);
        return;
    }

    editingProduct = { type, product };

    const cap = type.charAt(0).toUpperCase() + type.slice(1); // fruit -> Fruit

        // 更新按钮文本和样式
    const addBtn = document.getElementById(`addNew${cap}Btn`);
    if (addBtn) {
        addBtn.textContent = `更新${typeNameMap[type] || cap}`;
        addBtn.classList.add('update-mode'); // 添加CSS类
        console.log('按钮已更新为:', addBtn.textContent);
        // addBtn.style.backgroundColor = '#ff9800';
        // addBtn.style.borderColor = '#ff9800';
        // console.log('按钮已更新为:', addBtn.textContent);
    } else {
        console.error('按钮未找到:', `addNew${cap}Btn`);
        return;
    }

    // 填充表单
    const nameInput = document.getElementById(`new${cap}Name`);
    const priceInput = document.getElementById(`new${cap}Price`);
    const stockInput = document.getElementById(`new${cap}Stock`);
    const iconInput = document.getElementById(`new${cap}Icon`);

    if (nameInput && priceInput && stockInput && iconInput) {
        nameInput.value = product.name;
        priceInput.value = product.price;
        stockInput.value = product.initialStock;
        iconInput.value = product.icon;
        console.log('表单填充完成');
    } else {
        console.error('表单元素未找到');
        return;
    }

    // 填充单位信息
    const unitSelect = document.getElementById(`new${cap}Unit`);
    const customInput = document.getElementById(`new${cap}CustomUnit`);


    if (unitSelect && customInput) {
        const recommendedUnits = categoryRecommendedUnits[type] || [];
        if (product.unit && !recommendedUnits.includes(product.unit)) {
            // 如果是自定义单位
            unitSelect.value = 'custom';
            customInput.style.display = 'block';
            customInput.value = product.unit;
        } else if (product.unit) {
            // 如果是预设单位
            unitSelect.value = product.unit;
            customInput.style.display = 'none';
        }
    }

    // 高亮对应图标
   
    const iconSelector = document.getElementById(`${type}-icon-selector`);
    if (iconSelector) {
        iconSelector.querySelectorAll('.icon-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.icon === product.icon);
        });
    }
     // 自动切换到该品类管理页
    const managementTab = document.querySelector(`.management-tab[data-management-tab="${type}"]`);
    if (managementTab) {
        managementTab.click();
        console.log('已切换到管理页:', type);
    }
}

// 在 main.js 的 addOrUpdateProduct 函数中添加会员价同步更新
// main.js - 完全重写 addOrUpdateProduct 函数中的单位获取部分
function addOrUpdateProduct(type) {
    console.log('执行添加/更新商品:', type, '编辑模式:', !!editingProduct);

    const cap = type.charAt(0).toUpperCase() + type.slice(1);

    const nameInput = document.getElementById(`new${cap}Name`);
    const priceInput = document.getElementById(`new${cap}Price`);
    const stockInput = document.getElementById(`new${cap}Stock`);
    const iconInput = document.getElementById(`new${cap}Icon`);

    if (!nameInput || !priceInput || !stockInput || !iconInput) {
        alert('表单元素未找到，请刷新页面重试');
        return;
    }

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const stock = parseFloat(stockInput.value);
    const icon = iconInput.value;

    // 关键修改：直接获取单位选择器的值
    let unit = '公斤'; // 默认值改为公斤以匹配问题描述
    
    const unitSelect = document.getElementById(`new${cap}Unit`);
    const customInput = document.getElementById(`new${cap}CustomUnit`);
    
    console.log('单位选择器状态:', {
        unitSelect: unitSelect?.value,
        customInput: customInput?.value,
        customDisplay: customInput?.style.display
    });
    
    if (unitSelect && unitSelect.value) {
        if (unitSelect.value === 'custom') {
            // 自定义单位
            if (customInput && customInput.value.trim()) {
                unit = customInput.value.trim();
                console.log('使用自定义单位:', unit);
            } else {
                console.log('选择了自定义但未输入值，使用默认单位');
            }
        } else if (unitSelect.value !== '' && unitSelect.value !== '选择单位') {
            // 预设单位
            unit = unitSelect.value;
            console.log('使用预设单位:', unit);
        }
    } else {
        console.log('单位选择器未选择或未找到，使用默认单位');
    }
    
    console.log('最终确定的单位:', unit);

    if (!name || !icon || isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
        alert('请填写完整且有效的商品信息');
        return;
    }

    const cat = categories[type];

    if (editingProduct && editingProduct.type === type) {
        // === 更新模式 ===
        console.log('更新商品:', editingProduct.product.name, '->', name);

        // 检查新名字是否重复（除了自己）
        if (editingProduct.product.name !== name && cat.list.some(p => p.name === name)) {
            alert('商品名称已存在！');
            return;
        }

        const oldName = editingProduct.product.name;
        const oldPrice = editingProduct.product.price;

        editingProduct.product.name = name;
        editingProduct.product.price = price;
        editingProduct.product.initialStock = stock;
        editingProduct.product.icon = icon;
        editingProduct.product.unit = unit; // 使用获取到的单位

        // 新增：如果商品名称或价格变化，更新对应的会员价
        if (typeof window.MemberProductManager !== 'undefined') {
            // 如果商品名称变化，需要更新会员商品数据
            if (oldName !== name && window.MemberProductManager.hasMemberPrice(oldName)) {
                const memberProduct = window.MemberProductManager.getMemberPrice(oldName);
                if (memberProduct) {
                    // 删除旧的会员价记录
                    window.MemberProductManager.removeMemberPrice(oldName);
                    // 创建新的会员价记录
                    window.MemberProductManager.setMemberDiscount(name, memberProduct.discount);
                }
            } else if (oldPrice !== price) {
                // 如果只是价格变化，更新会员价
                window.MemberProductManager.updateMemberPriceForProduct(name);
            }
        }

        alert('商品修改成功！');
    } else {
        // === 添加新商品 ===
        if (cat.list.some(p => p.name === name)) {
            alert('商品名称已存在！');
            return;
        }

        cat.list.push({
            name,
            price,
            icon,
            initialStock: stock,
            sold: 0,
            type,
            unit: unit // 使用获取到的单位
        });
        alert('商品添加成功！');
    }

    // 清空表单 + 恢复状态
    resetProductForm(type);
    refreshAll();
}

// ==================== 重置商品表单 ====================
function resetProductForm(type) {
    const cap = type.charAt(0).toUpperCase() + type.slice(1);
    
    const nameInput = document.getElementById(`new${cap}Name`);
    const priceInput = document.getElementById(`new${cap}Price`);
    const stockInput = document.getElementById(`new${cap}Stock`);
    const iconInput = document.getElementById(`new${cap}Icon`);

    if (nameInput && priceInput && stockInput && iconInput) {
        nameInput.value = '';
        priceInput.value = '';
        stockInput.value = '';
        iconInput.value = '';
    }
    
    document.querySelectorAll(`#${type}-icon-selector .icon-option`).forEach(opt => {
        opt.classList.remove('selected');
    });

    // 重置单位选择器
    const unitSelect = document.getElementById(`new${cap}Unit`);
    const customInput = document.getElementById(`new${cap}CustomUnit`);
    if (unitSelect) unitSelect.value = '';
    if (customInput) {
        customInput.style.display = 'none';
        customInput.value = '';
    }

    // 恢复按钮状态
    const addBtn = document.getElementById(`addNew${cap}Btn`);
    if (addBtn) {
        addBtn.textContent = `添加${typeNameMap[type] || cap}`;
        addBtn.classList.remove('update-mode'); // 移除CSS类
        addBtn.style.backgroundColor = ''; // 恢复默认颜色
        addBtn.style.borderColor = '';
    }

    editingProduct = null;
    console.log('表单已重置');
}

// 在 initFullProductManagement() 函数中替换原有的事件监听代码
// ==================== 初始化完整商品管理 ====================
function initFullProductManagement() {
    const types = ['fruit','vegetable','snack','cigarette','liquor','beverage','frozen','kitchen','living'];

    // 直接绑定所有「添加XX」按钮
    types.forEach(type => {
        const cap = type.charAt(0).toUpperCase() + type.slice(1);
        const btn = document.getElementById(`addNew${cap}Btn`);
        if (btn) {
            btn.addEventListener('click', () => addOrUpdateProduct(type));
        }
    });

    // 图标选择器绑定
    document.querySelectorAll('.icon-option').forEach(opt => {
        opt.addEventListener('click', function() {
            const selector = this.closest('.icon-selector');
            selector.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');

            const input = selector.parentElement.querySelector('input[readonly]');
            if (input) input.value = this.dataset.icon;
        });
    });
}
// ==================== 初始化商品管理 ====================
function initProductManagement() {
    const types = ['fruit', 'vegetable', 'snack', 'cigarette', 'liquor', 'beverage', 'frozen', 'kitchen', 'living'];
    const capMap = {
        fruit: 'Fruit', vegetable: 'Vegetable', snack: 'Snack',
        cigarette: 'Cigarette', liquor: 'Liquor', beverage: 'Beverage',
        frozen: 'Frozen', kitchen: 'Kitchen', living: 'Living'
    };

    types.forEach(type => {
        const cap = capMap[type];
        // const addBtn = document.getElementById(`addNew${cap}Btn`);
        // if (addBtn) {
        //     addBtn.addEventListener('click', () => addNewProduct(type));
        // }

        const selector = categories[type].iconSelector;
        if (selector) {
            document.querySelectorAll(`${selector} .icon-option`).forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll(`${selector} .icon-option`).forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    const iconInput = document.getElementById(`new${cap}Icon`);
                    if (iconInput) iconInput.value = option.dataset.icon;
                });
            });
        }
    });

    if (typeof window.updateProductManagementList === 'function') window.updateProductManagementList();
}

// ==================== 添加新商品 ====================
function addNewProduct(type) {
    const cap = {
        fruit: 'Fruit', vegetable: 'Vegetable', snack: 'Snack',
        cigarette: 'Cigarette', liquor: 'Liquor', beverage: 'Beverage',
        frozen: 'Frozen', kitchen: 'Kitchen', living: 'Living'
    }[type];

    const nameInput = document.getElementById(`new${cap}Name`);
    const priceInput = document.getElementById(`new${cap}Price`);
    const stockInput = document.getElementById(`new${cap}Stock`);
    const iconInput = document.getElementById(`new${cap}Icon`);

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const stock = parseFloat(stockInput.value);
    const icon = iconInput.value;

    if (!name || isNaN(price) || price < 0 || isNaN(stock) || stock < 0 || !icon) {
        alert('请填写完整且有效的商品信息');
        return;
    }

    if (categories[type].list.some(p => p.name === name)) {
        alert(`该${typeNameMap[type] || type}「${name}」已存在`);
        return;
    }

    categories[type].list.push({
        name, price, icon, initialStock: stock, sold: 0, type
    });

    nameInput.value = '';
    priceInput.value = '';
    stockInput.value = '';
    iconInput.value = '';
    document.querySelectorAll(`${categories[type].iconSelector} .icon-option`).forEach(o => o.classList.remove('selected'));

    refreshAll();
    alert(`成功添加${typeNameMap[type] || type}「${name}」`);
}



// ==================== 新增：初始化预约配送区 ====================
function initDelivery() {
    const addBtn = document.getElementById('addDeliveryBtn');
    const selectProductsBtn = document.getElementById('selectProductsBtn');
    const selectMemberBtn = document.getElementById('selectMemberBtn'); // 新增
    const sortBtn = document.getElementById('sortBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedDeliveriesBtn');

    if (addBtn) addBtn.addEventListener('click', addOrUpdateDelivery);
    if (selectProductsBtn) selectProductsBtn.addEventListener('click', () => {
        isSelectingForDelivery = true;

        // 关键修改：如果是编辑模式，将临时商品加载到销售区
        if (isEditingDelivery && tempDeliveryProducts.length > 0) {
            selectedProducts = tempDeliveryProducts.map(p => ({...p}));
        } else {
            // 新建模式，清空销售区商品
            selectedProducts = [];
        }

        
        document.querySelector('.tab[data-tab="sales"]').click();
        refreshAll();
    });

    // 新增：会员选择按钮事件
    if (selectMemberBtn) {
        selectMemberBtn.addEventListener('click', openMemberSelectionModal);
    }

    if (sortBtn) sortBtn.addEventListener('click', sortDeliveries);
        // 修改清空按钮事件
        // 绑定删除选中记录按钮事件
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedDeliveries);
        // 确保初始状态为隐藏
        deleteSelectedBtn.style.display = 'none';
        deleteSelectedBtn.style.opacity = '0';
    }

    // 初始化打印功能
    initPrintFunction();

    // 初始化批量操作
        // 初始化批量操作 - 延迟执行确保DOM加载完成
    setTimeout(() => {
        initDeliveryBatchOperations();
    }, 500);

    updateSelectedProductsSummary();
    // 新增：创建会员选择模态框
    createMemberSelectionModal();
}

// 新增：恢复库存函数（用于未配送的修改/删除）
function restoreStockFromDelivery(delivery) {
    if (!delivery || delivery.status !== 'pending') return;
    delivery.products.forEach(p => {
        const product = categories[p.type]?.list.find(item => item.name === p.name);
        if (product) {
            product.sold = Math.max(0, product.sold - p.weight);
        }
    });
}

// 新增：扣减库存函数（用于保存未配送预约）
function deductStockFromDelivery(delivery) {
    if (!delivery || delivery.status !== 'pending') return;
    delivery.products.forEach(p => {
        const product = categories[p.type]?.list.find(item => item.name === p.name);
        if (product) {
            product.sold += p.weight;
        }
    });
}

// 添加或更新预约（核心函数，已彻底修复 ×2 问题）
function addOrUpdateDelivery() {
    const date = document.getElementById('deliveryDate').value;
    const time = document.getElementById('deliveryTime').value;
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const address = document.getElementById('deliveryAddress').value.trim();
    const note = document.getElementById('deliveryNote').value.trim();
    const total = tempDeliveryProducts.reduce((sum, p) => sum + p.total, 0);

    if (!date || !time || !name || !phone || !address || tempDeliveryProducts.length === 0) {
        alert('请填写完整信息并选择商品');
        return;
    }

    if (isEditingDelivery&& editingDeliveryId !== null) {
        // === 编辑模式 ===
        const delivery = deliveries.find(d => d.id === editingDeliveryId);
        if (!delivery) {
            alert('订单不存在');
            return;
        }

        // 1. 如果原订单是"未配送"，先恢复其库存（防止重复扣除）
        if (delivery.status === 'pending') {
            restoreStockFromDelivery(delivery);
        }

        // 2. 更新订单内容
        delivery.date = date;
        delivery.time = time;
        delivery.name = name;
        delivery.phone = phone;
        delivery.address = address;
        delivery.products = [...tempDeliveryProducts];
        delivery.total = total;
        delivery.note = note;

        // 3. 如果仍然是"未配送"，重新扣除新商品的库存（只扣一次）
        if (delivery.status === 'pending') {
            deductStockFromDelivery(delivery);
        }

        // 重置编辑状态
        isEditingDelivery = false;
        editingDeliveryId = null;


        
        alert('预约修改成功！');
        
    } else {
        // === 新建预约 ===
        const newDelivery = {
            id: deliveryCounter++,
            date,
            time,
            name,
            phone,
            address,
            products: [...tempDeliveryProducts],
            total,
            note,
            status: 'pending'  // 新建默认未配送
        };

        deliveries.push(newDelivery);

        // 只在保存预约时才真正扣库存（且只扣一次）
        deductStockFromDelivery(newDelivery);

        alert('预约添加成功！');
    }

    // 清空表单 + 重置临时商品
    clearDeliveryForm();
    refreshAll();
}


// 修改：编辑预约（已配送时禁用）
function editDelivery(id) {
    const delivery = deliveries.find(d => d.id === id);
    if (!delivery) return;

    if (delivery.status === 'delivered') {
        alert('已配送的订单不能修改！');
        return;
    }

    // 关键修改：停留在预约配送区，只填充表单，不跳转到销售区
    isEditingDelivery = true;
    editingDeliveryId = id;

    // 填充表单
    document.getElementById('deliveryDate').value = delivery.date;
    document.getElementById('deliveryTime').value = delivery.time;
    document.getElementById('contactName').value = delivery.name;
    document.getElementById('contactPhone').value = delivery.phone;
    document.getElementById('deliveryAddress').value = delivery.address;
    document.getElementById('deliveryNote').value = delivery.note;
    
    // 加载商品到临时变量，但不加载到销售区
    tempDeliveryProducts = delivery.products.map(p => ({...p}));
    updateSelectedProductsSummary();

    // 更新按钮为橙色
    const addDeliveryBtn = document.getElementById('addDeliveryBtn');
    if (addDeliveryBtn) {
        addDeliveryBtn.textContent = '更新预约';
        addDeliveryBtn.classList.add('update-mode');

        console.log('预约按钮已更新为更新模式');
    }

    // 确保停留在预约配送区
    document.querySelector('.tab[data-tab="delivery"]').click();
    refreshAll();
}



// 新增：切换状态
function toggleDeliveryStatus(id) {
    const delivery = deliveries.find(d => d.id === id);
    if (delivery) {
        delivery.status = delivery.status === 'pending' ? 'delivered' : 'pending';
        refreshAll();
    }
}

// ==================== 初始化配送批量操作 ====================
function initDeliveryBatchOperations() {
    console.log('初始化配送批量操作...');
    // 全选/全不选
    const selectAllCheckbox = document.getElementById('selectAllDeliveries');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            console.log('全选状态改变:', this.checked);
            const checkboxes = document.querySelectorAll('.delivery-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateDeliveryBatchUI();
        });
    } else {
        console.log('全选复选框未找到');
    }

    // 使用事件委托处理动态生成的复选框
    document.addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('delivery-checkbox')) {
            console.log('单个复选框改变:', e.target.checked, e.target.dataset.id);
            updateDeliveryBatchUI();
        }
    });
}

// ==================== 更新配送批量操作UI ====================
// 更新配送批量操作UI
function updateDeliveryBatchUI() {
    const checkboxes = document.querySelectorAll('.delivery-checkbox');
    const checkedBoxes = document.querySelectorAll('.delivery-checkbox:checked');
    const selectAllBox = document.getElementById('selectAllDeliveries');
    const deleteBtn = document.getElementById('deleteSelectedDeliveriesBtn');
    const printBtn = document.getElementById('printSelectedDeliveriesBtn');
    const printCountSpan = document.getElementById('selectedPrintCount');

    const count = checkedBoxes.length;
    const total = checkboxes.length;

    console.log('更新批量UI - 选中:', count, '总数:', total);

    // 更新全选状态
    if (selectAllBox) {
        if (count === 0) {
            selectAllBox.checked = false;
            selectAllBox.indeterminate = false;
        } else if (count === total && total > 0) {
            selectAllBox.checked = true;
            selectAllBox.indeterminate = false;
        } else if (count > 0) {
            selectAllBox.indeterminate = true;
        }
    }

    // 更新删除和打印按钮显示/隐藏状态
    if (deleteBtn && printBtn && printCountSpan) {
        printCountSpan.textContent = count;

        if (count > 0) {
            // 显示按钮
            deleteBtn.style.display = 'inline-block';
            printBtn.style.display = 'inline-block';

            setTimeout(() => {
                deleteBtn.style.opacity = '1';
                deleteBtn.style.transform = 'scale(1)';
                printBtn.style.opacity = '1';
                printBtn.style.transform = 'translateX(0)';
            }, 10);
        } else {
            // 隐藏按钮
            deleteBtn.style.opacity = '0';
            deleteBtn.style.transform = 'scale(0.8)';
            printBtn.style.opacity = '0';
            printBtn.style.transform = 'translateX(120%)';

            // 延迟隐藏以显示动画
            setTimeout(() => {
                deleteBtn.style.display = 'none';
                printBtn.style.display = 'none';
            }, 300);
        }
    }
}

// ==================== 删除选中的配送记录 ====================
function deleteSelectedDeliveries() {
    const checkedBoxes = document.querySelectorAll('.delivery-checkbox:checked');
    console.log('删除选中记录，选中数量:', checkedBoxes.length);
    if (checkedBoxes.length === 0) {
        if (confirm('确定清空所有预约记录吗？\n未配送的订单商品库存将自动恢复！')) {
            clearAllDeliveries();
        }
        return;
    }

    const selectedIds = Array.from(checkedBoxes).map(cb => parseInt(cb.dataset.id));
    const selectedDeliveries = deliveries.filter(d => selectedIds.includes(d.id));
    
    const names = selectedDeliveries.map(d => `${d.name} (${d.date} ${d.time})`).join('\n');
    
    if (!confirm(`确定删除选中的 ${selectedIds.length} 条预约记录吗？\n\n${names}\n\n未配送的订单商品库存将自动恢复！`)) {
        return;
    }

    // 恢复未配送订单的库存
    selectedDeliveries.forEach(delivery => {
        if (delivery.status === 'pending') {
            restoreStockFromDelivery(delivery);
        }
    });

    // 删除选中的记录
    deliveries = deliveries.filter(d => !selectedIds.includes(d.id));
    
    refreshAll();
    alert(`已删除 ${selectedIds.length} 条预约记录`);
}
// 修复：一键清空所有记录（避免死循环）


// ==================== 修改原来的清空所有记录函数 ====================
function clearAllDeliveries() {
    if (deliveries.length === 0) {
        alert('没有可清空的记录');
        return;
    }

    if (!confirm('确定清空所有预约记录吗？\n未配送的订单商品库存将自动恢复！')) {
        return;
    }
    // 只恢复未配送的库存
    deliveries.forEach(delivery => {
        if (delivery.status === 'pending') {
            restoreStockFromDelivery(delivery);
        }
    });

    deliveries = [];
    deliveryCounter = 0;
    // 关键：清空后立即保存到localStorage
    saveData();

    refreshAll();
    alert('所有记录已清空');
}

// ==================== 打印功能 ====================

// 初始化打印功能
function initPrintFunction() {
    const printBtn = document.getElementById('printSelectedDeliveriesBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printSelectedDeliveries);
    }
}

// 打印选中的配送记录
// 打印选中的配送记录
function printSelectedDeliveries() {
    console.log('printSelectedDeliveries 函数开始执行');

    try {
        const checkedBoxes = document.querySelectorAll('.delivery-checkbox:checked');
        console.log('选中的复选框数量:', checkedBoxes.length);

        if (checkedBoxes.length === 0) {
            alert('请先选择要打印的配送记录');
            return;
        }

        const selectedIds = Array.from(checkedBoxes).map(cb => {
            console.log('复选框数据:', cb.dataset.id);
            return parseInt(cb.dataset.id);
        });

        console.log('选中的ID:', selectedIds);

        const selectedDeliveries = deliveries.filter(d => selectedIds.includes(d.id));
        console.log('找到的配送记录:', selectedDeliveries);

        if (selectedDeliveries.length === 0) {
            alert('未找到选中的配送记录');
            return;
        }

        // 生成打印内容
        console.log('开始生成打印内容');
        const printContent = generatePrintContent(selectedDeliveries);
        console.log('打印内容生成完成');

        // 创建打印窗口
        console.log('创建打印窗口');
        const printWindow = window.open('', '_blank', 'width=400,height=600');

        if (!printWindow) {
            alert('弹出窗口被阻止，请允许弹出窗口后重试');
            return;
        }

        printWindow.document.write(printContent);
        printWindow.document.close();

        console.log('打印窗口准备完成，等待打印');

        // 延迟打印以确保样式加载
        setTimeout(() => {
            console.log('开始打印');
            printWindow.print();
            console.log('打印命令已发送');
        }, 1000);

    } catch (error) {
        console.error('打印过程中发生错误:', error);
        alert('打印失败: ' + error.message);
    }
}

// 生成打印内容 - 超市配送专用模板
// 生成打印内容 - 超市配送专用模板
function generatePrintContent(deliveries) {
    const printStyles = `
        <style>
            @media print {
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: 'Microsoft YaHei', Arial, sans-serif;
                    background: white;
                }
                .delivery-slip {
                    width: 80mm;
                    margin: 0 auto;
                    padding: 10px;
                    border: 2px dashed #333;
                    page-break-after: always;
                    background: white;
                    box-sizing: border-box;
                }
                .delivery-slip:last-child {
                    page-break-after: auto;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 8px;
                    margin-bottom: 8px;
                }
                .store-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 5px 0;
                }
                .title {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 5px 0;
                }
                .order-info {
                    margin: 8px 0;
                    font-size: 12px;
                }
                .customer-info {
                    background: #f5f5f5;
                    padding: 8px;
                    margin: 8px 0;
                    border-radius: 4px;
                    font-size: 12px;
                }
                .products-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 8px 0;
                    font-size: 11px;
                }
                .products-table th,
                .products-table td {
                    border: 1px solid #ddd;
                    padding: 4px;
                    text-align: left;
                }
                .products-table th {
                    background: #eee;
                    font-weight: bold;
                }
                .total-section {
                    text-align: right;
                    margin: 8px 0;
                    font-size: 13px;
                    font-weight: bold;
                }
                .note-section {
                    margin: 8px 0;
                    padding: 6px;
                    border: 1px dashed #999;
                    font-size: 11px;
                    background: #fff9e6;
                }
                .footer {
                    text-align: center;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px solid #333;
                    font-size: 10px;
                    color: #666;
                }
                .status-badge {
                    display: inline-block;
                    padding: 2px 6px;
                    background: #ff9800;
                    color: white;
                    border-radius: 3px;
                    font-size: 10px;
                    margin-left: 5px;
                }
                .barcode-area {
                    text-align: center;
                    margin: 8px 0;
                    padding: 5px;
                    border: 1px dashed #ccc;
                }
                .print-time {
                    font-size: 10px;
                    color: #666;
                    text-align: right;
                }
                .phone-masked {
                    color: #666;
                }
            }
            @page {
                margin: 0;
                size: auto;
            }
        </style>
    `;

    let slipsHTML = '';

    deliveries.forEach((delivery, index) => {
        const productsTable = generateProductsTable(delivery.products);
        const printTime = new Date().toLocaleString('zh-CN');

        // 修复：在这里定义 maskedPhone 变量
        const maskedPhone = maskPhoneNumber(delivery.phone);

        slipsHTML += `
            <div class="delivery-slip">
                <div class="header">
                    <div class="store-name">鲜品优选超市配送单</div>
                    
                </div>

                <div class="customer-info">
                    <div><strong> 配送时间:</strong> ${delivery.date} ${delivery.time}</div>
                    <div><strong> 客户姓名:</strong> ${delivery.name}</div>
                    <div><strong> 联系电话:</strong> <span class="phone-masked">${maskedPhone}</span></div>
                    <div><strong> 配送地址:</strong> ${delivery.address}</div>
                </div>
                
                ${productsTable}
                
                <div class="total-section">
                    <strong>商品总计: ¥${delivery.total.toFixed(2)}</strong>
                </div>
                
                ${delivery.note ? `
                <div class="note-section">
                    <strong>备注:</strong> ${delivery.note}
                </div>
                ` : ''}
                
                <div class="footer">
                    <div>感谢您的惠顾！</div>
                    <div>配送员电话：15093272227</div>
                    <div>鲜品优选超市 - 用心服务每一位顾客</div>
                </div>
            </div>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>超市配送单打印</title>
            <meta charset="UTF-8">
            ${printStyles}
        </head>
        <body>
            ${slipsHTML}
        </body>
        </html>
    `;
}

// 隐藏电话号码中间4位
// 隐藏电话号码中间4位
function maskPhoneNumber(phone) {
    console.log('隐藏电话号码，原始号码:', phone);

    if (!phone || typeof phone !== 'string') {
        return '电话未提供';
    }

    // 移除所有非数字字符
    const cleanPhone = phone.replace(/\D/g, '');
    console.log('清理后的号码:', cleanPhone);

    // 检查是否为11位手机号
    if (cleanPhone.length === 11) {
        const masked = cleanPhone.substring(0, 3) + '****' + cleanPhone.substring(7);
        console.log('11位手机号隐藏后:', masked);
        return masked;
    }

    // 检查是否为座机号（带区号）
    if (cleanPhone.length === 11 || cleanPhone.length === 12) {
        // 座机号格式：区号(3-4位) + 电话号码(7-8位)
        const areaCodeLength = cleanPhone.length - 8; // 假设后8位是主要号码
        if (areaCodeLength >= 3 && areaCodeLength <= 4) {
            const areaCode = cleanPhone.substring(0, areaCodeLength);
            const mainNumber = cleanPhone.substring(areaCodeLength);
            // 隐藏主要号码的中间部分
            const maskedMain = mainNumber.substring(0, 2) + '****' + mainNumber.substring(6);
            const masked = areaCode + '-' + maskedMain;
            console.log('座机号隐藏后:', masked);
            return masked;
        }
    }

    // 其他格式的电话号码，隐藏中间部分
    if (cleanPhone.length >= 7) {
        const visibleStart = Math.floor(cleanPhone.length * 0.3);
        const visibleEnd = Math.floor(cleanPhone.length * 0.7);
        const start = cleanPhone.substring(0, visibleStart);
        const end = cleanPhone.substring(visibleEnd);
        const stars = '*'.repeat(visibleEnd - visibleStart);
        const masked = start + stars + end;
        console.log('其他格式号码隐藏后:', masked);
        return masked;
    }

    // 太短的电话号码，直接显示
    console.log('号码太短，直接显示:', phone);
    return phone;
}
// 生成商品表格
function generateProductsTable(products) {
    if (!products || products.length === 0) {
        return '<div>无商品信息</div>';
    }

    let tableHTML = `
        <table class="products-table">
            <thead>
                <tr>
                    <th width="40%">商品名称</th>
                    <th width="20%">单价</th>
                    <th width="15%">数量</th>
                    <th width="25%">小计</th>
                </tr>
            </thead>
            <tbody>
    `;

    products.forEach(product => {
        tableHTML += `
            <tr>
                <td>${product.name}（${unit}）</td>
                <td>¥${product.price.toFixed(2)}</td>
                <td>${product.weight.toFixed(2)}</td>
                <td>¥${product.total.toFixed(2)}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    return tableHTML;
}

// 新增：统一退货管理
function initReturnManagement() {
    const returnType = document.getElementById('returnType');
    const returnProduct = document.getElementById('returnProduct');
    const returnAmount = document.getElementById('returnAmount');
    const addReturnBtn = document.getElementById('addReturnBtn');

    // 类型切换
    returnType.addEventListener('change', () => {
        const type = returnType.value;
        returnProduct.innerHTML = '<option value="">请选择商品</option>';
        if (categories[type]) {
            categories[type].list.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = `${p.name}`;
                returnProduct.appendChild(opt);
            });
        }
    });

    // 退货按钮
    if (addReturnBtn) {
        addReturnBtn.addEventListener('click', () => {
            const type = returnType.value;
            const name = returnProduct.value;
            const amount = parseFloat(returnAmount.value);

            if (!type || !name || isNaN(amount) || amount <= 0) {
                alert('请完整填写退货信息');
                return;
            }

            const product = categories[type].list.find(p => p.name === name);
            if (!product) {
                alert('商品不存在');
                return;
            }

            // 修改后：
            if (product.sold < amount) {  // 检查已销售量是否足够退货
                alert(`退货失败！已销售量只有 ${product.sold.toFixed(2)}，不能退 ${amount}`);
                return;
            }

            if (confirm(`确定顾客退货 ${name} ${amount}${getUnit(type)} 吗？`)) {
                product.sold -= amount;  // 减少已销售量
                refreshAll();
                alert('顾客退货成功！已销售量已减少，库存已更新');
                returnAmount.value = '';
            }

            if (product.initialStock < amount) {
                alert(`退货失败！原始库存只有 ${product.initialStock.toFixed(2)}，不能退 ${amount}`);
                return;
            }

            // if (confirm(`确定退货 ${name} ${amount}${getUnit(type)} 吗？`)) {
            //     product.initialStock -= amount;
            //     refreshAll();
            //     alert('退货成功！');
            //     returnAmount.value = '';
            // }
        });
    }

    // 初始化默认选项
    returnType.dispatchEvent(new Event('change'));
}
// 新增：排序
function sortDeliveries() {
    const sortBy = document.getElementById('sortBy').value;
    if (sortBy === 'date_time') {
        deliveries.sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.time === '上午' ? '09:00' : a.time === '下午' ? '14:00' : '19:00'}`);
            const dateB = new Date(`${b.date} ${b.time === '上午' ? '09:00' : b.time === '下午' ? '14:00' : '19:00'}`);
            return dateA - dateB;
        });
    } else if (sortBy === 'address') {
        deliveries.sort((a, b) => a.address.localeCompare(b.address));
    }
    refreshAll();
}

// 新增：更新商品摘要
function updateSelectedProductsSummary() {
    const summaryEl = document.getElementById('selectedProductsSummary');
    if (summaryEl) {
        const count = tempDeliveryProducts.length;
        const total = tempDeliveryProducts.reduce((sum, p) => sum + p.total, 0);
        summaryEl.textContent = `已选择商品: ${count} 项，总价: ${total.toFixed(2)} 元`;
    }
}

// 新增：清空表单
function clearDeliveryForm() {
    document.getElementById('deliveryDate').value = '';
    document.getElementById('deliveryTime').value = '';
    document.getElementById('contactName').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('deliveryAddress').value = '';
    document.getElementById('deliveryNote').value = '';
    tempDeliveryProducts = [];
    selectedProducts = []; // 同时清空销售区的商品
    updateSelectedProductsSummary();

     // 重置按钮状态
    // 重置编辑状态和按钮状态
    resetDeliveryEditState();

    isEditingDelivery = false;
    editingDeliveryId = null;
    isSelectingForDelivery = false;
}


// ==================== 重置预约编辑状态 ====================
function resetDeliveryEditState() {
    isEditingDelivery = false;
    editingDeliveryId = null;
    isSelectingForDelivery = false;

    // 重置按钮状态
    resetDeliveryButton();
}

// ==================== 重置预约按钮状态 ====================
function resetDeliveryButton() {
    const addDeliveryBtn = document.getElementById('addDeliveryBtn');
    if (addDeliveryBtn) {
        addDeliveryBtn.textContent = '添加预约';
        addDeliveryBtn.classList.remove('update-mode');
        addDeliveryBtn.style.backgroundColor = '';
        addDeliveryBtn.style.borderColor = '';
        console.log('预约按钮已重置为添加模式');
    }
}

// ==================== 工具函数（如果未定义）===================
if (typeof getUnit === 'undefined') {
    window.getUnit = type => {
        if (type === 'cigarette') return '包';
        if (type === 'beverage'|| type === 'liquor') return '瓶';
        if (type === 'snack') return '个';
        if (type === 'froze') return '公斤|袋';
        if (type === 'kitchen' || type === 'living') return '件';
        return '公斤';
    };
}
if (typeof typeNameMap === 'undefined') {
    window.typeNameMap = {
        fruit: '水果', vegetable: '蔬菜', snack: '零食',
        cigarette: '烟', liquor: '酒', beverage: '饮料',
        frozen: '速冻', kitchen: '厨房', living: '生活'
    };
}

// ==================== 批量删除 + 全选功能（终极版）===================

// ==================== 极简批量操作（只在选中时显示删除按钮）===================

function updateBatchUI() {
    document.querySelectorAll('.management-content.active').forEach(activeTab => {
        const checkboxes = activeTab.querySelectorAll('.product-checkbox');
        const checkedBoxes = activeTab.querySelectorAll('.product-checkbox:checked');
        const selectAllBox = activeTab.querySelector('.select-all-checkbox');
        const deleteBtn = activeTab.querySelector('.delete-selected-btn');
        const countSpan = deleteBtn?.querySelector('.selected-count');

        const count = checkedBoxes.length;
        const total = checkboxes.length;

        // 更新全选状态
        if (selectAllBox) {
            if (count === 0) {
                selectAllBox.checked = false;
                selectAllBox.indeterminate = false;
            } else if (count === total && total > 0) {
                selectAllBox.checked = true;
                selectAllBox.indeterminate = false;
            } else if (count > 0) {
                selectAllBox.indeterminate = true;
            }
        }

        // 控制删除按钮显示/隐藏 + 动画
        if (deleteBtn && countSpan) {
            countSpan.textContent = count;
            if (count > 0) {
                // 显示按钮：从右侧滑入
                deleteBtn.style.transform = 'translateX(0)';
                deleteBtn.style.opacity = '1';
            } else {
                // 隐藏按钮：滑出到右侧
                deleteBtn.style.transform = 'translateX(120%)';
                deleteBtn.style.opacity = '0';
            }
        }
    });
}

function toggleSelectAll(checkbox) {
    const container = checkbox.closest('.management-content');
    if (!container) return;
    const shouldCheck = checkbox.checked;
    container.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = shouldCheck);
    updateBatchUI();
}

function deleteSelectedProducts() {
    const checked = document.querySelectorAll('.product-checkbox:checked');
    if (checked.length === 0) return;

    const items = Array.from(checked).map(cb => ({
        type: cb.dataset.type,
        name: cb.dataset.name
    }));

    const names = items.map(i => i.name).join('、');
    if (!confirm(`确定永久删除这 ${items.length} 个商品吗？\n\n${names}\n\n删除后无法恢复！`)) return;

    items.forEach(item => {
        if (categories[item.type]) {
            categories[item.type].list = categories[item.type].list.filter(p => p.name !== item.name);
        }
    });

    updateBatchUI();
    refreshAll();
}

// ==================== 销售记录功能 ====================

// 初始化销售记录
function initSalesRecords() {
    // 绑定全选事件
    const selectAllCheckbox = document.getElementById('selectAllSalesRecords');
    const selectAllHeaderCheckbox = document.getElementById('selectAllSalesRecordsHeader');
    const deleteBtn = document.getElementById('deleteSelectedSalesRecordsBtn');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.sales-record-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateSalesRecordsBatchUI();
        });
    }

    if (selectAllHeaderCheckbox) {
        selectAllHeaderCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.sales-record-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateSalesRecordsBatchUI();
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteSelectedSalesRecords);
    }

    // 使用事件委托处理动态生成的复选框
    document.addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('sales-record-checkbox')) {
            updateSalesRecordsBatchUI();
        }
    });
}

// 辅助函数：获取商品单位
function getProductUnit(product) {
    if (product.unit) return product.unit;

    const type = product.type || 'fruit';
    if (type === 'cigarette') return '包';
    if (type === 'beverage' || type === 'liquor') return '瓶';
    if (type === 'snack') return '个';
    if (type === 'frozen') return '公斤|袋';
    if (type === 'kitchen' || type === 'living') return '件';
    return '公斤';
}

// 更新销售记录列表
function updateSalesRecordsList() {
    const list = document.getElementById('salesRecordsList');
    if (!list) {
        console.error('找不到 salesRecordsList 元素');
        return;
    }

    list.innerHTML = '';

    if (!salesRecords || salesRecords.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="empty-message">暂无销售记录</td></tr>';
        updateSalesStats();
        return;
    }

    console.log('开始更新销售记录列表，记录数:', salesRecords.length);

    // 按时间倒序显示（最新的在前面）
    const sortedRecords = [...salesRecords].sort((a, b) => {
        const idA = a && a.id ? a.id : 0;
        const idB = b && b.id ? b.id : 0;
        return idB - idA;
    });

    sortedRecords.forEach(record => {
        if (!record) return;

        const row = document.createElement('tr');

        // 安全处理商品明细 - 左对齐
        let productsHtml = '';
        if (record.products && Array.isArray(record.products)) {
            productsHtml = record.products.map(product => {
                if (!product) return '';
                const productName = product.name || '未知商品';
                const productType = product.typeCn || '未知类型';
                const price = product.price || 0;
                const weight = product.weight || 0;
                const total = product.total || 0;
                const unit = product.unit || '个';

                return `<div style="margin-bottom: 4px; text-align: left;">
                    <span style="font-weight: bold;">${productName}</span> 
                    (${productType}) - 
                    ${price.toFixed(2)}元/${unit} × ${weight.toFixed(2)} = 
                    <span style="color: #4CAF50; font-weight: bold;">${total.toFixed(2)}元</span>
                </div>`;
            }).join('');
        } else {
            productsHtml = '<div style="color: #999; text-align: left;">无商品明细</div>';
        }

        // 安全处理其他字段
        const timestamp = record.timestamp || '未知时间';
        const itemCount = record.itemCount || 0;
        const totalItems = record.totalItems || 0;
        const totalAmount = record.totalAmount || 0;

        row.innerHTML = `
            <td style="text-align: center; vertical-align: middle;">
                <input type="checkbox" class="sales-record-checkbox" data-id="${record.id}" style="transform: scale(1.2);">
            </td>
            <td style="text-align: center; vertical-align: middle; font-weight: bold; color: #333;">
                ${timestamp}
            </td>
            <td style="text-align: left; vertical-align: middle;">
                <div style="max-height: 120px; overflow-y: auto; padding: 5px;">
                    ${productsHtml}
                </div>
            </td>
            <td style="text-align: center; vertical-align: middle;">
                <div>
                    <span style="font-size: 16px; font-weight: bold; color: #2196F3;">${itemCount}</span> 种<br>
                    <span style="font-size: 12px; color: #666;">${totalItems.toFixed(2)} 件</span>
                </div>
            </td>
            <td style="text-align: center; vertical-align: middle; font-size: 18px; font-weight: bold; color: #4CAF50;">
                ${totalAmount.toFixed(2)} 元
            </td>
        `;
        list.appendChild(row);
    });

    updateSalesStats();
    updateSalesRecordsBatchUI();
}

// 更新销售统计
function updateSalesStats() {
    console.log('更新销售统计，记录总数:', salesRecords.length);
    // 确保 salesRecords 是有效的数组
    if (!salesRecords || !Array.isArray(salesRecords)) {
        console.error('salesRecords 不是有效数组:', salesRecords);
        salesRecords = [];
    }
    const totalCount = salesRecords.length;

    // 安全计算金额
    let totalAmount = 0;
    try {
        totalAmount = salesRecords.reduce((sum, record) => {
            // 确保 record 和 record.totalAmount 有效
            if (record && typeof record.totalAmount === 'number' && !isNaN(record.totalAmount)) {
                return sum + record.totalAmount;
            }
            return sum;
        }, 0);
    } catch (error) {
        console.error('计算总金额时出错:', error);
        totalAmount = 0;
    }

    // 今日统计
    const today = new Date().toISOString().split('T')[0];
    let todayRecords = [];
    try {
        todayRecords = salesRecords.filter(record =>
            record && record.dateKey === today
        );
    } catch (error) {
        console.error('筛选今日记录时出错:', error);
        todayRecords = [];
    }

    const todayCount = todayRecords.length;
    // 安全计算今日金额
    let todayAmount = 0;
    try {
        todayAmount = todayRecords.reduce((sum, record) => {
            if (record && typeof record.totalAmount === 'number' && !isNaN(record.totalAmount)) {
                return sum + record.totalAmount;
            }
            return sum;
        }, 0);
    } catch (error) {
        console.error('计算今日金额时出错:', error);
        todayAmount = 0;
    }

    // 计算平均客单价（安全处理除零）
    let averageOrderValue = 0;
    if (totalCount > 0 && totalAmount > 0) {
        averageOrderValue = totalAmount / totalCount;
    }

    console.log('统计结果:', {
        totalCount,
        totalAmount,
        todayCount,
        todayAmount,
        averageOrderValue
    });


    // 更新显示
    updateElementText('totalSalesCount', totalCount.toString());
    updateElementText('totalSalesAmount', totalAmount.toFixed(2) + ' 元');
    updateElementText('todaySalesCount', todayCount.toString());
    updateElementText('todaySalesAmount', todayAmount.toFixed(2) + ' 元');
    updateElementText('averageOrderValue', averageOrderValue.toFixed(2) + ' 元');
}
// 辅助函数：安全更新元素文本
function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    } else {
        console.error('找不到元素:', id);
    }
}

// 更新销售记录批量操作UI
function updateSalesRecordsBatchUI() {
    const checkboxes = document.querySelectorAll('.sales-record-checkbox');
    const checkedBoxes = document.querySelectorAll('.sales-record-checkbox:checked');
    const selectAllBox = document.getElementById('selectAllSalesRecords');
    const selectAllHeaderBox = document.getElementById('selectAllSalesRecordsHeader');
    const deleteBtn = document.getElementById('deleteSelectedSalesRecordsBtn');
    const countSpan = document.getElementById('selectedSalesRecordsCount');

    const count = checkedBoxes.length;
    const total = checkboxes.length;

    // 更新全选状态
    if (selectAllBox) {
        if (count === 0) {
            selectAllBox.checked = false;
            selectAllBox.indeterminate = false;
        } else if (count === total && total > 0) {
            selectAllBox.checked = true;
            selectAllBox.indeterminate = false;
        } else if (count > 0) {
            selectAllBox.indeterminate = true;
        }
    }

    if (selectAllHeaderBox) {
        if (count === 0) {
            selectAllHeaderBox.checked = false;
            selectAllHeaderBox.indeterminate = false;
        } else if (count === total && total > 0) {
            selectAllHeaderBox.checked = true;
            selectAllHeaderBox.indeterminate = false;
        } else if (count > 0) {
            selectAllHeaderBox.indeterminate = true;
        }
    }

    // 更新删除按钮显示/隐藏状态
    if (deleteBtn && countSpan) {
        countSpan.textContent = count;
        if (count > 0) {
            // 显示按钮
            deleteBtn.style.display = 'inline-block';
            setTimeout(() => {
                deleteBtn.style.transform = 'translateX(0)';
                deleteBtn.style.opacity = '1';
            }, 10);
        } else {
            // 隐藏按钮
            deleteBtn.style.transform = 'translateX(120%)';
            deleteBtn.style.opacity = '0';
            setTimeout(() => {
                deleteBtn.style.display = 'none';
            }, 300);
        }
    }
}

// 删除选中的销售记录
function deleteSelectedSalesRecords() {
    const checkedBoxes = document.querySelectorAll('.sales-record-checkbox:checked');
    if (checkedBoxes.length === 0) return;

    const selectedIds = Array.from(checkedBoxes).map(cb => parseInt(cb.dataset.id));

    if (!confirm(`确定删除选中的 ${selectedIds.length} 条销售记录吗？\n删除后无法恢复！`)) {
        return;
    }

    // 删除选中的记录
    salesRecords = salesRecords.filter(record => !selectedIds.includes(record.id));
    // 关键：删除后立即保存到localStorage
    saveData();

    refreshAll();
    alert(`已删除 ${selectedIds.length} 条销售记录`);
}

// ==================== 搜索功能 ====================

// 初始化搜索功能
function initSearch() {
    // 销售区搜索
    const salesSearch = document.getElementById('salesSearch');
    if (salesSearch) {
        salesSearch.addEventListener('input', handleSalesSearch);
        salesSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSalesSearchEnter();
            }
        });
    }

    // 库存区搜索
    const inventorySearch = document.getElementById('inventorySearch');
    if (inventorySearch) {
        inventorySearch.addEventListener('input', handleInventorySearchEnhanced);
    }

    // 预约配送区搜索
    const deliverySearch = document.getElementById('deliverySearch');
    if (deliverySearch) {
        deliverySearch.addEventListener('input', handleDeliverySearch);
    }
}

// 销售区搜索处理
function handleSalesSearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();

    if (searchTerm === '') {
        // 清空搜索，恢复原始列表
        window.updateProductCards?.();
        return;
    }

    const allProducts = Object.values(categories).flatMap(cat => cat.list);
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm)
    );

    updateProductCardsWithSearch(filtered);
}

// 销售区回车键处理
function handleSalesSearchEnter() {
    const searchInput = document.getElementById('salesSearch');
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (searchTerm === '') return;

    const allProducts = Object.values(categories).flatMap(cat => cat.list);
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 1) {
        // 只有一个匹配项，自动选择
        const product = filtered[0];
        document.getElementById('productSelect').value = product.name;

        // 高亮显示选中的商品卡片
        document.querySelectorAll('.product-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.name === product.name) {
                card.classList.add('selected');
            }
        });

        // 聚焦到数量输入框
        document.getElementById('productWeight').focus();
    }
}

// 更新商品卡片显示搜索结果
function updateProductCardsWithSearch(filteredProducts) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    filteredProducts.forEach(p => {
        grid.appendChild(createProductCard(p));
    });

    // 如果没有搜索结果，显示提示
    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="empty-message" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                没有找到匹配的商品
            </div>
        `;
    }
}

// 库存区搜索处理
function handleInventorySearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();

    if (searchTerm === '') {
        // 清空搜索，恢复原始列表
        window.updateAllInventoryDetails?.();
        return;
    }

    // 搜索所有品类的商品
    Object.entries(categories).forEach(([type, cat]) => {
        const bodyId = cat.inventoryBody.replace('#', '');
        const body = document.getElementById(bodyId);
        if (!body) return;

        const filteredProducts = cat.list.filter(p =>
            p.name.toLowerCase().includes(searchTerm)
        );

        updateInventoryTableWithSearch(body, filteredProducts, type);
    });
}

// main.js - 添加库存区选项卡切换监听



// 更新库存表格显示搜索结果
function updateInventoryTableWithSearch(tableBody, filteredProducts, type) {
    tableBody.innerHTML = '';

    if (filteredProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message" style="text-align: center;">
                    没有找到匹配的商品
                </td>
            </tr>
        `;
        return;
    }

    filteredProducts.forEach(p => {
        const remain = p.initialStock - p.sold;
        const status = remain < 10 ? '库存不足' : remain < 20 ? '库存正常' : '库存充足';
        const className = remain < 10 ? 'stock-warning' : '';
        const unit = p.unit || getUnit(type);

        tableBody.innerHTML += `
            <tr>
                <td>${p.icon} ${p.name}</td>
                <td class="price-editable" data-name="${p.name}" data-type="${type}">${p.price.toFixed(2)}</td>
                <td class="stock-editable" data-name="${p.name}" data-type="${type}">${p.initialStock.toFixed(2)}</td>
                <td>${p.sold.toFixed(2)}</td>
                <td>${remain.toFixed(2)}</td>
                <td>${unit}</td>
                <td class="${className}">${status}</td>
            </tr>
        `;
    });

    // 重新绑定编辑事件
    tableBody.querySelectorAll('.price-editable').forEach(el => {
        el.addEventListener('click', () => editInventoryPrice(el));
    });
    tableBody.querySelectorAll('.stock-editable').forEach(el => {
        el.addEventListener('click', () => editInventoryStock(el));
    });
}

function initInventoryTabsListener() {
    document.querySelectorAll('.inventory-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // 选项卡切换后，如果搜索框有内容，重新执行搜索
            setTimeout(() => {
                const inventorySearch = document.getElementById('inventorySearch');
                if (inventorySearch && inventorySearch.value.trim() !== '') {
                    inventorySearch.dispatchEvent(new Event('input'));
                }
            }, 100);
        });
    });

    // 同样监听管理选项卡的切换
    document.querySelectorAll('.management-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            setTimeout(() => {
                const inventorySearch = document.getElementById('inventorySearch');
                if (inventorySearch && inventorySearch.value.trim() !== '') {
                    inventorySearch.dispatchEvent(new Event('input'));
                }
            }, 100);
        });
    });
}

// 预约配送区搜索处理
function handleDeliverySearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();

    if (searchTerm === '') {
        // 清空搜索，恢复原始列表
        window.updateDeliveryList?.();
        return;
    }

    const filteredDeliveries = deliveries.filter(d =>
        d.name.toLowerCase().includes(searchTerm) ||
        d.phone.includes(searchTerm) ||
        d.address.toLowerCase().includes(searchTerm)
    );

    updateDeliveryListWithSearch(filteredDeliveries);
}

// 更新配送列表显示搜索结果
function updateDeliveryListWithSearch(filteredDeliveries) {
    const list = document.getElementById('deliveryList');
    if (!list) return;

    list.innerHTML = '';

    if (filteredDeliveries.length === 0) {
        list.innerHTML = '<tr><td colspan="10" class="empty-message">没有找到匹配的预约记录</td></tr>';
        return;
    }

    filteredDeliveries.forEach(d => {
        const productsSummary = d.products.map(p => {
            const unit = p.unit || getProductUnit(p);
            return `${p.name}（${unit}）x ${p.weight.toFixed(2)}`;
        }).join(', ');
        const statusText = d.status === 'pending' ? '未配送' : '已配送';
        const statusClass = d.status === 'pending' ? 'status-pending' : 'status-delivered';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align: center; vertical-align: middle;">
                <input type="checkbox" class="delivery-checkbox" data-id="${d.id}" style="transform: scale(1.2);">
            </td>
            <td>${d.date}</td>
            <td>${d.time}</td>
            <td>${d.name}</td>
            <td>${d.phone}</td>
            <td>${d.address}</td>
            <td>${productsSummary}</td>
            <td>${d.total.toFixed(2)}</td>
            <td>${d.note}</td>
            <td><button class="status-btn ${statusClass}" data-id="${d.id}">${statusText}</button></td>
            <td>
                <button class="edit-btn" data-id="${d.id}">修改</button>
                <button class="delete-btn" data-id="${d.id}">删除</button>
            </td>
        `;
        list.appendChild(row);
    });

    // 重新绑定事件
    list.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleDeliveryStatus(parseInt(btn.dataset.id)));
    });
    list.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editDelivery(parseInt(btn.dataset.id)));
    });


    updateDeliveryBatchUI();
}

// main.js - 添加会员选择相关函数

// 创建会员选择模态框
// 在 createMemberSelectionModal 函数中修改表头
function createMemberSelectionModal() {
    if (document.getElementById('memberSelectionModal')) return;
    
    const modalHTML = `
        <div id="memberSelectionModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
            <div class="modal-content" style="background: white; padding: 20px; border-radius: 10px; width: 800px; max-width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin: 0 0 15px 0; display: flex; justify-content: space-between; align-items: center;">
                    <span>选择会员</span>
                    <span style="cursor: pointer; color: #999; font-size: 20px;" onclick="closeMemberSelectionModal()">×</span>
                </h3>
                
                <!-- 搜索框 -->
                <div style="margin-bottom: 15px;">
                    <input type="text" id="memberSearchInput" placeholder="搜索会员姓名或手机号..." 
                           style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                
                <!-- 会员列表 -->
                <div style="max-height: 400px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; width: 30%;">会员信息</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; width: 15%;">地址数量</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; width: 40%;">默认地址</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd; width: 15%;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="memberSelectionList">
                            <!-- 会员列表将通过JavaScript动态填充 -->
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 15px; text-align: right;">
                    <button onclick="closeMemberSelectionModal()" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer;">取消</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 绑定搜索事件
    const searchInput = document.getElementById('memberSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleMemberSearchForSelection);
    }
}
// 打开会员选择模态框
function openMemberSelectionModal() {
    const modal = document.getElementById('memberSelectionModal');
    if (!modal) {
        createMemberSelectionModal();
        return;
    }
    
    refreshMemberSelectionList();
    modal.style.display = 'flex';
    
    // 聚焦搜索框
    const searchInput = document.getElementById('memberSearchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
}

// 关闭会员选择模态框
function closeMemberSelectionModal() {
    const modal = document.getElementById('memberSelectionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 刷新会员选择列表
// 修改 refreshMemberSelectionList 函数中的表格结构
function refreshMemberSelectionList(members = null) {
    const list = document.getElementById('memberSelectionList');
    if (!list) return;
    
    let memberList = members;
    if (!memberList && typeof window.MemberManager !== 'undefined') {
        memberList = window.MemberManager.getAllMembers();
    }
    
    if (!memberList || memberList.length === 0) {
        list.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">暂无会员数据</td></tr>';
        return;
    }
    
    list.innerHTML = '';
    
    memberList.forEach(member => {
        const defaultAddress = window.MemberManager.getDefaultAddress(member.id);
        const defaultAddressText = defaultAddress ? 
            (defaultAddress.address.length > 25 ? 
             defaultAddress.address.substring(0, 25) + '...' : 
             defaultAddress.address) : '无默认地址';
        
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <div style="font-weight: bold;">${member.name}</div>
                <div style="font-size: 11px; color: #666;">${member.phone}</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <div style="text-align: center; font-weight: bold; color: #2196F3;">${member.addresses.length}</div>
                <div style="font-size: 11px; color: #666; text-align: center;">地址数量</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;" title="${defaultAddress ? defaultAddress.address : ''}">
                ${defaultAddressText}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                <button class="select-member-btn" data-member-id="${member.id}" 
                        style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    选择
                </button>
            </td>
        `;
        list.appendChild(row);
    });
    
    // 绑定选择按钮事件
    document.querySelectorAll('.select-member-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const memberId = parseInt(this.dataset.memberId);
            selectMemberForDelivery(memberId);
        });
    });
    
    // 绑定行点击事件
    list.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', function() {
            const btn = this.querySelector('.select-member-btn');
            if (btn) {
                const memberId = parseInt(btn.dataset.memberId);
                selectMemberForDelivery(memberId);
            }
        });
    });
}

// 处理会员搜索
function handleMemberSearchForSelection(e) {
    const keyword = e.target.value.trim();
    
    if (!keyword || typeof window.MemberManager === 'undefined') {
        refreshMemberSelectionList();
        return;
    }
    
    const filteredMembers = window.MemberManager.searchMembers(keyword);
    refreshMemberSelectionList(filteredMembers);
}

// main.js - 修改选择会员函数
function selectMemberForDelivery(memberId) {
    const member = window.MemberManager.getMemberById(memberId);
    if (!member) {
        alert('会员不存在');
        return;
    }
    
    const addresses = window.MemberManager.getMemberAddresses(memberId);
    
    if (addresses.length === 0) {
        // 如果没有地址，只填充姓名和电话
        document.getElementById('contactName').value = member.name;
        document.getElementById('contactPhone').value = member.phone;
        document.getElementById('deliveryAddress').value = '';
        closeMemberSelectionModal();
        alert('该会员没有保存地址，请手动输入地址');
        return;
    }
    
    if (addresses.length === 1) {
        // 如果只有一个地址，直接填充
        document.getElementById('contactName').value = member.name;
        document.getElementById('contactPhone').value = member.phone;
        document.getElementById('deliveryAddress').value = addresses[0].address;
        closeMemberSelectionModal();
        return;
    }
    
    // 如果有多个地址，显示地址选择模态框
    showAddressSelectionModal(member, addresses);
}

// main.js - 添加地址选择功能
function showAddressSelectionModal(member, addresses) {
    // 创建地址选择模态框
    if (document.getElementById('addressSelectionModal')) {
        document.getElementById('addressSelectionModal').remove();
    }
    
    let addressesHTML = '';
    addresses.forEach((address, index) => {
        const isDefault = window.MemberManager.getDefaultAddress(member.id)?.id === address.id;
        addressesHTML += `
            <div class="address-option" style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 8px; cursor: pointer; background: ${isDefault ? '#f0f9ff' : 'white'};" data-address="${address.address}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 4px;">${address.address}</div>
                        <div style="font-size: 12px; color: #666;">
                            ${isDefault ? '✅ 默认地址' : ''}
                            ${address.createdAt ? '创建时间: ' + new Date(address.createdAt).toLocaleDateString() : ''}
                        </div>
                    </div>
                    <button class="select-address-btn" data-address="${address.address}" 
                            style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                        选择
                    </button>
                </div>
            </div>
        `;
    });
    
    const modalHTML = `
        <div id="addressSelectionModal" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001; justify-content: center; align-items: center;">
            <div class="modal-content" style="background: white; padding: 20px; border-radius: 10px; width: 600px; max-width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin: 0 0 15px 0; display: flex; justify-content: space-between; align-items: center;">
                    <span>选择配送地址 - ${member.name}</span>
                    <span style="cursor: pointer; color: #999; font-size: 20px;" onclick="closeAddressSelectionModal()">×</span>
                </h3>
                
                <div style="margin-bottom: 15px; color: #666; font-size: 14px;">
                    请为 ${member.name} 选择一个配送地址：
                </div>
                
                <div id="addressSelectionList" style="max-height: 400px; overflow-y: auto;">
                    ${addressesHTML}
                </div>
                
                <div style="margin-top: 15px; text-align: right;">
                    <button onclick="closeAddressSelectionModal()" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px;">
                        取消
                    </button>
                    <button onclick="useDefaultAddress('${member.id}')" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        使用默认地址
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 绑定地址选择事件
    document.querySelectorAll('.address-option').forEach(option => {
        option.addEventListener('click', function(e) {
            if (!e.target.classList.contains('select-address-btn')) {
                const address = this.dataset.address;
                fillDeliveryForm(member, address);
            }
        });
    });
    
    document.querySelectorAll('.select-address-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const address = this.dataset.address;
            fillDeliveryForm(member, address);
        });
    });
}

// 关闭地址选择模态框
function closeAddressSelectionModal() {
    const modal = document.getElementById('addressSelectionModal');
    if (modal) {
        modal.remove();
    }
}

// 使用默认地址
function useDefaultAddress(memberId) {
    const member = window.MemberManager.getMemberById(parseInt(memberId));
    if (!member) return;
    
    const defaultAddress = window.MemberManager.getDefaultAddress(member.id);
    if (defaultAddress) {
        fillDeliveryForm(member, defaultAddress.address);
    } else {
        alert('该会员没有设置默认地址');
    }
}

// 填充配送表单
function fillDeliveryForm(member, address) {
    document.getElementById('contactName').value = member.name;
    document.getElementById('contactPhone').value = member.phone;
    document.getElementById('deliveryAddress').value = address;
    
    // 关闭所有模态框
    closeMemberSelectionModal();
    closeAddressSelectionModal();
    
    console.log(`已选择会员: ${member.name}, 地址: ${address}`);
}

// 事件绑定
document.body.addEventListener('change', e => {
    if (e.target.matches('.product-checkbox, .select-all-checkbox')) {
        updateBatchUI();
    }
});

document.body.addEventListener('click', e => {
    if (e.target.matches('.select-all-checkbox')) {
        toggleSelectAll(e.target);
    }
    if (e.target.matches('.delete-selected-btn')) {
        deleteSelectedProducts();
    }
});

// 刷新后更新
const oldRefresh = window.refreshAll;
window.refreshAll = function() {
    if (oldRefresh) oldRefresh();
    setTimeout(updateBatchUI, 100);
};


// ==================== 导出函数 ====================
window.refreshAll = refreshAll;
window.addProduct = addProductToCart;
// window.deleteProduct = deleteProduct;

window.updateStockProductOptions = updateStockProductOptions;
window.checkout = checkout;
window.refreshAll = refreshAll;
window.toggleDeliveryStatus = toggleDeliveryStatus; // 新增
window.editDelivery = editDelivery; // 新增


// 修改 addProduct 函数，在添加商品后重置搜索状态
const originalAddProduct = window.addProduct;
window.addProduct = function() {
    originalAddProduct?.();

    // 重置搜索状态
    const salesSearch = document.getElementById('salesSearch');
    if (salesSearch) {
        salesSearch.value = '';
    }

    // 恢复原始商品列表显示
    window.updateProductCards?.();
};


// main.js 最后加上
const oldRefreshAll = window.refreshAll;
window.refreshAll = function() {
    if (oldRefreshAll) oldRefreshAll.apply(this, arguments);
    // 延迟一点点，确保 DOM 已更新
    setTimeout(() => {
        if (window.addRippleEffect) {
            window.addRippleEffect();
        }
    }, 100);
};

// 在 main.js 的导出部分添加

// 在 main.js 的导出部分添加新增的函数
window.recalculateCartPrices = recalculateCartPrices;
window.checkPriceConflicts = checkPriceConflicts;
window.recalculateCartPricesForMember = recalculateCartPricesForMember;
window.updateCartPricesForProduct = updateCartPricesForProduct;
// 导出销售记录相关函数
window.updateSalesRecordsList = updateSalesRecordsList;

// main.js - 在导出部分添加
window.openMemberSelectionModal = openMemberSelectionModal;
window.closeMemberSelectionModal = closeMemberSelectionModal;
window.selectMemberForDelivery = selectMemberForDelivery;
// main.js - 在导出部分添加
window.closeAddressSelectionModal = closeAddressSelectionModal;
window.useDefaultAddress = useDefaultAddress;