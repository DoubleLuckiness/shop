// ui.js
// ==================== 工具函数 ====================
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

// 在 ui.js 的 createProductCard 函数中确保折扣信息正确显示
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.name = product.name;
    card.dataset.type = product.type;

    const typeCn = typeNameMap[product.type] || capitalize(product.type);
    const unit = product.unit || getProductUnit(product);

    // 检查是否是打折商品
    let isDiscountProduct = false;
    let discountInfo = null;
    if (typeof window.DiscountProductManager !== 'undefined') {
        discountInfo = window.DiscountProductManager.getDiscountProductByOriginalName(product.name);
        isDiscountProduct = discountInfo && discountInfo.isActive;
    }

    // 检查购物车中是否已经有该商品的特价版本
    let hasDiscountInCart = false;
    if (isDiscountProduct && typeof window.selectedProducts !== 'undefined') {
        hasDiscountInCart = selectedProducts.some(item =>
            item.isDiscount && item.originalProductName === product.name
        );
    }

    // 获取会员价格显示（始终显示会员价）
    let memberPriceHTML = '';
    if (typeof window.MemberUI !== 'undefined') {
        memberPriceHTML = window.MemberUI.getMemberPriceDisplay(product.name, product.price);
    }

    // 恢复原有样式结构
    card.innerHTML = `
        <div class="product-icon">${product.icon}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-price" data-name="${product.name}" data-type="${product.type}">
            ${product.price.toFixed(2)}元/${unit}
            ${memberPriceHTML}
        </div>
        <div style="color:#888; font-size:12px; margin-top: 4px;">${typeCn}</div>
    `;

    // 如果有特价版本，添加特殊样式提示
    if (isDiscountProduct) {
        if (hasDiscountInCart) {
            card.style.border = '2px solid #ff9800';
            card.style.background = '#fff3e0';
        } else {
            card.style.border = '1px dashed #2196F3';
            card.style.background = '#f5f5f5';
        }

        // 添加特价提示标签
        const discountBadge = document.createElement('div');
        discountBadge.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: #2196F3;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
        `;
        discountBadge.textContent = '有特价';
        card.style.position = 'relative';
        card.appendChild(discountBadge);
    }

    card.addEventListener('click', () => {
       showQuantityModal(product);
    });

    const priceEl = card.querySelector('.product-price');
    priceEl.addEventListener('click', e => {
        e.stopPropagation();
        editPrice(priceEl);
    });

    return card;
}

// 新增：显示数量输入模态框
function showQuantityModal(product) {
    const modal = document.getElementById('quantityModal');
    const productInfo = document.getElementById('modalProductInfo');
    const quantityInput = document.getElementById('modalQuantity');
    
    const unit = product.unit || getProductUnit(product);
    const typeCn = typeNameMap[product.type] || capitalize(product.type);
    
    productInfo.innerHTML = `
        <strong>${product.icon} ${product.name}</strong><br>
        <small>${typeCn} | ${product.price.toFixed(2)}元/${unit}</small>
    `;
    
    quantityInput.value = '';
    modal.style.display = 'flex';
    quantityInput.focus();
    
    // 存储当前选择的商品
    window.currentSelectedProduct = product;
}

// ==================== 更新商品卡片 ====================
// ==================== 更新商品卡片 ====================
function updateProductCards() {
    console.log('更新商品卡片，当前分类:', currentCategory);
    const grid = document.getElementById('products-grid');
    if (!grid) {
        console.error('找不到商品网格元素');
        return;
    }
    grid.innerHTML = '';

    let cards = [];

    if (currentCategory === 'all') {
        // 全部商品：特价商品优先，然后正常商品，都按名字排序
        console.log('显示全部商品');
        const allProducts = Object.values(categories).flatMap(cat => cat.list);

        // 分离特价商品和正常商品
        const discountProducts = [];
        const normalProducts = [];

        allProducts.forEach(p => {
            // 检查是否是打折商品
            let isDiscountProduct = false;
            if (typeof window.DiscountProductManager !== 'undefined') {
                const discountInfo = window.DiscountProductManager.getDiscountProductByOriginalName(p.name);
                isDiscountProduct = discountInfo && discountInfo.isActive;
            }

            if (isDiscountProduct) {
                discountProducts.push(p);
            } else {
                normalProducts.push(p);
            }
        });

        // 分别按名字排序
        discountProducts.sort((a, b) => a.name.localeCompare(b.name));
        normalProducts.sort((a, b) => a.name.localeCompare(b.name));

        // 先添加特价商品，再添加正常商品
        const sortedProducts = [...discountProducts, ...normalProducts];

        sortedProducts.forEach(p => {
            const card = createProductCard(p);
            cards.push(card);
        });

        console.log(`排序后商品: 特价${discountProducts.length}个, 正常${normalProducts.length}个`);

    } else if (currentCategory === 'discount') {
        // 打折专区：只显示独立的打折商品，按名字排序
        console.log('显示打折专区');
        if (typeof window.DiscountProductManager !== 'undefined') {
            let discountProducts = DiscountProductManager.getAllDiscountProducts();
            console.log('找到打折商品数量:', discountProducts.length);

            // 按名字排序
            discountProducts.sort((a, b) => a.name.localeCompare(b.name));

            if (discountProducts.length > 0) {
                discountProducts.forEach(product => {
                    // 使用 DiscountUI 创建打折商品卡片
                    const card = window.DiscountUI.createDiscountProductCard(product);
                      // 修改：为打折商品卡片添加点击事件，弹出数量输入框
                    card.addEventListener('click', () => {
                        showQuantityModalForDiscountProduct(product);
                    });
                    cards.push(card);
                });
            } else {
                console.log('没有找到打折商品');
            }
        } else {
            console.warn('DiscountProductManager 未定义');
        }
    } else {
        // 其他分类：只显示原价商品，按名字排序
        console.log('显示分类商品:', currentCategory);
        let categoryProducts = categories[currentCategory]?.list || [];

        // 按名字排序
        categoryProducts.sort((a, b) => a.name.localeCompare(b.name));

        categoryProducts.forEach(p => {
            const card = createProductCard(p);
            cards.push(card);
        });
    }

    // 添加到网格
    cards.forEach(card => grid.appendChild(card));
    console.log('添加到网格的卡片数量:', cards.length);

    // 空状态提示
    if (cards.length === 0) {
        if (currentCategory === 'discount') {
            grid.innerHTML = `
                <div class="empty-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    🏷️ 暂无打折商品，请先在"打折商品"页面添加特价商品
                </div>
            `;
        } else {
            grid.innerHTML = `
                <div class="empty-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    暂无商品
                </div>
            `;
        }
    }
}

// 新增：为打折商品显示数量输入模态框
function showQuantityModalForDiscountProduct(product) {
    const modal = document.getElementById('quantityModal');
    const productInfo = document.getElementById('modalProductInfo');
    const quantityInput = document.getElementById('modalQuantity');
    
    const unit = product.unit || getProductUnit(product);
    const typeCn = typeNameMap[product.type] || capitalize(product.type);
    
    productInfo.innerHTML = `
        <strong>${product.icon} ${product.name}</strong><br>
        <small>${typeCn} | 原价: ${product.originalPrice.toFixed(2)}元 | 特价: ${product.discountPrice.toFixed(2)}元/${unit}</small>
        <div style="color: #e91e63; font-weight: bold; margin-top: 5px;">
            折扣: ${(product.discount * 100).toFixed(0)}% | 立省: ${(product.originalPrice - product.discountPrice).toFixed(2)}元
        </div>
    `;
    
    quantityInput.value = '';
    modal.style.display = 'flex';
    quantityInput.focus();
    
    // 存储当前选择的打折商品
    window.currentSelectedProduct = product;
}

// 备用方案：创建打折商品卡片
function createDiscountProductCardFallback(product) {
    const card = document.createElement('div');
    card.className = 'product-card discount-product-card';
    card.dataset.name = product.name;
    card.dataset.type = product.type;
    card.dataset.isDiscount = 'true';
    card.dataset.productId = product.id;

    const saving = product.originalPrice - product.discountPrice;
    const discountRate = (product.discount * 100).toFixed(0);

    card.innerHTML = `
        <div style="position: absolute; top: 8px; right: 8px; background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">
            ${discountRate}% OFF
        </div>
        <div class="product-icon">${product.icon}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-price">
            <div style="text-decoration: line-through; color: #999; font-size: 12px;">
                原价: ${product.originalPrice.toFixed(2)}元
            </div>
            <div style="color: #e91e63; font-size: 16px; font-weight: bold;">
                特价: ${product.discountPrice.toFixed(2)}元
            </div>
            <div style="color: #4caf50; font-size: 12px; margin-top: 2px;">
                ${discountRate}折 立省 ${saving.toFixed(2)}元
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // 自动填充到销售表单
        const select = document.getElementById('productSelect');
        if (select) {
            // 查找对应的选项
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === product.name) {
                    select.selectedIndex = i;
                    break;
                }
            }

            // 如果没找到，动态创建一个选项
            if (select.value !== product.name) {
                const option = document.createElement('option');
                option.value = product.name;
                const typeCn = typeNameMap[product.type] || capitalize(product.type);
                const unit = product.unit || getUnit(product.type);
                option.textContent = `🏷️ ${typeCn}: ${product.name} (特价: ${product.discountPrice.toFixed(2)}元/${unit})`;
                option.dataset.type = product.type;
                option.style.color = '#e91e63';
                option.style.fontWeight = 'bold';
                select.appendChild(option);
                select.value = product.name;
            }
        }

        // 聚焦到数量输入框
        const weightInput = document.getElementById('productWeight');
        if (weightInput) {
            weightInput.focus();
        }

        console.log('已选择特价商品:', product.name);
    });

    return card;
}

