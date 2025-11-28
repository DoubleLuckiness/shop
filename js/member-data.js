// member-data.js - 会员数据管理（支持多地址）
;(function() {
    'use strict';

    // 会员数据存储键名
    const MEMBER_STORAGE_KEY = 'supermarket_members';
    const MEMBER_PRODUCTS_STORAGE_KEY = 'supermarket_member_products';
    const CURRENT_MEMBER_STORAGE_KEY = 'supermarket_current_member';

    // 会员数据
    let members = [];
    let memberProducts = {};
    let currentMember = null;

    // 初始化会员数据
    // function initMemberData() {
    //     loadMemberData();
    //     loadMemberProductsData();
    //     loadCurrentMember();
    //     migrateMemberData();
    // }
    function initMemberData() {
        try {
            loadAllData();
            migrateMemberData();
        } catch (e) {
            console.error('初始化失败:', e);
        }
    }

    function loadAllData() {
        if (!isLocalStorageAvailable()) return;
        members = JSON.parse(localStorage.getItem(MEMBER_STORAGE_KEY)) || [];
        memberProducts = JSON.parse(localStorage.getItem(MEMBER_PRODUCTS_STORAGE_KEY)) || {};
        currentMember = JSON.parse(localStorage.getItem(CURRENT_MEMBER_STORAGE_KEY)) || null;
    }

    // 数据迁移：将单地址转换为多地址
    function migrateMemberData() {
        let migratedCount = 0;
        
        members.forEach(member => {
            // 如果会员有旧的 addr 字段，迁移到 addresses 数组
            if (member.addr !== undefined && !member.addresses) {
                if (member.addr) {
                    member.addresses = [{
                        id: Date.now(),
                        address: member.addr,
                        isDefault: true,
                        createdAt: member.joinDate + 'T00:00:00.000Z'
                    }];
                    member.defaultAddressIndex = 0;
                } else {
                    member.addresses = [];
                    member.defaultAddressIndex = -1;
                }
                
                // 删除旧的 addr 字段
                delete member.addr;
                migratedCount++;
            }
            
            // 确保 addresses 数组存在
            if (!member.addresses) {
                member.addresses = [];
                member.defaultAddressIndex = -1;
            }
        });
        
        if (migratedCount > 0) {
            saveMemberData();
            console.log(`数据迁移完成：${migratedCount} 个会员的地址数据已更新`);
        }
        
        return migratedCount;
    }

    // 加载会员数据
    function loadMemberData() {
        if (!isLocalStorageAvailable()) return;

        const saved = localStorage.getItem(MEMBER_STORAGE_KEY);
        if (saved) {
            try {
                members = JSON.parse(saved);
            } catch (e) {
                console.warn('会员数据解析失败，使用默认空数组:', e);
                members = [];
            }
        }
    }

    // 加载会员商品数据
    function loadMemberProductsData() {
        if (!isLocalStorageAvailable()) return;

        const saved = localStorage.getItem(MEMBER_PRODUCTS_STORAGE_KEY);
        if (saved) {
            try {
                memberProducts = JSON.parse(saved);
            } catch (e) {
                console.warn('会员商品数据解析失败，使用默认空对象:', e);
                memberProducts = {};
            }
        }
    }

    // 加载当前会员
    function loadCurrentMember() {
        if (!isLocalStorageAvailable()) return;

        const saved = localStorage.getItem(CURRENT_MEMBER_STORAGE_KEY);
        if (saved) {
            try {
                currentMember = JSON.parse(saved);
            } catch (e) {
                console.warn('当前会员数据解析失败:', e);
                currentMember = null;
            }
        }
    }

    // 保存会员数据
    function saveMemberData() {
        if (!isLocalStorageAvailable()) return;
        localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(members));
    }

    // 保存会员商品数据
    function saveMemberProductsData() {
        if (!isLocalStorageAvailable()) return;
        localStorage.setItem(MEMBER_PRODUCTS_STORAGE_KEY, JSON.stringify(memberProducts));
    }

    // 保存当前会员
    function saveCurrentMember() {
        if (!isLocalStorageAvailable()) return;
        localStorage.setItem(CURRENT_MEMBER_STORAGE_KEY, JSON.stringify(currentMember));
    }

    // 检查localStorage是否可用
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

    // 会员管理功能
    const MemberManager = {
        // 添加会员
        addMember(name, phone) {
            console.log('添加会员参数:', { name, phone });
            
            if (!name || !phone) {
                throw new Error('姓名和手机号不能为空');
            }

            if (members.some(m => m.phone === phone)) {
                throw new Error('该手机号已注册');
            }

            const member = {
                id: Date.now(),
                name: name.trim(),
                phone: phone.trim(),
                addresses: [],
                defaultAddressIndex: -1,
                joinDate: new Date().toISOString().split('T')[0],
                isActive: true,
                discount: 0.9 // 默认会员折扣
            };

            members.push(member);
            saveMemberData();
            return member;
        },

        // 删除会员
        deleteMember(id) {
            const index = members.findIndex(m => m.id === id);
            if (index !== -1) {
                members.splice(index, 1);
                saveMemberData();
                return true;
            }
            return false;
        },

        // 搜索会员
        searchMembers(keyword) {
            if (!keyword) return members;

            const lowerKeyword = keyword.toLowerCase();
            return members.filter(m =>
                m.name.toLowerCase().includes(lowerKeyword) ||
                m.phone.includes(lowerKeyword) ||
                m.addresses.some(addr => addr.address.toLowerCase().includes(lowerKeyword))
            );
        },

        // 验证会员身份
        verifyMember(nameOrPhone) {
            const member = members.find(m =>
                (m.name === nameOrPhone.trim() || m.phone === nameOrPhone.trim()) && m.isActive
            );

            if (member) {
                currentMember = member;
                saveCurrentMember();
                return member;
            }
            return null;
        },

        // 获取当前会员
        getCurrentMember() {
            return currentMember;
        },

        // 清除当前会员
        clearCurrentMember() {
            currentMember = null;
            saveCurrentMember();
        },

        // 获取所有会员
        getAllMembers() {
            return [...members];
        },

        // 检查当前是否有会员登录
        isMemberLoggedIn() {
            return !!currentMember;
        },

        // 根据ID获取会员
        getMemberById(id) {
            return members.find(m => m.id === id);
        },

        // 地址管理方法
        // 添加地址到会员
        addAddress(memberId, address) {
            const member = members.find(m => m.id === memberId);
            if (!member) {
                throw new Error('会员不存在');
            }

            const newAddress = {
                id: Date.now(),
                address: address.trim(),
                isDefault: member.addresses.length === 0,
                createdAt: new Date().toISOString()
            };

            member.addresses.push(newAddress);
            
            // 如果这是第一个地址，设为默认
            if (member.addresses.length === 1) {
                member.defaultAddressIndex = 0;
            }
            
            saveMemberData();
            return newAddress;
        },

        // 设置默认地址
        setDefaultAddress(memberId, addressId) {
            const member = members.find(m => m.id === memberId);
            if (!member) {
                throw new Error('会员不存在');
            }

            const addressIndex = member.addresses.findIndex(addr => addr.id === addressId);
            if (addressIndex === -1) {
                throw new Error('地址不存在');
            }

            member.defaultAddressIndex = addressIndex;
            saveMemberData();
            return true;
        },

        // 删除地址
        deleteAddress(memberId, addressId) {
            const member = members.find(m => m.id === memberId);
            if (!member) {
                throw new Error('会员不存在');
            }

            const addressIndex = member.addresses.findIndex(addr => addr.id === addressId);
            if (addressIndex === -1) {
                throw new Error('地址不存在');
            }

            // 如果要删除的是默认地址，需要重新设置默认地址
            if (member.defaultAddressIndex === addressIndex) {
                member.addresses.splice(addressIndex, 1);
                // 如果还有地址，设置第一个为默认
                if (member.addresses.length > 0) {
                    member.defaultAddressIndex = 0;
                } else {
                    member.defaultAddressIndex = -1;
                }
            } else {
                member.addresses.splice(addressIndex, 1);
                // 调整默认地址索引
                if (addressIndex < member.defaultAddressIndex) {
                    member.defaultAddressIndex--;
                }
            }

            saveMemberData();
            return true;
        },

        // 获取会员的默认地址
        getDefaultAddress(memberId) {
            const member = members.find(m => m.id === memberId);
            if (!member || member.addresses.length === 0 || member.defaultAddressIndex === -1) {
                return null;
            }
            return member.addresses[member.defaultAddressIndex];
        },

        // 获取会员的所有地址
        getMemberAddresses(memberId) {
            const member = members.find(m => m.id === memberId);
            return member ? member.addresses : [];
        },

        // 数据迁移方法
        migrateSingleAddressToMultiple() {
            return migrateMemberData();
        }
    };

    // 会员商品管理功能
    const MemberProductManager = {
        // 设置会员折扣率
        setMemberDiscount(productName, discount) {
            if (!productName || discount <= 0 || discount > 1) {
                throw new Error('商品名称和折扣率不能为空，折扣率范围0.01-1.0');
            }

            // 查找商品信息
            let productInfo = null;
            for (const [type, cat] of Object.entries(categories)) {
                const product = cat.list.find(p => p.name === productName);
                if (product) {
                    productInfo = {
                        type: type,
                        originalPrice: product.price,
                        name: product.name,
                        icon: product.icon
                    };
                    break;
                }
            }

            if (!productInfo) {
                throw new Error('商品不存在');
            }

            memberProducts[productName] = {
                ...productInfo,
                discount: parseFloat(discount),
                memberPrice: productInfo.originalPrice * parseFloat(discount)
            };

            saveMemberProductsData();
            return memberProducts[productName];
        },

        // 当商品价格变化时，更新对应的会员价
        updateMemberPriceForProduct(productName) {
            if (!memberProducts[productName]) {
                return null;
            }

            // 查找最新的商品价格
            let latestPrice = null;
            for (const [type, cat] of Object.entries(categories)) {
                const product = cat.list.find(p => p.name === productName);
                if (product) {
                    latestPrice = product.price;
                    break;
                }
            }

            if (latestPrice === null) {
                console.warn(`商品 ${productName} 不存在，无法更新会员价`);
                return null;
            }

            // 使用原有的折扣率重新计算会员价
            const discount = memberProducts[productName].discount;
            memberProducts[productName].originalPrice = latestPrice;
            memberProducts[productName].memberPrice = latestPrice * discount;

            saveMemberProductsData();
            console.log(`更新商品 ${productName} 的会员价: ${memberProducts[productName].memberPrice}`);
            return memberProducts[productName];
        },

        // 批量设置会员折扣率
        setBulkMemberDiscount(productNames, discount) {
            if (!Array.isArray(productNames) || productNames.length === 0 || discount <= 0 || discount > 1) {
                throw new Error('商品列表和折扣率不能为空，折扣率范围0.01-1.0');
            }

            const results = [];
            productNames.forEach(productName => {
                try {
                    const result = this.setMemberDiscount(productName, discount);
                    results.push(result);
                } catch (error) {
                    console.warn(`设置商品 ${productName} 折扣率失败:`, error.message);
                }
            });

            return results;
        },

        // 删除会员价格
        removeMemberPrice(productName) {
            if (memberProducts[productName]) {
                delete memberProducts[productName];
                saveMemberProductsData();
                return true;
            }
            return false;
        },

        // 批量更新所有会员商品的会员价
        updateAllMemberPrices() {
            const updatedProducts = [];

            Object.keys(memberProducts).forEach(productName => {
                const updated = this.updateMemberPriceForProduct(productName);
                if (updated) {
                    updatedProducts.push(updated);
                }
            });

            console.log(`批量更新了 ${updatedProducts.length} 个会员商品的会员价`);
            return updatedProducts;
        },

        // 获取商品的会员价格
        getMemberPrice(productName) {
            return memberProducts[productName]?.memberPrice || null;
        },

        // 获取商品的折扣率
        getMemberDiscount(productName) {
            return memberProducts[productName]?.discount || null;
        },

        // 获取商品的节省金额
        getSavingAmount(productName) {
            const product = memberProducts[productName];
            if (!product) return 0;

            return product.originalPrice - product.memberPrice;
        },

        // 获取所有会员商品
        getAllMemberProducts() {
            return Object.values(memberProducts);
        },

        // 搜索会员商品
        searchMemberProducts(keyword) {
            if (!keyword) return this.getAllMemberProducts();

            const lowerKeyword = keyword.toLowerCase();
            return this.getAllMemberProducts().filter(product =>
                product.name.toLowerCase().includes(lowerKeyword)
            );
        },

        // 检查商品是否有会员价
        hasMemberPrice(productName) {
            return !!memberProducts[productName];
        },

        // 获取当前会员的商品价格
        getPriceForCurrentMember(productName, originalPrice) {
            // 如果没有会员，返回原价
            if (!currentMember) return originalPrice;

            // 首先检查是否有专门的会员价
            const memberPrice = this.getMemberPrice(productName);
            if (memberPrice !== null) {
                return memberPrice;
            }

            // 如果没有专门的会员价，应用会员折扣
            return originalPrice * currentMember.discount;
        },

        // 检查商品是否有会员价
        hasMemberDiscount(productName) {
            if (!currentMember) return false;

            // 检查是否有专门的会员价
            if (this.hasMemberPrice(productName)) {
                return true;
            }

            // 检查是否应用通用会员折扣
            return currentMember.discount < 1;
        }
    };

    // 初始化
    initMemberData();

    // 暴露到全局
    window.MemberManager = MemberManager;
    window.MemberProductManager = MemberProductManager;

    console.log('会员数据模块加载完成 - 支持多地址');
})();