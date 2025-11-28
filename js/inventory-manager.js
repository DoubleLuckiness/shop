// inventory-manager.js - 库存管理增强功能

class InventoryManager {
    constructor() {
        this.currentSortField = 'name';
        this.currentSortOrder = 'asc';
        this.selectedProducts = new Set();
        this.originalDisplayValues = {}; // 新增：保存原始display值
        console.log('InventoryManager 初始化');
        this.init();
    }

    init() {
        this.saveOriginalDisplayValues(); // 新增：保存原始display值
        this.bindEvents();
        this.updateInventoryBatchUI();
        this.hideFunctionsInManagementMode(); // 立即执行一次
        console.log('库存管理器初始化完成');
    }

    // 新增：保存原始display值
    saveOriginalDisplayValues() {
        const inventoryControls = document.querySelector('.inventory-controls');
        const batchActions = document.querySelector('.inventory-batch-actions');

        if (inventoryControls) {
            this.originalDisplayValues.inventoryControls = window.getComputedStyle(inventoryControls).display;
        }
        if (batchActions) {
            this.originalDisplayValues.batchActions = window.getComputedStyle(batchActions).display;
        }

        console.log('原始display值已保存:', this.originalDisplayValues);
    }

    bindEvents() {
        // 损耗量管理
        const manageLossBtn = document.getElementById('manageLossBtn');
        const cancelLossBtn = document.getElementById('cancelLossBtn');
        const saveLossBtn = document.getElementById('saveLossBtn');
        const lossProductType = document.getElementById('lossProductType');

        if (manageLossBtn) manageLossBtn.addEventListener('click', () => this.showLossModal());
        if (cancelLossBtn) cancelLossBtn.addEventListener('click', () => this.hideLossModal());
        if (saveLossBtn) saveLossBtn.addEventListener('click', () => this.saveLoss());
        if (lossProductType) lossProductType.addEventListener('change', (e) => this.updateLossProductOptions(e.target.value));

        // 批量操作
        const selectAllInventory = document.getElementById('selectAllInventory');
        const applySortBtn = document.getElementById('applySortBtn');
        const clearSalesBtn = document.getElementById('clearSalesBtn');

        if (selectAllInventory) selectAllInventory.addEventListener('change', (e) => this.toggleSelectAllInventory(e.target.checked));
        if (applySortBtn) applySortBtn.addEventListener('click', () => this.applySort());
        if (clearSalesBtn) clearSalesBtn.addEventListener('click', () => this.clearSelectedSales());



        // 使用事件委托处理动态生成的复选框
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('inventory-checkbox')) {
                this.handleInventoryCheckboxChange(e.target);
            }
        });

        // 库存选项卡切换时更新UI
        document.addEventListener('click', (e) => {
            if (e.target.closest('.inventory-tab')) {
                setTimeout(() => {
                    this.updateInventoryBatchUI();
                }, 100);
            }
        });

        // 新增：排序顺序切换
        const sortOrderIndicator = document.getElementById('sortOrderIndicator');
        if (sortOrderIndicator) {
            sortOrderIndicator.addEventListener('click', () => this.toggleSortOrder());
        }

        // 新增：排序字段变化时自动更新UI
        const inventorySort = document.getElementById('inventorySort');
        if (inventorySort) {
            inventorySort.addEventListener('change', () => this.updateSortUI());
        }

        // 新增：监听库存选项卡切换
        this.bindInventoryTabEvents();
        console.log('库存管理器事件绑定完成');
    }

    // 新增：绑定库存选项卡事件
    bindInventoryTabEvents() {
        document.querySelectorAll('.inventory-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                setTimeout(() => {
                    this.handleInventoryTabSwitch();
                }, 100);
            });
        });
    }