// ==================== 更新下拉框选项（显示中文品类） ====================
// ==================== 更新下拉框选项（显示中文品类） ====================
function updateProductSelectOptions() {
    const select = document.getElementById('productSelect');
    if (!select) return;
    select.innerHTML = '<option value="">请选择商品</option>';

    // 添加原价商品
    Object.entries(categories).forEach(([type, cat]) => {
        cat.list.forEach(p => {
            const option = document.createElement('option');
            option.value = p.name;
            const typeCn = typeNameMap[type] || capitalize(type);
            const unit = p.unit || getProductUnit(p);
            option.textContent = `${typeCn}: ${p.name} (${p.price.toFixed(2)}元/${unit})`;
            option.dataset.type = type;
            select.appendChild(option);
        });
    });

    // 添加特价商品（如果有的话）
    if (typeof window.DiscountProductManager !== 'undefined') {
        const discountProducts = DiscountProductManager.getAllDiscountProducts();
        discountProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.name; // 使用特价商品的名称
            const typeCn = typeNameMap[product.type] || capitalize(product.type);
            const unit = product.unit || getProductUnit(product);
            option.textContent = `🏷️ ${typeCn}: ${product.name} (特价: ${product.discountPrice.toFixed(2)}元/${unit})`;
            option.dataset.type = product.type;
            option.style.color = '#e91e63'; // 红色突出显示
            option.style.fontWeight = 'bold';
            select.appendChild(option);
        });
    }
}

