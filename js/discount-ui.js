// discount-ui.js - 打折商品UI管理（完整修复版）
;(function() {
    'use strict';

    class DiscountUI {
        constructor() {
            this.elements = {};
            this.init();
        }

        init() {
            console.log('初始化打折商品UI...');
            this.cacheElements();
            this.initDiscountTabs();
            this.initDiscountForms();
            this.initDiscountSearch();
            this.refreshDiscountUI();
            // 新增：初始化批量选择功能
            this.initDiscountBatchSelection();
        }
        // 新增方法（不影响原有逻辑）
        initDiscountBatchSelection() {
            // 全选
            document.addEventListener('change', (e) => {
                if (e.target.id === 'selectAllDiscountHeader') {
                    const checked = e.target.checked;
                    document.querySelectorAll('#discountProductsList .discount-product-checkbox').forEach(cb => {
                        cb.checked = checked;
                    });
                    this.updateDiscountBatchUI();
                }
                if (e.target.classList.contains('discount-product-checkbox')) {
                    this.updateDiscountBatchUI();
                }
            });

            // 删除按钮
            const deleteBtn = document.getElementById('deleteSelectedDiscountBtn');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    const checked = document.querySelectorAll('#discountProductsList .discount-product-checkbox:checked');
                    if (checked.length === 0) return alert('请先选中要删除的商品');
                    if (!confirm(`确定删除 ${checked.length} 条打折商品吗？`)) return;

                    checked.forEach(cb => {
                        const id = parseInt(cb.dataset.id);
                        window.DiscountProductManager.removeDiscountProduct(id);
                    });
                    this.refreshDiscountUI(); // 使用原有刷新函数
                     // ========== 新增代码：刷新销售区UI ==========
                    if (typeof window.refreshAll === 'function') {
                        window.refreshAll();
                    } else if (typeof window.updateProductCards === 'function') {
                        window.updateProductCards();
                    }
                    // 删除后隐藏按钮
                    this.updateDiscountBatchUI();
                };
            }
        }
        // 新增：更新选中计数和按钮显示状态
        updateDiscountBatchUI() {
            const checked = document.querySelectorAll('#discountProductsList .discount-product-checkbox:checked');
            const count = checked.length;
            const btn = document.getElementById('deleteSelectedDiscountBtn');
            const span = document.getElementById('selectedDiscountCount');
            if (span) span.textContent = count;
            if (btn) {
                // 根据选中数量显示/隐藏按钮
                if (count > 0) {
                    btn.style.display = 'block';
                    setTimeout(() => {
                        btn.style.transform = 'translateX(0)';
                        btn.style.opacity = '1';
                    }, 10);
                } else {
                    btn.style.transform = 'translateX(120%)';
                    btn.style.opacity = '0';
                    setTimeout(() => {
                        btn.style.display = 'none';
                    }, 300);
                }
            }

            // 同步全选框状态
            const header = document.getElementById('selectAllDiscountHeader');
            if (header) {
                const all = document.querySelectorAll('#discountProductsList .discount-product-checkbox');
                header.checked = all.length > 0 && checked.length === all.length;
            }
        }

        cacheElements() {
            // 缓存常用DOM元素
            this.elements = {
                discountTabs: document.querySelectorAll('.discount-tab'),
                discountContents: document.querySelectorAll('.discount-content'),
                discountProductType: document.getElementById('discountProductType'),
                newDiscountProductSelect: document.getElementById('newDiscountProductSelect'),
                discountProductSearch: document.getElementById('discountProductSearch'),
                discountProductsList: document.getElementById('discountProductsList'),
                addDiscountProductBtn: document.getElementById('addDiscountProductBtn'),
                
                // 表单元素
                newDiscountProductStock: document.getElementById('newDiscountProductStock'),
                newDiscountProductReason: document.getElementById('newDiscountProductReason'),
                discountInput: document.getElementById('newDiscountProductDiscount'),
                
                // 定价方式相关元素（如果存在）
                pricingMethodSelect: document.getElementById('discountPricingMethod'),
                discountRateGroup: document.getElementById('discountRateGroup'),
                fixedPriceGroup: document.getElementById('fixedPriceGroup'),
                fixedPriceInput: document.getElementById('newDiscountProductFixedPrice'),
                priceDisplay: document.getElementById('priceDisplay'),
                calculatedPrice: document.getElementById('calculatedPrice'),
                
                // 单位选择相关元素（如果存在）
                unitSelect: document.getElementById('discountProductUnit'),
                customUnitContainer: document.getElementById('discountProductCustomUnit'),
                customUnitInput: document.querySelector('#discountProductCustomUnit input')
            };
        }

        initDiscountTabs() {
            console.log('初始化打折商品选项卡...');
            
            this.elements.discountTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchTab(tab.dataset.discountTab);
                });
            });

            // 确保默认显示第一个选项卡
            const defaultTab = document.querySelector('.discount-tab.active');
            if (defaultTab) {
                this.switchTab(defaultTab.dataset.discountTab);
            }
        }

        switchTab(tabId) {
            // 移除所有激活状态
            this.elements.discountTabs.forEach(t => t.classList.remove('active'));
            this.elements.discountContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });

            // 激活当前选项卡
            const activeTab = document.querySelector(`[data-discount-tab="${tabId}"]`);
            const activeContent = document.getElementById(`${tabId}-discount-content`);

            if (activeTab && activeContent) {
                activeTab.classList.add('active');
                activeContent.classList.add('active');
                activeContent.style.display = 'block';
                console.log('显示内容区域:', activeContent.id);
            }
        }

        initDiscountForms() {
            console.log('初始化打折商品表单...');
            
            // 绑定添加打折商品按钮
            if (this.elements.addDiscountProductBtn) {
                this.elements.addDiscountProductBtn.addEventListener('click', () => this.addDiscountProduct());
            }

            // 绑定品类选择事件
            if (this.elements.discountProductType) {
                this.elements.discountProductType.addEventListener('change', () => this.updateDiscountProductOptions());
                this.updateDiscountProductOptions();
            }

            // 初始化定价方式功能（如果存在）
            if (this.elements.pricingMethodSelect) {
                this.initPricingMethod();
            }
            
            // 初始化单位选择功能（如果存在）
            if (this.elements.unitSelect) {
                this.initUnitSelection();
            }

            // 绑定实时价格计算
            if (this.elements.discountInput) {
                this.elements.discountInput.addEventListener('input', () => this.calculateDiscountPrice());
            }
            if (this.elements.fixedPriceInput) {
                this.elements.fixedPriceInput.addEventListener('input', () => this.calculateDiscountPriceFromFixed());
            }

            // 绑定商品选择变化事件
            if (this.elements.newDiscountProductSelect) {
                this.elements.newDiscountProductSelect.addEventListener('change', () => this.calculateDiscountPrice());
            }
        }

        initPricingMethod() {
            // 绑定定价方式切换事件
            if (this.elements.pricingMethodSelect) {
                this.elements.pricingMethodSelect.addEventListener('change', () => this.handlePricingMethodChange());
            }
        }

        initUnitSelection() {
            if (this.elements.unitSelect && this.elements.customUnitInput) {
                this.elements.unitSelect.addEventListener('change', () => this.handleUnitSelectionChange());
            }
        }

        handlePricingMethodChange() {
            const method = this.elements.pricingMethodSelect.value;
            
            if (method === 'discount') {
                this.elements.discountRateGroup.classList.remove('hidden');
                this.elements.fixedPriceGroup.classList.add('hidden');
            } else if (method === 'fixed') {
                this.elements.discountRateGroup.classList.add('hidden');
                this.elements.fixedPriceGroup.classList.remove('hidden');
            }
            
            this.calculateDiscountPrice();
        }

        handleUnitSelectionChange() {
            if (this.elements.unitSelect.value === 'custom') {
                this.elements.customUnitContainer.classList.remove('hidden');
                if (this.elements.customUnitInput) {
                    this.elements.customUnitInput.focus();
                }
            } else {
                this.elements.customUnitContainer.classList.add('hidden');
                if (this.elements.customUnitInput) {
                    this.elements.customUnitInput.value = '';
                }
            }
        }

        calculateDiscountPrice() {
            const selectedProduct = this.elements.newDiscountProductSelect.options[this.elements.newDiscountProductSelect.selectedIndex];
            if (!selectedProduct || !selectedProduct.value) {
                if (this.elements.priceDisplay) {
                    this.elements.priceDisplay.classList.add('hidden');
                }
                return;
            }

            const originalPrice = parseFloat(selectedProduct.getAttribute('data-price'));
            let discountRate = parseFloat(this.elements.discountInput.value);

            // 如果没有定价方式选择，使用默认的折扣率计算
            if (!this.elements.pricingMethodSelect || this.elements.pricingMethodSelect.value === 'discount') {
                if (!isNaN(discountRate) && discountRate >= 0.01 && discountRate <= 1.0) {
                    const discountedPrice = originalPrice * discountRate;
                    if (this.elements.calculatedPrice) {
                        this.elements.calculatedPrice.textContent = `¥${discountedPrice.toFixed(2)}`;
                    }
                    if (this.elements.priceDisplay) {
                        this.elements.priceDisplay.classList.remove('hidden');
                    }
                } else {
                    if (this.elements.priceDisplay) {
                        this.elements.priceDisplay.classList.add('hidden');
                    }
                }
            }
        }

        calculateDiscountPriceFromFixed() {
            if (!this.elements.fixedPriceInput || !this.elements.pricingMethodSelect) return;

            const selectedProduct = this.elements.newDiscountProductSelect.options[this.elements.newDiscountProductSelect.selectedIndex];
            if (!selectedProduct || !selectedProduct.value) {
                if (this.elements.priceDisplay) {
                    this.elements.priceDisplay.classList.add('hidden');
                }
                return;
            }

            const originalPrice = parseFloat(selectedProduct.getAttribute('data-price'));
            const fixedPrice = parseFloat(this.elements.fixedPriceInput.value);

            if (this.elements.pricingMethodSelect.value === 'fixed' && 
                !isNaN(fixedPrice) && fixedPrice > 0) {
                if (this.elements.calculatedPrice) {
                    this.elements.calculatedPrice.textContent = `¥${fixedPrice.toFixed(2)}`;
                }
                if (this.elements.priceDisplay) {
                    this.elements.priceDisplay.classList.remove('hidden');
                }
                
                // 计算实际折扣率
                const actualDiscount = fixedPrice / originalPrice;
                if (actualDiscount < 1 && this.elements.calculatedPrice) {
                    const discountPercent = (100 - (actualDiscount * 100)).toFixed(1);
                    this.elements.calculatedPrice.textContent += ` (相当于${discountPercent}%折扣)`;
                }
            } else {
                if (this.elements.priceDisplay) {
                    this.elements.priceDisplay.classList.add('hidden');
                }
            }
        }

        initDiscountSearch() {
            if (this.elements.discountProductSearch) {
                this.elements.discountProductSearch.addEventListener('input', (e) => this.handleDiscountProductSearch(e));
            }
        }

        addDiscountProduct() {
            console.log('添加打折商品...');
            
            const formData = this.getFormData();
            console.log('表单数据:', formData);

            if (!this.validateFormData(formData)) {
                alert('请选择商品并输入有效的折扣率(0.01-1.0)和库存');
                return;
            }

            try {
                const result = DiscountProductManager.createDiscountProduct(
                    formData.originalProductName, 
                    formData.discount, 
                    formData.stock, 
                    formData.reason,
                    formData.unit
                );
                console.log('打折商品创建结果:', result);

                this.resetForm();
                this.refreshDiscountUI();
                 // ========== 新增代码：刷新销售区UI ==========
                if (typeof window.refreshAll === 'function') {
                    window.refreshAll();
                } else if (typeof window.updateProductCards === 'function') {
                    window.updateProductCards();
                }
                alert('打折商品创建成功！');
            } catch (error) {
                console.error('创建打折商品失败:', error);
                alert('创建打折商品失败: ' + error.message);
            }
        }

        getFormData() {
            const selectedProduct = this.elements.newDiscountProductSelect.options[this.elements.newDiscountProductSelect.selectedIndex];
            
            let discount;
            if (this.elements.pricingMethodSelect && this.elements.pricingMethodSelect.value === 'fixed') {
                const fixedPrice = parseFloat(this.elements.fixedPriceInput.value);
                const originalPrice = parseFloat(selectedProduct.getAttribute('data-price'));
                discount = fixedPrice / originalPrice;
            } else {
                discount = parseFloat(this.elements.discountInput.value);
            }

            // 获取单位
            let unit = '个';
            if (this.elements.unitSelect) {
                unit = this.elements.unitSelect.value;
                if (unit === 'custom' && this.elements.customUnitInput) {
                    unit = this.elements.customUnitInput.value.trim() || '个';
                }
            }

            return {
                originalProductName: selectedProduct.value,
                discount: discount,
                stock: parseFloat(this.elements.newDiscountProductStock.value),
                reason: this.elements.newDiscountProductReason.value.trim() || '临期处理',
                unit: unit
            };
        }

        validateFormData(formData) {
            return formData.originalProductName && 
                   !isNaN(formData.discount) && 
                   formData.discount > 0 && 
                   formData.discount <= 1 && 
                   !isNaN(formData.stock) && 
                   formData.stock > 0;
        }

        resetForm() {
            if (this.elements.newDiscountProductStock) {
                this.elements.newDiscountProductStock.value = '';
            }
            if (this.elements.newDiscountProductReason) {
                this.elements.newDiscountProductReason.value = '临期处理';
            }
            if (this.elements.discountInput) {
                this.elements.discountInput.value = '0.8';
            }
            if (this.elements.fixedPriceInput) {
                this.elements.fixedPriceInput.value = '';
            }
            if (this.elements.unitSelect) {
                this.elements.unitSelect.value = '';
            }
            if (this.elements.customUnitInput) {
                this.elements.customUnitInput.value = '';
            }
            if (this.elements.customUnitContainer) {
                this.elements.customUnitContainer.classList.add('hidden');
            }
            if (this.elements.priceDisplay) {
                this.elements.priceDisplay.classList.add('hidden');
            }
        }

        updateDiscountProductOptions() {
            console.log('更新打折商品选项...');
            
            if (!this.elements.discountProductType || !this.elements.newDiscountProductSelect) {
                console.error('找不到类型选择器或商品选择器');
                return;
            }

            const type = this.elements.discountProductType.value;
            console.log('选择的类型:', type);
            this.elements.newDiscountProductSelect.innerHTML = '<option value="">选择商品</option>';

            if (type && categories[type]) {
                console.log('找到分类:', categories[type]);
                categories[type].list.forEach(product => {
                    // 检查是否已存在打折商品
                    const existingDiscount = DiscountProductManager.getDiscountProductByOriginalName(product.name);
                    const option = document.createElement('option');
                    option.value = product.name;
                    option.textContent = `${product.name} (原价: ${product.price.toFixed(2)}元)${existingDiscount ? ' - 已有特价' : ''}`;
                    option.setAttribute('data-price', product.price);
                    option.disabled = !!existingDiscount;
                    this.elements.newDiscountProductSelect.appendChild(option);
                });
            } else {
                console.log('未找到分类或类型为空');
            }
        }

        handleDiscountProductSearch(e) {
            const keyword = e.target.value.trim();
            const filteredProducts = DiscountProductManager.searchDiscountProducts(keyword);
            this.updateDiscountProductsList(filteredProducts);
        }

        updateDiscountProductsList(products = null) {
            console.log('更新打折商品列表...');
            
            if (!this.elements.discountProductsList) {
                console.error('找不到打折商品列表元素');
                return;
            }

            const productList = products || DiscountProductManager.getAllDiscountProducts();
            console.log('要显示的商品列表:', productList);
            this.elements.discountProductsList.innerHTML = '';

            if (productList.length === 0) {
                this.elements.discountProductsList.innerHTML = '<tr><td colspan="8" class="empty-message">暂无打折商品</td></tr>';
                return;
            }

            productList.forEach(product => {
                const row = this.createDiscountProductRow(product);
                this.elements.discountProductsList.appendChild(row);
            });
        }

        createDiscountProductRow(product) {
            const row = document.createElement('tr');
            const saving = product.originalPrice - product.discountPrice;
            const discountRate = (product.discount * 100).toFixed(0);
            // 格式化创建时间（避免太长）
            const createTime = new Date(product.createTime);
            const timeStr = createTime.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/\//g, '-');

            row.innerHTML = `
                <td style="text-align:center">
                    <input type="checkbox" class="discount-product-checkbox" data-id="${product.id}">
                </td>
                <td>${product.icon} ${product.name}</td>
                <td>${product.originalPrice.toFixed(2)}元</td>
                <td class="discount-price">${product.discountPrice.toFixed(2)}元</td>
                <td>${discountRate}%</td>
                <td>${product.stock}</td>
                <td>${product.unit}</td>
                <td>${product.reason}</td>
                <td>${timeStr}</td>
            `;
            return row;
        }


        refreshDiscountUI() {
            console.log('刷新打折商品UI...');
            this.updateDiscountProductsList();
            this.updateDiscountProductOptions();
        }

        // 创建打折商品卡片（用于销售区显示）
        createDiscountProductCard(product) {
            const card = document.createElement('div');
            card.className = 'product-card discount-product-card';
            card.dataset.name = product.name;
            card.dataset.type = product.type;
            card.dataset.isDiscount = 'true';
            card.dataset.productId = product.id;

            const saving = product.originalPrice - product.discountPrice;
            const discountRate = (product.discount * 100).toFixed(0);

            // 获取单位
            const unit = product.unit || this.getUnit(product.type);

            card.innerHTML = `
                <div style="position: absolute; top: 8px; right: 8px; background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">
                    ${discountRate}% OFF
                </div>
                <div class="product-icon">${product.icon}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">
                    <div style="text-decoration: line-through; color: #999; font-size: 12px;">
                        原价: ${product.originalPrice.toFixed(2)}元/${unit}
                    </div>
                    <div style="color: #e91e63; font-size: 16px; font-weight: bold;">
                        特价: ${product.discountPrice.toFixed(2)}元/${unit}
                    </div>
                    <div style="color: #4caf50; font-size: 12px; margin-top: 2px;">
                        ${discountRate}折 立省 ${saving.toFixed(2)}元
                    </div>
                </div>
            `;

            card.addEventListener('click', () => this.selectDiscountProduct(product, card));
            return card;
        }

        selectDiscountProduct(product, card) {
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
                    const typeCn = window.typeNameMap?.[product.type] || this.capitalize(product.type);
                    const unit = product.unit || this.getUnit(product.type);
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
        }

        // 获取所有打折商品卡片（用于销售区）
        getAllDiscountProductCards() {
            const discountProducts = DiscountProductManager.getAllDiscountProducts();
            console.log('获取打折商品卡片:', discountProducts);
            return discountProducts.map(product => this.createDiscountProductCard(product));
        }

        // 工具方法
        capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        getUnit(type) {
            const unitMap = {
                fruit: '公斤',
                vegetable: '公斤',
                snack: '个',
                cigarette: '包',
                liquor: '瓶',
                beverage: '瓶',
                frozen: '袋',
                kitchen: '个',
                living: '个'
            };
            return unitMap[type] || '个';
        }
    }

    // 初始化并导出 DiscountUI
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM加载完成，准备初始化打折商品UI');
        
        // 创建全局 DiscountUI 实例
        window.discountUI = new DiscountUI();
        
        console.log('打折商品UI模块加载完成');
    });

    // 向后兼容的接口
    window.DiscountUI = {
        // 获取实例
        getInstance: function() {
            return window.discountUI;
        },
        
        // 刷新UI
        refresh: function() {
            if (window.discountUI) {
                window.discountUI.refreshDiscountUI();
            }
        },
        
        // 获取所有打折商品卡片
        getAllDiscountProductCards: function() {
            if (window.discountUI) {
                return window.discountUI.getAllDiscountProductCards();
            }
            return [];
        },
        
        // 创建单个打折商品卡片
        createDiscountProductCard: function(product) {
            if (window.discountUI) {
                return window.discountUI.createDiscountProductCard(product);
            }
            // 备用方案
            return createDiscountProductCardFallback(product);
        }
    };

    // 备用方案函数
    function createDiscountProductCardFallback(product) {
        console.log("采取备用方案");
        const card = document.createElement('div');
        card.className = 'product-card discount-product-card';
        card.dataset.name = product.name;
        card.dataset.type = product.type;
        card.dataset.isDiscount = 'true';
        card.dataset.productId = product.id;

        const saving = product.originalPrice - product.discountPrice;
        const discountRate = (product.discount * 100).toFixed(0);

        // 获取单位
        const unit = product.unit || '个';

        card.innerHTML = `
            <div style="position: absolute; top: 8px; right: 8px; background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">
                ${discountRate}% OFF
            </div>
            <div class="product-icon">${product.icon}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-price">
                <div style="text-decoration: line-through; color: #999; font-size: 12px;">
                    原价: ${product.originalPrice.toFixed(2)}元/${unit}
                </div>
                <div style="color: #e91e63; font-size: 16px; font-weight: bold;">
                    特价: ${product.discountPrice.toFixed(2)}元/${unit}
                </div>
                <div style="color: #4caf50; font-size: 12px; margin-top: 2px;">
                    ${discountRate}折 立省 ${saving.toFixed(2)}元
                </div>
            </div>
        `;

        card.addEventListener('click', function() {
            document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');

            // 自动填充到销售表单
            const select = document.getElementById('productSelect');
            if (select) {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === product.name) {
                        select.selectedIndex = i;
                        break;
                    }
                }

                if (select.value !== product.name) {
                    const option = document.createElement('option');
                    option.value = product.name;
                    const typeCn = window.typeNameMap?.[product.type] || product.type.charAt(0).toUpperCase() + product.type.slice(1);
                    const unit = product.unit || '个';
                    option.textContent = `🏷️ ${typeCn}: ${product.name} (特价: ${product.discountPrice.toFixed(2)}元/${unit})`;
                    option.dataset.type = product.type;
                    option.style.color = '#e91e63';
                    option.style.fontWeight = 'bold';
                    select.appendChild(option);
                    select.value = product.name;
                }
            }

            const weightInput = document.getElementById('productWeight');
            if (weightInput) weightInput.focus();
        });

        return card;
    }

    function getCurrentOriginalPrice(originalName){
        for (const [type, cat] of Object.entries(categories)) {
            const p = cat.list.find(x => x.name === originalName);
            if (p) return p.price;
        }
        return null;
    }


    console.log('打折商品UI模块加载完成');
})();