// 在 inventory-manager.js 中找到 handleInventoryTabSwitch 方法并修复
    handleInventoryTabSwitch() {
        const isManagementTab = document.querySelector('.inventory-tab[data-inventory-tab="management"]')?.classList.contains('active');
        const inventoryControls = document.querySelector('.inventory-controls');
        const batchActions = document.querySelector('.inventory-batch-actions');

        if (inventoryControls && batchActions) {
            if (isManagementTab) {
                // 隐藏时保存当前display值
                if (!this.originalDisplayValues) {
                    this.originalDisplayValues = {};
                }
                this.originalDisplayValues.inventoryControls = window.getComputedStyle(inventoryControls).display;
                this.originalDisplayValues.batchActions = window.getComputedStyle(batchActions).display;

                inventoryControls.style.display = 'none';
                batchActions.style.display = 'none';
                console.log('商品管理页面：隐藏库存功能');
            } else {
                // 显示时恢复原始display值
                const inventoryDisplay = this.originalDisplayValues?.inventoryControls || 'flex';
                const batchDisplay = this.originalDisplayValues?.batchActions || 'flex';

                inventoryControls.style.display = inventoryDisplay;
                batchActions.style.display = batchDisplay;
                console.log('库存查看页面：显示库存功能，恢复为:', inventoryDisplay, batchDisplay);
            }
        }
    }

    // 新增：修复缺失的方法
    hideFunctionsInManagementMode() {
        const managementTab = document.querySelector('.inventory-tab[data-inventory-tab="management"]');
        if (managementTab && managementTab.classList.contains('active')) {
            this.hideInventoryFunctions();
        }
    }

    // 新增：隐藏库存功能
    hideInventoryFunctions() {
        const inventoryControls = document.querySelector('.inventory-controls');
        const batchActions = document.querySelector('.inventory-batch-actions');

        if (inventoryControls) inventoryControls.style.display = 'none';
        if (batchActions) batchActions.style.display = 'none';

        console.log('商品管理页面：已隐藏库存功能');
    }

    // 新增：显示库存功能
    showInventoryFunctions() {
        const inventoryControls = document.querySelector('.inventory-controls');
        const batchActions = document.querySelector('.inventory-batch-actions');

        if (inventoryControls) inventoryControls.style.display = 'block';
        if (batchActions) batchActions.style.display = 'block';

        console.log('库存查看页面：已显示库存功能');
    }

    // 新增：切换排序顺序
    toggleSortOrder() {
        this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
        this.updateSortUI();
        this.applySort(); // 自动应用新排序
    }

    // 新增：更新排序UI显示
    updateSortUI() {
        const sortOrderIndicator = document.getElementById('sortOrderIndicator');
        const inventorySort = document.getElementById('inventorySort');

        if (sortOrderIndicator && inventorySort) {
            // 更新排序字段
            this.currentSortField = inventorySort.value;

            // 更新排序指示器
            sortOrderIndicator.textContent = this.currentSortOrder === 'asc' ? '↑ 升序' : '↓ 降序';
            sortOrderIndicator.className = this.currentSortOrder === 'asc' ? 'asc' : 'desc';

            // 更新表头高亮
            this.updateTableHeaderHighlight();
        }
    }

    // 新增：更新表头高亮
    updateTableHeaderHighlight() {
        // 移除所有表头的高亮
        document.querySelectorAll('.inventory-table th').forEach(th => {
            th.classList.remove('sort-active', 'asc', 'desc');
        });

        // 根据当前激活的选项卡添加高亮
        const activeTab = document.querySelector('.inventory-detail.active');
        if (!activeTab) return;

        const table = activeTab.querySelector('.inventory-table');
        if (!table) return;

        // 映射排序字段到表头
        const fieldToHeaderMap = {
            'name': '名称',
            'price': '单价',
            'initialStock': '原始库存',
            'sold': '已销售',
            'remaining': '剩余库存',
            'loss': '损耗量',
            'netStock': '净库存'
        };

        // 找到对应的表头并高亮
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
            const headerText = header.textContent.replace(/\(元\)|\(个\)|\(包\)|\(瓶\)|\(袋\)|\(件\)|\(公斤\)/g, '').trim();

            Object.entries(fieldToHeaderMap).forEach(([field, displayName]) => {
                if (headerText.includes(displayName) && field === this.currentSortField) {
                    header.classList.add('sort-active', this.currentSortOrder);
                }
            });
        });
    }


    // 损耗量管理功能
    showLossModal() {
        const isManagementTab = document.querySelector('.inventory-tab[data-inventory-tab="management"]')?.classList.contains('active');
        if (isManagementTab) {
            console.log('商品管理页面不显示损耗管理');
            return;
        }
        const modal = document.getElementById('lossManagementModal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateLossProductOptions('');
        }
    }

    hideLossModal() {
        const modal = document.getElementById('lossManagementModal');
        if (modal) {
            modal.style.display = 'none';
            this.resetLossForm();
        }
    }

    updateLossProductOptions(type) {
        const select = document.getElementById('lossProductSelect');
        if (!select) return;

        select.innerHTML = '<option value="">选择商品</option>';
        
        if (type && categories[type]) {
            categories[type].list.forEach(product => {
                const option = document.createElement('option');
                option.value = product.name;
                const currentLoss = product.loss || 0;
                option.textContent = `${product.name} (当前损耗: ${currentLoss})`;
                select.appendChild(option);
            });
        }
    }

    resetLossForm() {
        const lossProductType = document.getElementById('lossProductType');
        const lossProductSelect = document.getElementById('lossProductSelect');
        const lossAmount = document.getElementById('lossAmount');

        if (lossProductType) lossProductType.value = '';
        if (lossProductSelect) lossProductSelect.innerHTML = '<option value="">选择商品</option>';
        if (lossAmount) lossAmount.value = '';
    }

    saveLoss() {
        const type = document.getElementById('lossProductType')?.value;
        const productName = document.getElementById('lossProductSelect')?.value;
        const lossAmount = parseFloat(document.getElementById('lossAmount')?.value);

        if (!type || !productName || isNaN(lossAmount) || lossAmount < 0) {
            alert('请填写完整的损耗信息');
            return;
        }

        const product = categories[type]?.list.find(p => p.name === productName);
        if (!product) {
            alert('商品不存在');
            return;
        }

        const remaining = product.initialStock - product.sold;
        if (lossAmount > remaining) {
            alert(`损耗量不能超过剩余库存！当前剩余库存: ${remaining}`);
            return;
        }

        product.loss = lossAmount;
        saveData();
        this.hideLossModal();

        refreshAll();
        alert(`已更新 ${productName} 的损耗量为 ${lossAmount}`);
    }

    // 批量操作功能
    toggleSelectAllInventory(checked) {
        const activeTab = document.querySelector('.inventory-detail.active');
        if (!activeTab) return;

        const checkboxes = activeTab.querySelectorAll('.inventory-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this.handleInventoryCheckboxChange(checkbox);
        });
    }

    handleInventoryCheckboxChange(checkbox) {
        const productId = `${checkbox.dataset.type}-${checkbox.dataset.name}`;
        
        if (checkbox.checked) {
            this.selectedProducts.add(productId);
        } else {
            this.selectedProducts.delete(productId);
        }
        
        this.updateInventoryBatchUI();
    }

    updateInventoryBatchUI() {
        const count = this.selectedProducts.size;
        const countElement = document.getElementById('selectedInventoryCount');
        const clearSalesBtn = document.getElementById('clearSalesBtn');
        const clearSalesCount = document.getElementById('clearSalesCount');

        if (countElement) {
            countElement.textContent = `已选择 ${count} 个商品`;
        }

        if (clearSalesBtn && clearSalesCount) {
            clearSalesCount.textContent = count;
            
            if (count > 0) {
                clearSalesBtn.style.display = 'inline-block';
            } else {
                clearSalesBtn.style.display = 'none';
            }
        }

        // 更新全选复选框状态
        const activeTab = document.querySelector('.inventory-detail.active');
        if (activeTab) {
            const checkboxes = activeTab.querySelectorAll('.inventory-checkbox');
            const selectAll = activeTab.querySelector('.select-all-checkbox');
            
            if (selectAll && checkboxes.length > 0) {
                const checkedCount = activeTab.querySelectorAll('.inventory-checkbox:checked').length;
                selectAll.checked = checkedCount === checkboxes.length;
                selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
            }
        }
    }

    // 清除销售功能
    clearSelectedSales() {
        if (this.selectedProducts.size === 0) {
            alert('请先选择要清除销售记录的商品');
            return;
        }

        if (!confirm(`确定要清除选中 ${this.selectedProducts.size} 个商品的销售记录吗？\n这将把原始库存更新为当前净库存，并重置销售量为0。`)) {
            return;
        }

        this.selectedProducts.forEach(productId => {
            const [type, name] = productId.split('-');
            const product = categories[type]?.list.find(p => p.name === name);
            
            if (product) {
                const remain = product.initialStock - product.sold;
                const netStock = Math.max(0, remain - (product.loss || 0));
                
                // 更新原始库存为净库存
                product.initialStock = netStock;
                // 重置销售量
                product.sold = 0;
                // 重置损耗量
                product.loss = 0;
            }
        });

        this.selectedProducts.clear();
        this.updateInventoryBatchUI();
        refreshAll();
        alert(`已成功清除 ${this.selectedProducts.size} 个商品的销售记录`);
    }

    // 修改：应用排序方法
    applySort() {
        const isManagementTab = document.querySelector('.inventory-tab[data-inventory-tab="management"]')?.classList.contains('active');
        if (isManagementTab) {
            console.log('商品管理页面不应用排序');
            return;
        }
        const sortField = document.getElementById('inventorySort')?.value;
        if (!sortField) return;

        this.currentSortField = sortField;
        this.updateSortUI(); // 更新UI显示
        this.sortInventory(sortField);
    }

    // 修改：排序方法
    sortInventory(field) {
        console.log(`排序字段: ${field}, 排序顺序: ${this.currentSortOrder}`);

        // 获取当前激活的库存选项卡
        const activeTab = document.querySelector('.inventory-detail.active');
        const activeTabId = activeTab ? activeTab.id : '';

        if (activeTabId === 'all-inventory-detail') {
            // 全部商品选项卡 - 需要跨品类排序
            this.sortAllProducts(field);
        } else {
            // 单个品类选项卡 - 对每个品类单独排序
            Object.values(categories).forEach(category => {
                category.list.sort((a, b) => {
                    return this.compareProducts(a, b, field);
                });
            });
        }

        // 更新表头高亮
        this.updateTableHeaderHighlight();

        refreshAll();

        // 显示排序提示
        this.showSortNotification(field);
    }

    // 新增：显示排序提示
    showSortNotification(field) {
        const fieldNames = {
            'name': '商品名称',
            'price': '单价',
            'initialStock': '原始库存',
            'sold': '已销售数量',
            'remaining': '剩余库存',
            'loss': '损耗量',
            'netStock': '净库存'
        };

        const orderText = this.currentSortOrder === 'asc' ? '升序' : '降序';
        const fieldName = fieldNames[field] || field;

        console.log(`已按 ${fieldName} ${orderText} 排序`);

        // 可以添加一个短暂的提示（可选）
        this.showTempMessage(`已按 ${fieldName} ${orderText} 排序`, 2000);
    }

    // 新增：临时消息提示
    showTempMessage(message, duration = 2000) {
        // 移除现有的提示
        const existingMsg = document.getElementById('tempSortMessage');
        if (existingMsg) existingMsg.remove();

        // 创建新提示
        const msg = document.createElement('div');
        msg.id = 'tempSortMessage';
        msg.textContent = message;
        msg.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-weight: bold;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(msg);

        // 自动移除
        setTimeout(() => {
            if (msg.parentNode) {
                msg.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (msg.parentNode) msg.remove();
                }, 300);
            }
        }, duration);
    }

    // 新增：全部商品排序方法
    sortAllProducts(field) {
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

        // 对全部商品进行排序
        allProducts.sort((a, b) => {
            return this.compareProducts(a, b, field);
        });

        // 由于全部商品是计算得出的视图，不需要重新分配回 categories
        // 排序后的显示会在 updateAllProductsInventory 中处理
        // 这里我们只需要触发刷新即可
    }