// ==================== 更新销售列表 ====================
// 在 ui.js 的 updateProductList 函数中修改删除逻辑
// 在 ui.js 中修复 updateProductList 函数
function updateProductList() {
    const list = document.getElementById('productList');
    if (!list) {
        console.error('找不到商品列表元素');
        return;
    }
    list.innerHTML = '';

    if (selectedProducts.length === 0) {
        list.innerHTML = '<tr><td colspan="6" class="empty-message">暂无商品，请添加</td></tr>';
        return;
    }

    // 安全地检查当前会员状态
    let isMember = false;
    try {
        if (typeof window.MemberManager !== 'undefined' &&
            window.MemberManager.isMemberLoggedIn &&
            typeof window.MemberManager.isMemberLoggedIn === 'function') {
            isMember = window.MemberManager.isMemberLoggedIn();
        }
    } catch (error) {
        console.warn('检查会员状态时出错:', error);
        isMember = false;
    }

    console.log('更新购物车列表，商品数量:', selectedProducts.length, '会员状态:', isMember);

    selectedProducts.forEach((p, index) => {
        // 安全检查商品数据
        if (!p || !p.name) {
            console.warn('跳过无效的商品数据:', p);
            return;
        }

        const typeCn = typeNameMap[p.type] || capitalize(p.type);
        const row = document.createElement('tr');

        // 计算节省金额（如果有）
        let savingHTML = '';
        let priceTypeHTML = '';
        let memberNotice = '';

        if (p.isDiscount) {
            // 特价商品
            priceTypeHTML = '<span style="color: #ff5722; font-weight: bold;">[特价]</span>';
            const saving = (p.originalPrice || p.price) - p.price;
            const totalSaving = saving * p.weight;
            savingHTML = `<br><small style="color:#4caf50;">节省: ${totalSaving.toFixed(2)}元</small>`;
        } else if (p.originalPrice && p.originalPrice > p.price) {
            // 会员价商品
            priceTypeHTML = '<span style="color: #e91e63; font-weight: bold;">[会员价]</span>';
            const saving = p.originalPrice - p.price;
            const totalSaving = saving * p.weight;
            savingHTML = `<br><small style="color:#4caf50;">节省: ${totalSaving.toFixed(2)}元</small>`;
        }

        // 安全处理价格和重量
        const price = typeof p.price === 'number' ? p.price.toFixed(2) : '0.00';
        const weight = typeof p.weight === 'number' ? p.weight.toFixed(2) : '0.00';
        const total = typeof p.total === 'number' ? p.total.toFixed(2) : '0.00';
        const originalPrice = p.originalPrice ? p.originalPrice.toFixed(2) : price;

        row.innerHTML = `
            <td>${typeCn}</td>
            <td>${p.name} ${priceTypeHTML}</td>
            <td>
                ${price}元
                ${p.originalPrice && p.originalPrice > p.price ?
            `<br><small style="text-decoration: line-through; color: #999;">原价: ${originalPrice}元</small>` : ''}
                ${memberNotice}
            </td>
            <td>${weight}${p.unit || ''}</td>
            <td>
                ${total}元
                ${savingHTML}
            </td>
            <td><button class="delete-btn sales-delete-btn" data-index="${index}">删除</button></td>
        `;
        list.appendChild(row);
    });

    // 删除按钮事件
    document.querySelectorAll('.sales-delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            console.log('删除销售商品，索引:', index, '选中商品:', selectedProducts[index]);

            if (index >= 0 && index < selectedProducts.length) {
                const item = selectedProducts[index];
                if (item && item.type) {
                    if (item.isDiscount) {
                        // 恢复特价商品库存
                        if (typeof window.DiscountProductManager !== 'undefined') {
                            const discountProduct = DiscountProductManager.getDiscountProduct(item.name);
                            if (discountProduct) {
                                discountProduct.stock += item.weight;
                                discountProduct.isActive = true;
                            }
                        }
                    } else {
                        // 恢复原价商品库存
                        if (categories[item.type]) {
                            const product = categories[item.type].list.find(p => p.name === item.name);
                            if (product) {
                                product.sold -= item.weight;
                            }
                        }
                    }
                }
                selectedProducts.splice(index, 1);

                // 关键修复：删除商品后重新计算购物车价格
                if (typeof window.recalculateCartPrices === 'function') {
                    window.recalculateCartPrices();
                }

                refreshAll();
            } else {
                console.error('无效的索引:', index);
            }
        });
    });
}

