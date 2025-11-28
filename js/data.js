// data.js - 数据管理模块

// 常量定义
const CATEGORIES_CONFIG = {
    fruit: { iconSelector: '#fruit-icon-selector', managementList: '#fruit-management-list', inventoryBody: '#fruits-inventory-body', stats: { types: '#fruit-types', totalInitial: '#fruit-total-initial', totalSold: '#fruit-total-sold', totalRemaining: '#fruit-total-remaining' } },
    vegetable: { iconSelector: '#vegetable-icon-selector', managementList: '#vegetable-management-list', inventoryBody: '#vegetables-inventory-body', stats: { types: '#vegetable-types', totalInitial: '#vegetable-total-initial', totalSold: '#vegetable-total-sold', totalRemaining: '#vegetable-total-remaining' } },
    snack: { iconSelector: '#snack-icon-selector', managementList: '#snack-management-list', inventoryBody: '#snacks-inventory-body', stats: { types: '#snack-types', totalInitial: '#snack-total-initial', totalSold: '#snack-total-sold', totalRemaining: '#snack-total-remaining' } },
    cigarette: { iconSelector: '#cigarette-icon-selector', managementList: '#cigarette-management-list', inventoryBody: '#cigarettes-inventory-body', stats: { types: '#cigarette-types', totalInitial: '#cigarette-total-initial', totalSold: '#cigarette-total-sold', totalRemaining: '#cigarette-total-remaining' } },
    liquor: { iconSelector: '#liquor-icon-selector', managementList: '#liquor-management-list', inventoryBody: '#liquor-inventory-body', stats: { types: '#liquor-types', totalInitial: '#liquor-total-initial', totalSold: '#liquor-total-sold', totalRemaining: '#liquor-total-remaining' } },
    beverage: { iconSelector: '#beverage-icon-selector', managementList: '#beverage-management-list', inventoryBody: '#beverages-inventory-body', stats: { types: '#beverage-types', totalInitial: '#beverage-total-initial', totalSold: '#beverage-total-sold', totalRemaining: '#beverage-total-remaining' } },
    frozen: { iconSelector: '#frozen-icon-selector', managementList: '#frozen-management-list', inventoryBody: '#frozens-inventory-body', stats: { types: '#frozen-types', totalInitial: '#frozen-total-initial', totalSold: '#frozen-total-sold', totalRemaining: '#frozen-total-remaining' } },
    kitchen: { iconSelector: '#kitchen-icon-selector', managementList: '#kitchen-management-list', inventoryBody: '#kitchens-inventory-body', stats: { types: '#kitchen-types', totalInitial: '#kitchen-total-initial', totalSold: '#kitchen-total-sold', totalRemaining: '#kitchen-total-remaining' } },
    living: { iconSelector: '#living-icon-selector', managementList: '#living-management-list', inventoryBody: '#livings-inventory-body', stats: { types: '#living-types', totalInitial: '#living-total-initial', totalSold: '#living-total-sold', totalRemaining: '#living-total-remaining' } }
};

// 全局变量
const categories = Object.fromEntries(Object.keys(CATEGORIES_CONFIG).map(key => [key, { list: [], ...CATEGORIES_CONFIG[key] }]));

var selectedProducts = [];
var currentCategory = "all";
var deliveries = [];
var deliveryCounter = 0;
var tempDeliveryProducts = [];
var isEditingDelivery = false;
var editingDeliveryId = null;
var isSelectingForDelivery = false;
var salesRecords = [];
var salesRecordCounter = 0;

// 初始化数据
function initData() {
    try {
        categories.fruit.list = [
            { name: "苹果", price: 11.0, icon: "🍎", initialStock: 50, sold: 0, type: "fruit", unit: "公斤", loss: 0 },
            { name: "香蕉", price: 6.4, icon: "🍌", initialStock: 30, sold: 0, type: "fruit", unit: "公斤", loss: 0 }
        ];

        categories.vegetable.list = [
            { name: "西红柿", price: 8.0, icon: "🍅", initialStock: 60, sold: 0, type: "vegetable", unit: "公斤", loss: 0 }
        ];


        categories.snack.list = [
            { name: "薯片", price: 8.0, icon: "🍟", initialStock: 100, sold: 0, type: "snack", unit: "袋", loss: 0 }
        ];

        categories.cigarette.list = [
            { name: "中华", price: 65.0, icon: "🚬", initialStock: 30, sold: 0, type: "cigarette", unit: "包", loss: 0 }
        ];

        categories.liquor.list = [
            { name: "茅台", price: 1499.0, icon: "🥃", initialStock: 10, sold: 0, type: "liquor", unit: "瓶", loss: 0 }
        ];

        categories.beverage.list = [
            { name: "可乐", price: 3.5, icon: "🥤", initialStock: 200, sold: 0, type: "beverage", unit: "瓶", loss: 0 },
            { name: "橙汁", price: 5.0, icon: "🧃", initialStock: 150, sold: 0, type: "beverage", unit: "瓶" , loss: 0},
            { name: "牛奶", price: 4.5, icon: "🥛", initialStock: 180, sold: 0, type: "beverage", unit: "盒" , loss: 0}
        ];

        categories.frozen.list = [
            { name: "饺子", price: 20.0, icon: "🥟", initialStock: 50, sold: 0, type: "frozen", unit: "袋", loss: 0},
            { name: "冰淇淋", price: 15.0, icon: "🍦", initialStock: 100, sold: 0, type: "frozen", unit: "盒", loss: 0 }
        ];

        categories.kitchen.list = [
            { name: "刀具", price: 50.0, icon: "🔪", initialStock: 20, sold: 0, type: "kitchen", unit: "把", loss: 0 },
            { name: "锅", price: 100.0, icon: "🍳", initialStock: 15, sold: 0, type: "kitchen", unit: "个", loss: 0}
        ];

        categories.living.list = [
            { name: "洗发水", price: 30.0, icon: "🧴", initialStock: 50, sold: 0, type: "living", unit: "瓶", loss: 0 },
            { name: "纸巾", price: 10.0, icon: "🧻", initialStock: 200, sold: 0, type: "living", unit: "提", loss: 0 }
        ];

        
    } catch (e) {
        console.error('数据初始化失败:', e);
    }
}

initData();

// 导出
window.categories = categories;
window.selectedProducts = selectedProducts; // 等全局变量导出类似