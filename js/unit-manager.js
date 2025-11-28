// unit-manager.js - 单位管理模块（不污染源代码）
(function() {
    'use strict';
    
    // 常用单位选项
    const commonUnits = {
        weight: ['公斤', '斤', '克', '磅', '袋', '箱'],
        count: ['个', '件', '包', '瓶', '盒', '袋', '提', '把', '套', '台'],
        liquid: ['升', '毫升', '瓶', '罐', '杯'],
        custom: ['份', '组', '对', '双', '条']
    };
    
    // 品类推荐单位映射
    const categoryRecommendedUnits = {
        fruit: ['公斤', '斤', '个', '盒','袋', '包','桶', '箱'],
        vegetable: ['公斤', '斤', '把', '个','袋', '包','桶', '箱'],
        snack: ['袋', '包', '个','瓶', '盒', '箱','公斤', '斤','桶', '条'],
        cigarette: ['包', '条', '盒', '箱'],
        liquor: ['瓶', '杯', '箱', '升','公斤', '斤','桶', '箱'],
        beverage: ['瓶', '罐', '杯', '盒', '箱','桶'],
        frozen: ['公斤', '斤','袋', '盒',  '包','桶', '箱'],
        kitchen: ['罐','瓶','个', '把', '套', '件','公斤', '斤','袋', '包','箱','桶'],
        living: ['公斤', '斤','件', '个', '瓶', '提', '包','袋', '盒','桶', '箱']
    };
    
    // 获取商品单位（替换原有的getUnit函数）
    window.getProductUnit = function(product) {
        if (product && product.unit) {
            return product.unit;
        }
        
        // 向后兼容：如果没有unit字段，使用原来的逻辑
        const type = product.type || product;
        if (type === 'cigarette') return '包';
        if (type === 'beverage' || type === 'liquor') return '瓶';
        if (type === 'snack') return '个';
        if (type === 'frozen') return '公斤|袋';
        if (type === 'kitchen' || type === 'living') return '件';
        return '公斤';
    };
    
    // 为商品管理表单添加单位选择器
    // unit-manager.js - 修改 addUnitSelectors 函数，添加事件监听
    function addUnitSelectors() {
        const types = ['fruit', 'vegetable', 'snack', 'cigarette', 'liquor', 'beverage', 'frozen', 'kitchen', 'living'];
        
        types.forEach(type => {
            const cap = type.charAt(0).toUpperCase() + type.slice(1);
            const form = document.querySelector(`#${type}-management-content .product-management-form`);
            if (form) {
                // 检查是否已经添加了单位选择器
                if (!form.querySelector('.unit-select-group')) {
                    const unitGroup = document.createElement('div');
                    unitGroup.className = 'unit-select-group';
                    unitGroup.innerHTML = `
                        <label>单位</label>
                        <select id="new${cap}Unit" class="unit-select">
                            <option value="">选择单位</option>
                            ${categoryRecommendedUnits[type].map(unit => 
                                `<option value="${unit}">${unit}</option>`
                            ).join('')}
                            <option value="custom">自定义...</option>
                        </select>
                        <input type="text" id="new${cap}CustomUnit" class="custom-unit-input" 
                               placeholder="输入自定义单位" style="display:none;">
                    `;
                    
                    // 插入到库存输入框后面
                    const stockInput = form.querySelector('input[type="number"]');
                    if (stockInput) {
                        stockInput.parentElement.after(unitGroup);
                    }
                    
                    // 绑定单位选择事件 - 添加调试
                    const unitSelect = document.getElementById(`new${cap}Unit`);
                    const customInput = document.getElementById(`new${cap}CustomUnit`);

                    if (unitSelect && customInput) {
                        unitSelect.addEventListener('change', function() {
                            console.log(`单位选择变化: ${type}`, this.value);
                            if (this.value === 'custom') {
                                customInput.style.display = 'block';
                                customInput.focus();
                            } else {
                                customInput.style.display = 'none';
                                customInput.value = '';
                            }
                        });
                        
                        // 添加自定义输入框的变化监听
                        customInput.addEventListener('input', function() {
                            console.log(`自定义单位输入: ${type}`, this.value);
                        });
                    }
                }
            }
        });
    }
    
    // 获取最终单位值
    function getFinalUnit(type) {
        const cap = type.charAt(0).toUpperCase() + type.slice(1);
        const unitSelect = document.getElementById(`new${cap}Unit`);
        const customInput = document.getElementById(`new${cap}CustomUnit`);
        
        if (unitSelect && unitSelect.value === 'custom' && customInput) {
            return customInput.value.trim() || '个';
        }
        
        return unitSelect ? unitSelect.value : '个';
    }
    
    // 填充单位选择器（编辑时）
    function populateUnitSelectors() {
        const types = ['fruit', 'vegetable', 'snack', 'cigarette', 'liquor', 'beverage', 'frozen', 'kitchen', 'living'];
        
        types.forEach(type => {
            const cap = type.charAt(0).toUpperCase() + type.slice(1);
            const unitSelect = document.getElementById(`new${cap}Unit`);
            const customInput = document.getElementById(`new${cap}CustomUnit`);
            
            if (unitSelect) {
                // 清空并重新填充选项
                unitSelect.innerHTML = `
                    <option value="">选择单位</option>
                    ${categoryRecommendedUnits[type].map(unit => 
                        `<option value="${unit}">${unit}</option>`
                    ).join('')}
                    <option value="custom">自定义...</option>
                `;
                
                // 如果有自定义输入框，重置状态
                if (customInput) {
                    customInput.style.display = 'none';
                    customInput.value = '';
                }
            }
        });
    }
    
    // 初始化单位管理器
    function initUnitManager() {
        // 延迟执行以确保DOM加载完成
        setTimeout(() => {
            addUnitSelectors();
            populateUnitSelectors();
            
            // 监听管理选项卡切换，确保单位选择器正确显示
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('management-tab')) {
                    setTimeout(() => {
                        populateUnitSelectors();
                    }, 100);
                }
            });
            
            console.log('单位管理器初始化完成');
        }, 500);
    }
    
    // 导出函数供外部调用
    window.UnitManager = {
        init: initUnitManager,
        getFinalUnit: getFinalUnit,
        getProductUnit: getProductUnit
    };
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUnitManager);
    } else {
        initUnitManager();
    }
})();