// ==================== 更新总价 ====================
// 在 ui.js 的 updateTotalPrice 函数中添加优惠金额计算
function updateTotalPrice() {
    const totalEl = document.getElementById('productTotal');
    if (!totalEl) return;

    const total = selectedProducts.reduce((sum, p) => sum + p.total, 0);

    // 计算原价总额（如果没有优惠的价格）
    const originalTotal = selectedProducts.reduce((sum, p) => {
        const originalPrice = p.originalPrice || p.price;
        return sum + (originalPrice * p.weight);
    }, 0);

    const saving = originalTotal - total;

    // 更新显示
    totalEl.innerHTML = `
        <div>总价: ${total.toFixed(2)} 元</div>
        ${saving > 0 ? `<div style="color: #4CAF50; font-size: 14px; margin-top: 4px;">共优惠: ${saving.toFixed(2)} 元</div>` : ''}
    `;
}

// ==================== 更新所有库存详情 ====================
function updateAllInventoryDetails() {
    // 更新全部商品库存
    updateAllProductsInventory();
    Object.entries(categories).forEach(([type, cat]) => {
        updateCategoryInventory(type, cat);
    });
    // 绑定编辑事件
    bindInventoryEditEvents();
}

function updateAllProductsInventory() {
    const body = document.getElementById('all-inventory-body');
    if (!body) return;

    body.innerHTML = '';
    let types = 0, initial = 0, sold = 0, remaining = 0, totalLoss = 0, totalNet = 0;

    // 收集所有商品
    const allProducts = [];
    Object.entries(categories).forEach(([type, cat]) => {
        cat.list.forEach(product => {
            allProducts.push({
                ...product,
                categoryType: type
            });
        });
    });

    // 检查是否有排序需求
    let sortedProducts = allProducts;
    if (window.inventoryManager && window.inventoryManager.currentSortField) {
        sortedProducts = [...allProducts].sort((a, b) => {
            return window.inventoryManager.compareProducts(a, b, window.inventoryManager.currentSortField);
        });
        console.log(`全部商品已按 ${window.inventoryManager.currentSortField} 排序`);
    }

    sortedProducts.forEach(product => {
        const remain = product.initialStock - product.sold;
        const loss = product.loss || 0;
        const netStock = Math.max(0, remain - loss);
        const status = getInventoryStatus(netStock);
        const className = netStock < 10 ? 'stock-warning' : '';
          // 关键修改：使用商品的 unit 字段
        const unit = product.unit || getUnit(product.categoryType);

        body.innerHTML += `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="inventory-checkbox" 
                           data-type="${product.categoryType}" data-name="${product.name}">
                </td>
                <td>${typeNameMap[product.categoryType] || capitalize(product.categoryType)}</td>
                <td>${product.icon} ${product.name}</td>
                <td class="price-editable" data-name="${product.name}" data-type="${product.categoryType}">
                    ${product.price.toFixed(2)}
                </td>
                <td class="stock-editable" data-name="${product.name}" data-type="${product.categoryType}">
                    ${product.initialStock.toFixed(2)}
                </td>
                <td>${product.sold.toFixed(2)}</td>
                <td>${remain.toFixed(2)}</td>
                <td class="loss-editable" data-name="${product.name}" data-type="${product.categoryType}">
                    ${loss.toFixed(2)}
                </td>
                <td>${netStock.toFixed(2)}</td>
                <td>${unit}</td>
                <td class="${className}">${status}</td>
            </tr>
        `;

        types++;
        initial += product.initialStock;
        sold += product.sold;
        remaining += remain;
        totalLoss += loss;
        totalNet += netStock;
    });

    // 更新统计
    updateAllProductsStats(types, initial, sold, remaining, totalLoss, totalNet);
}