// 新增：商品比较方法
    compareProducts(a, b, field) {
        let valueA, valueB;

        switch (field) {
            case 'name':
                valueA = a.name;
                valueB = b.name;
                break;
            case 'price':
                valueA = a.price;
                valueB = b.price;
                break;
            case 'initialStock':
                valueA = a.initialStock;
                valueB = b.initialStock;
                break;
            case 'sold':
                valueA = a.sold;
                valueB = b.sold;
                break;
            case 'remaining':
                valueA = a.initialStock - a.sold;
                valueB = b.initialStock - b.sold;
                break;
            case 'loss':
                valueA = a.loss || 0;
                valueB = b.loss || 0;
                break;
            case 'netStock':
                valueA = Math.max(0, (a.initialStock - a.sold) - (a.loss || 0));
                valueB = Math.max(0, (b.initialStock - b.sold) - (b.loss || 0));
                break;
            default:
                valueA = a.name;
                valueB = b.name;
        }

        if (typeof valueA === 'string') {
            return this.currentSortOrder === 'asc' ?
                valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else {
            return this.currentSortOrder === 'asc' ? valueA - valueB : valueB - valueA;
        }
    }

    // 获取选中商品数量
    getSelectedCount() {
        return this.selectedProducts.size;
    }

    // 清空选中状态
    clearSelection() {
        this.selectedProducts.clear();
        this.updateInventoryBatchUI();
    }

    // 销毁方法（用于清理）
    destroy() {
        // 清理事件监听器等资源
        this.selectedProducts.clear();
        console.log('InventoryManager 已销毁');
    }
}

// 导出为全局变量，但不自动初始化
window.InventoryManager = InventoryManager;