function updateCategoryInventory(type, cat) {
    const bodyId = cat.inventoryBody.replace('#', '');
    const body = document.getElementById(bodyId);
    if (!body) return;

    body.innerHTML = '';
    let types = 0, initial = 0, sold = 0, remaining = 0, totalLoss = 0, totalNet = 0;

    cat.list.forEach(product => {
        const remain = product.initialStock - product.sold;
        const loss = product.loss || 0;
        const netStock = Math.max(0, remain - loss);
        const status = getInventoryStatus(netStock);
        const className = netStock < 10 ? 'stock-warning' : '';
        // 关键修改：使用商品的 unit 字段
        const unit = product.unit || getUnit(type);

        body.innerHTML += `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="inventory-checkbox" 
                           data-type="${type}" data-name="${product.name}">
                </td>
                <td>${product.icon} ${product.name}</td>
                <td class="price-editable" data-name="${product.name}" data-type="${type}">
                    ${product.price.toFixed(2)}
                </td>
                <td class="stock-editable" data-name="${product.name}" data-type="${type}">
                    ${product.initialStock.toFixed(2)}
                </td>
                <td>${product.sold.toFixed(2)}</td>
                <td>${remain.toFixed(2)}</td>
                <td class="loss-editable" data-name="${product.name}" data-type="${type}">
                    ${loss.toFixed(2)}
                </td>
                <td>${netStock.toFixed(2)}</td>
                <td>${unit}</td>
                <td class="${className}">${status}</td>
            </tr>
        `;

        types++;
        initial += product.initialStock;
        sold += product.sold;
        remaining += remain;
        totalLoss += loss;
        totalNet += netStock;
    });

    // 更新统计
    updateCategoryStats(type, types, initial, sold, remaining, totalLoss, totalNet);
}

function updateAllProductsStats(types, initial, sold, remaining, totalLoss, totalNet) {
    document.getElementById('all-types').textContent = types;
    document.getElementById('all-total-initial').textContent = initial.toFixed(2);
    document.getElementById('all-total-sold').textContent = sold.toFixed(2);
    document.getElementById('all-total-remaining').textContent = remaining.toFixed(2);
    document.getElementById('all-total-loss').textContent = totalLoss.toFixed(2);
    document.getElementById('all-total-net').textContent = totalNet.toFixed(2);
}

function updateCategoryStats(type, types, initial, sold, remaining, totalLoss, totalNet) {
    const stats = categories[type]?.stats;
    if (!stats) return;

    const updateStat = (id, value, unit) => {
        const el = document.getElementById(stats[id]?.replace('#', ''));
        if (el) el.textContent = unit ? `${value.toFixed(2)} ${unit}` : value.toFixed(2);
    };

    const unit = getUnit(type);

    updateStat('types', types);
    updateStat('totalInitial', initial, unit);
    updateStat('totalSold', sold, unit);
    updateStat('totalRemaining', remaining, unit);
}

function getInventoryStatus(netStock) {
    if (netStock < 5) return '严重缺货';
    if (netStock < 10) return '库存不足';
    if (netStock < 20) return '库存正常';
    return '库存充足';
}

function bindInventoryEditEvents() {
    document.querySelectorAll('.price-editable').forEach(el => {
        el.addEventListener('click', () => editInventoryPrice(el));
    });
    document.querySelectorAll('.stock-editable').forEach(el => {
        el.addEventListener('click', () => editInventoryStock(el));
    });
    document.querySelectorAll('.loss-editable').forEach(el => {
        el.addEventListener('click', () => editInventoryLoss(el));
    });
}

// 新增：编辑损耗量
function editInventoryLoss(element) {
    const name = element.dataset.name;
    const type = element.dataset.type;
    const product = categories[type]?.list.find(p => p.name === name);
    if (!product) return;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = product.loss || 0;
    input.min = '0';
    input.step = '0.1';
    input.style.width = '80px';

    element.innerHTML = '';
    element.appendChild(input);
    element.classList.add('editing');
    input.focus();

    const save = () => {
        const newLoss = parseFloat(input.value);
        const remain = product.initialStock - product.sold;

        if (isNaN(newLoss) || newLoss < 0) {
            alert('损耗量无效');
        } else if (newLoss > remain) {
            alert(`损耗量不能超过剩余库存！当前剩余库存: ${remain}`);
        } else {
            product.loss = newLoss;
            refreshAll();
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') save();
    });
}


// ==================== 更新商品管理列表 ====================
function updateProductManagementList() {
    Object.entries(categories).forEach(([type, cat]) => {
        const listId = cat.managementList.replace('#', '');
        const list = document.getElementById(listId);
        if (!list) return;
        list.innerHTML = '';

        cat.list.forEach(p => {
            list.appendChild(createProductManagementItem(p, type));
        });
    });
}

// ==================== 创建管理项 ====================

function createProductManagementItem(product, type) {
    console.log('创建管理项:', product?.name, type);
    // 加强安全检查
    if (!product || !product.name || !type) {
        console.error('创建管理项参数无效:', {product, type});
        const errorDiv = document.createElement('div');
        errorDiv.textContent = '商品数据无效';
        errorDiv.style.color = 'red';
        return errorDiv;
    }


    const item = document.createElement('div');
    item.className = 'product-item';

    const remain = product.initialStock - product.sold;
    const typeCn = typeNameMap[type] || capitalize(type);
    const unit = product.unit || getProductUnit(product);
    console.log(`管理项 ${product.name} 的单位:`, { 
        productUnit: product.unit, 
        finalUnit: unit 
    });

    item.innerHTML = `
        <div class="product-item-info">
            <input type="checkbox" class="product-checkbox" data-type="${type}" data-name="${product.name}">
            <div class="product-item-icon">${product.icon}</div>
            <div class="product-item-details">
                <div class="product-item-name">${product.name}</div>
                <div class="product-item-price">单价: ${product.price.toFixed(2)}元/${unit}</div>
                <div class="product-item-stock">库存: ${remain.toFixed(2)}${unit} (原始: ${product.initialStock.toFixed(2)}, 已售: ${product.sold.toFixed(2)})</div>
            </div>
        </div>
        <div class="product-item-actions">
            <button class="edit-btn" data-type="${type}" data-name="${product.name}">修改</button>
            
        </div>
    `;

    // 注意：这里不再绑定事件，因为使用事件委托
    // 编辑按钮点击事件 - 使用自定义事件
    const editBtn = item.querySelector('.edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('触发编辑商品事件:', type, product.name);
            
            const editEvent = new CustomEvent('productEditRequest', {
                detail: {
                    type: type,
                    name: product.name
                },
                bubbles: true
            });
            this.dispatchEvent(editEvent);
        });
    }


   
    // 删除按钮点击事件
    const deleteBtn = item.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('触发删除商品事件:', type, product.name);
            
            const deleteEvent = new CustomEvent('productDeleteRequest', {
                detail: {
                    type: type,
                    name: product.name
                },
                bubbles: true
            });
            this.dispatchEvent(deleteEvent);
        });
    }
    
    return item;
}
// ==================== 编辑销售区价格 ====================
// 在 ui.js 中修改编辑价格的函数，添加会员价同步更新
function editPrice(element) {
    const name = element.dataset.name;
    const type = element.dataset.type;
    const product = categories[type].list.find(p => p.name === name);
    if (!product) return;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = product.price;
    input.min = '0';
    input.step = '0.1';
    input.style.width = '80px';

    element.innerHTML = '';
    element.appendChild(input);
    element.classList.add('editing');
    input.focus();

    const save = () => {
        const newPrice = parseFloat(input.value);
        if (isNaN(newPrice) || newPrice < 0) {
            alert('价格无效');
        } else {
            const oldPrice = product.price;
            product.price = newPrice;

            // 新增：如果该商品有会员价，同步更新会员价
            if (typeof window.MemberProductManager !== 'undefined') {
                window.MemberProductManager.updateMemberPriceForProduct(name);
            }

            // 如果购物车中有该商品，重新计算价格
            updateCartPricesForProduct(name, oldPrice, newPrice);


            refreshAll();
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') save();
    });
}

// 新增：更新购物车中特定商品的价格
function updateCartPricesForProduct(productName, oldPrice, newPrice) {
    let updated = false;

    selectedProducts.forEach((item, index) => {
        if (item.name === productName && !item.isDiscount) {
            // 计算价格变化比例
            const priceRatio = newPrice / oldPrice;

            // 更新价格和总价
            selectedProducts[index].price = newPrice;
            selectedProducts[index].originalPrice = newPrice;
            selectedProducts[index].total = newPrice * item.weight;

            updated = true;
            console.log(`更新购物车中 ${productName} 的价格: ${oldPrice} -> ${newPrice}`);
        }
    });

    if (updated) {
        // 重新计算会员价（如果当前是会员）
        if (typeof window.MemberManager !== 'undefined' &&
            window.MemberManager.getCurrentMember() &&
            typeof window.recalculateCartPricesForMember === 'function') {
            window.recalculateCartPricesForMember();
        }

        // 检查价格冲突
        if (typeof window.checkPriceConflicts === 'function') {
            window.checkPriceConflicts();
        }
    }

    return updated;
}

// ==================== 编辑库存区价格 ====================
// 在 ui.js 中修改编辑库存区价格的函数
function editInventoryPrice(element) {
    const name = element.dataset.name;
    const type = element.dataset.type;
    const product = categories[type].list.find(p => p.name === name);
    if (!product) return;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = product.price;
    input.min = '0';
    input.step = '0.1';
    input.style.width = '80px';

    element.innerHTML = '';
    element.appendChild(input);
    element.classList.add('editing');
    input.focus();

    const save = () => {
        const newPrice = parseFloat(input.value);
        if (isNaN(newPrice) || newPrice < 0) {
            alert('价格无效');
        } else {
            const oldPrice = product.price;
            product.price = newPrice;

            // 新增：如果该商品有会员价，同步更新会员价
            if (typeof window.MemberProductManager !== 'undefined') {
                window.MemberProductManager.updateMemberPriceForProduct(name);
            }


            // 如果购物车中有该商品，重新计算价格
            updateCartPricesForProduct(name, oldPrice, newPrice);

            refreshAll();
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') save();
    });
}

// ==================== 编辑库存区库存 ====================
function editInventoryStock(element) {
    const name = element.dataset.name;
    const type = element.dataset.type;
    const product = categories[type].list.find(p => p.name === name);
    if (!product) return;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = product.initialStock;
    input.min = '0';
    input.step = '0.1';
    input.style.width = '80px';

    element.innerHTML = '';
    element.appendChild(input);
    element.classList.add('editing');
    input.focus();

    const save = () => {
        const newStock = parseFloat(input.value);
        if (isNaN(newStock) || newStock < 0) {
            alert('库存无效');
        } else {
            product.initialStock = newStock;
            refreshAll();
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') save();
    });
}

// ==================== 新增：更新预约配送列表 ====================
function updateDeliveryList() {
    const list = document.getElementById('deliveryList');
    if (!list) return;
    list.innerHTML = '';

    if (deliveries.length === 0) {
        list.innerHTML = '<tr><td colspan="10" class="empty-message">暂无预约记录</td></tr>';
        return;
    }

    deliveries.forEach(d => {
        const row = document.createElement('tr');
         const productsSummary = d.products.map(p => {const unit = p.unit || getProductUnit(p);
            return `${p.name}（${unit}）x ${p.weight.toFixed(2)}`;
        }).join(', ');
        const statusText = d.status === 'pending' ? '未配送' : '已配送';
        const statusClass = d.status === 'pending' ? 'status-pending' : 'status-delivered';

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
            </td>
        `;
        list.appendChild(row);
    });

    // 绑定事件
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleDeliveryStatus(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editDelivery(parseInt(btn.dataset.id)));
    });

    // 更新批量操作UI
    updateDeliveryBatchUI();
}

// ==================== 导出函数（供 main.js 调用） ====================
// 这些函数由 main.js 触发
// 在 ui.js 文件末尾添加这些函数声明

// ==================== 工具函数 ====================
if (typeof getUnit === 'undefined') {
    window.getUnit = function(type) {
        if (type === 'cigarette') return '包';
        if (type === 'beverage'|| type === 'liquor') return '瓶';
        if (type === 'snack') return '个';
        if (type === 'frozen') return '公斤|袋';
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

// 临时兼容函数
if (typeof updateStockProductOptions === 'undefined') {
    window.updateStockProductOptions = function() {
        console.log('updateStockProductOptions called');
        // 这个函数会在main.js中定义
    };
}

// ui.js - 在文件末尾添加以下代码

// ==================== 商品管理列表搜索功能 ====================
function updateProductManagementListWithSearch(filteredProducts, type) {
    const listId = categories[type].managementList.replace('#', '');
    const list = document.getElementById(listId);
    if (!list) return;

    list.innerHTML = '';

    if (filteredProducts.length === 0) {
        list.innerHTML = `
            <div class="empty-message" style="text-align: center; padding: 40px; color: #666;">
                没有找到匹配的商品
            </div>
        `;
        return;
    }

    filteredProducts.forEach(p => {
        list.appendChild(createProductManagementItem(p, type));
    });
}

// ==================== 库存区搜索处理（增强版） ====================
function handleInventorySearchEnhanced(e) {
    const searchTerm = e.target.value.trim().toLowerCase();
    const activeInventoryTab = document.querySelector('.inventory-tab.active');
    const activeManagementTab = document.querySelector('.management-tab.active');

    if (searchTerm === '') {
        // 清空搜索，恢复原始列表
        window.updateAllInventoryDetails?.();
        window.updateProductManagementList?.();
        return;
    }

    // 新增：处理"全部商品"搜索
    const allInventoryBody = document.getElementById('all-inventory-body');
    if (allInventoryBody && activeInventoryTab?.dataset.inventoryTab === 'all') {
        // 收集所有商品进行搜索
        const allProducts = [];
        Object.entries(categories).forEach(([type, cat]) => {
            cat.list.forEach(product => {
                allProducts.push({
                    ...product,
                    categoryType: type
                });
            });
        });

        const filteredProducts = allProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm)
        );

        updateAllInventoryTableWithSearch(allInventoryBody, filteredProducts);
        return;
    }

    // 判断当前是在库存查看页面还是商品管理页面
    if (activeInventoryTab && activeInventoryTab.dataset.inventoryTab !== 'management') {
        // 在库存查看页面 - 搜索库存表格
        Object.entries(categories).forEach(([type, cat]) => {
            const bodyId = cat.inventoryBody.replace('#', '');
            const body = document.getElementById(bodyId);
            if (!body) return;

            const filteredProducts = cat.list.filter(p =>
                p.name.toLowerCase().includes(searchTerm)
            );

            updateInventoryTableWithSearch(body, filteredProducts, type);
        });
    } else if (activeManagementTab) {
        // 在商品管理页面 - 搜索商品管理列表
        const managementType = activeManagementTab.dataset.managementTab;
        const cat = categories[managementType];
        if (cat) {
            const filteredProducts = cat.list.filter(p =>
                p.name.toLowerCase().includes(searchTerm)
            );
            updateProductManagementListWithSearch(filteredProducts, managementType);
        }
    }
}

// ui.js - 新增函数
function updateAllInventoryTableWithSearch(tableBody, filteredProducts) {
    tableBody.innerHTML = '';

    if (filteredProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-message" style="text-align: center;">
                    没有找到匹配的商品
                </td>
            </tr>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const remain = product.initialStock - product.sold;
        const loss = product.loss || 0;
        const netStock = Math.max(0, remain - loss);
        const status = getInventoryStatus(netStock);
        const className = netStock < 10 ? 'stock-warning' : '';

        tableBody.innerHTML += `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="inventory-checkbox" 
                           data-type="${product.categoryType}" data-name="${product.name}">
                </td>
                <td>${typeNameMap[product.categoryType] || capitalize(product.categoryType)}</td>
                <td>${product.icon} ${product.name}</td>
                <td class="price-editable" data-name="${product.name}" data-type="${product.categoryType}">
                    ${product.price.toFixed(2)}
                </td>
                <td class="stock-editable" data-name="${product.name}" data-type="${product.categoryType}">
                    ${product.initialStock.toFixed(2)}
                </td>
                <td>${product.sold.toFixed(2)}</td>
                <td>${remain.toFixed(2)}</td>
                <td class="loss-editable" data-name="${product.name}" data-type="${product.categoryType}">
                    ${loss.toFixed(2)}
                </td>
                <td>${netStock.toFixed(2)}</td>
                <td>${product.unit || getUnit(product.categoryType)}</td>
                <td class="${className}">${status}</td>
            </tr>
        `;
    });

    // 重新绑定编辑事件
    bindInventoryEditEvents();
}

// ==================== 导出函数 ====================
window.updateProductCards = updateProductCards;
window.updateProductSelectOptions = updateProductSelectOptions;
window.updateProductList = updateProductList;
window.updateTotalPrice = updateTotalPrice;
window.updateAllInventoryDetails = updateAllInventoryDetails;
window.updateProductManagementList = updateProductManagementList;
window.updateStockProductOptions = updateStockProductOptions;
window.updateDeliveryList = updateDeliveryList;

// ui.js - 在导出函数部分添加
window.updateProductManagementListWithSearch = updateProductManagementListWithSearch;
// ui.js - 在导出函数部分添加
window.updateAllInventoryTableWithSearch = updateAllInventoryTableWithSearch;
window.handleInventorySearchEnhanced = handleInventorySearchEnhanced;




