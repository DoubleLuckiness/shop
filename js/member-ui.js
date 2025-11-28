// member-ui.js - 会员UI管理（支持多地址）
;(function() {
    'use strict';

    let currentEditingMemberId = null;

    // 初始化会员UI
    function initMemberUI() {
        initMemberTabs();
        initMemberForms();
        initMemberSearch();
        initAddressManagement();
        refreshMemberUI();

        initMemberVerification();
        initMemberBatchSelection();
        initMemberProductBatchSelection();
        
        // 数据迁移
        MemberManager.migrateSingleAddressToMultiple();
    }

    // 初始化会员选项卡
    function initMemberTabs() {
        console.log('初始化会员选项卡...');

        document.querySelectorAll('.member-tab').forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('点击会员选项卡:', this.dataset.memberTab);

                // 移除所有激活状态
                document.querySelectorAll('.member-tab').forEach(t => {
                    t.classList.remove('active');
                });
                document.querySelectorAll('.member-content').forEach(c => {
                    c.classList.remove('active');
                    c.style.display = 'none';
                });

                // 添加当前激活状态
                this.classList.add('active');
                const targetTab = this.dataset.memberTab;
                const targetContent = document.getElementById(`${targetTab}-member-content`);

                if (targetContent) {
                    targetContent.classList.add('active');
                    targetContent.style.display = 'block';
                    console.log('显示内容区域:', targetContent.id);
                } else {
                    console.error('找不到目标内容区域:', `${targetTab}-member-content`);
                }
            });
        });

        // 确保默认显示第一个选项卡
        const defaultTab = document.querySelector('.member-tab.active');
        if (defaultTab) {
            const defaultTabId = defaultTab.dataset.memberTab;
            const defaultContent = document.getElementById(`${defaultTabId}-member-content`);
            if (defaultContent) {
                defaultContent.classList.add('active');
                defaultContent.style.display = 'block';
            }
        }
    }

    // 初始化会员表单
    function initMemberForms() {
        // 添加会员表单
        const addMemberBtn = document.getElementById('addMemberBtn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', addMember);
        }

        // 设置会员折扣表单
        const setMemberPriceBtn = document.getElementById('setMemberPriceBtn');
        if (setMemberPriceBtn) {
            setMemberPriceBtn.addEventListener('click', setMemberDiscount);
        }

        // 品类选择变化时更新商品列表
        const memberProductType = document.getElementById('memberProductType');
        if (memberProductType) {
            memberProductType.addEventListener('change', updateMemberProductOptions);
        }

        // 批量设置折扣率
        const bulkDiscountBtn = document.getElementById('bulkDiscountBtn');
        if (bulkDiscountBtn) {
            bulkDiscountBtn.addEventListener('click', setBulkDiscount);
        }

        // 监听折扣率输入框的变化，实时计算会员价
        const discountInput = document.getElementById('memberProductDiscount');
        if (discountInput) {
            discountInput.addEventListener('input', calculateMemberPrice);
        }

        // 监听批量折扣率输入框的变化
        const bulkDiscountInput = document.getElementById('bulkDiscountValue');
        if (bulkDiscountInput) {
            bulkDiscountInput.addEventListener('input', validateDiscountInput);
        }
    }

    // 初始化地址管理功能
    function initAddressManagement() {
        const modal = document.getElementById('addressManagementModal');
        if (!modal) {
            console.warn('地址管理模态框未找到，将创建...');
            createAddressManagementModal();
            return;
        }
        
        // 添加地址按钮
        const addAddressBtn = document.getElementById('addAddressBtn');
        if (addAddressBtn) {
            addAddressBtn.addEventListener('click', function() {
                const addressInput = document.getElementById('newAddressInput');
                const address = addressInput.value.trim();
                
                if (!address) {
                    alert('请输入地址');
                    return;
                }
                
                try {
                    MemberManager.addAddress(currentEditingMemberId, address);
                    addressInput.value = '';
                    refreshAddressList(currentEditingMemberId);
                    refreshMemberUI(); // 刷新主列表
                } catch (error) {
                    alert('添加地址失败: ' + error.message);
                }
            });
        }
        
        // 关闭模态框按钮
        const closeBtn = document.getElementById('closeAddressModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
                currentEditingMemberId = null;
            });
        }
        
        // 点击模态框外部关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                currentEditingMemberId = null;
            }
        });

        // 回车键添加地址
        const addressInput = document.getElementById('newAddressInput');
        if (addressInput) {
            addressInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    document.getElementById('addAddressBtn').click();
                }
            });
        }
    }

    // 创建地址管理模态框（如果不存在）
    function createAddressManagementModal() {
        const modalHTML = `
            <div id="addressManagementModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
                <div class="modal-content" style="background: white; padding: 20px; border-radius: 10px; width: 600px; max-width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin: 0 0 15px 0;">地址管理 - <span id="currentMemberName"></span></h3>
                    
                    <!-- 添加新地址 -->
                    <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                        <h4 style="margin: 0 0 10px 0;">添加新地址</h4>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="newAddressInput" placeholder="输入详细地址" style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                            <button id="addAddressBtn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer;">添加地址</button>
                        </div>
                    </div>
                    
                    <!-- 地址列表 -->
                    <div class="address-list">
                        <h4 style="margin: 0 0 10px 0;">地址列表</h4>
                        <div class="table-container">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">地址</th>
                                        <th width="80" style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">默认</th>
                                        <th width="120" style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="addressList"></tbody>
                            </table>
                        </div>
                        
                    </div>
                    
                    <div style="margin-top: 20px; text-align: right;">
                        <button id="closeAddressModalBtn" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer;">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        initAddressManagement();
    }

    // 打开地址管理模态框
    function openAddressManagementModal(memberId) {
        currentEditingMemberId = memberId;
        const modal = document.getElementById('addressManagementModal');
        const member = MemberManager.getMemberById(memberId);
        
        if (!member) {
            alert('会员不存在');
            return;
        }
        
        // 更新模态框标题
        document.getElementById('currentMemberName').textContent = member.name;
        
        // 刷新地址列表
        refreshAddressList(memberId);
        
        // 显示模态框
        modal.style.display = 'flex';
        
        // 聚焦到地址输入框
        const addressInput = document.getElementById('newAddressInput');
        if (addressInput) {
            addressInput.focus();
        }
    }

    // 刷新地址列表
    function refreshAddressList(memberId) {
        const addressList = document.getElementById('addressList');
        const addresses = MemberManager.getMemberAddresses(memberId);
        
        addressList.innerHTML = '';
        
        if (addresses.length === 0) {
            addressList.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #666;">暂无地址</td></tr>';
            return;
        }
        
        addresses.forEach((address) => {
            const row = document.createElement('tr');
            const defaultAddress = MemberManager.getDefaultAddress(memberId);
            const isDefault = defaultAddress && defaultAddress.id === address.id;
            
            row.innerHTML = `
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${address.address}</td>
                <td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">
                    ${isDefault ? '✅' : ''}
                </td>
                <td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">
                    ${!isDefault ? `
                        <button class="set-default-address-btn" data-address-id="${address.id}" 
                                style="padding: 4px 8px; margin-right: 5px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            设默认
                        </button>
                    ` : ''}
                    <button class="delete-address-btn" data-address-id="${address.id}" 
                            style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        删除
                    </button>
                </td>
            `;
            addressList.appendChild(row);
        });
        
        // 绑定操作按钮事件
        document.querySelectorAll('.set-default-address-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const addressId = parseInt(this.dataset.addressId);
                MemberManager.setDefaultAddress(currentEditingMemberId, addressId);
                refreshAddressList(currentEditingMemberId);
                refreshMemberUI(); // 刷新主列表
            });
        });
        
        document.querySelectorAll('.delete-address-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const addressId = parseInt(this.dataset.addressId);
                if (confirm('确定删除这个地址吗？')) {
                    MemberManager.deleteAddress(currentEditingMemberId, addressId);
                    refreshAddressList(currentEditingMemberId);
                    refreshMemberUI(); // 刷新主列表
                }
            });
        });
    }

    // 初始化会员验证功能
    function initMemberVerification() {
        const verifyBtn = document.getElementById('verifyMemberBtn');
        const clearBtn = document.getElementById('clearMemberBtn');
        
        if (verifyBtn) {
            verifyBtn.addEventListener('click', verifyMember);
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', clearMemberVerification);
        }

        const verifyInput = document.getElementById('verifyMemberInput');
        if (verifyInput) {
            verifyInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyMember();
            });
        }
        
        updateMemberVerificationUI();
    }

    // 更新会员验证UI状态
    function updateMemberVerificationUI() {
        const currentMember = MemberManager.getCurrentMember();
        const input = document.getElementById('verifyMemberInput');
        const statusEl = document.getElementById('memberStatus');
        const infoEl = document.getElementById('memberInfo');
        const clearBtn = document.getElementById('clearMemberBtn');
        const verifyBtn = document.getElementById('verifyMemberBtn');

        if (!input || !statusEl) return;

        if (currentMember) {
            input.value = '';
            input.disabled = true;
            statusEl.textContent = '已验证';
            statusEl.className = 'member-status verified';
            
            const defaultAddress = MemberManager.getDefaultAddress(currentMember.id);
            const addressInfo = defaultAddress ? `，默认地址: ${defaultAddress.address}` : '，暂无地址';
            infoEl.innerHTML = `当前会员: ${currentMember.name} (${currentMember.phone})${addressInfo}`;
            infoEl.style.display = 'block';
            
            if (clearBtn) clearBtn.style.display = 'inline-block';
            if (verifyBtn) verifyBtn.style.display = 'none';
        } else {
            input.value = '';
            input.disabled = false;
            statusEl.textContent = '未验证';
            statusEl.className = 'member-status unverified';
            infoEl.style.display = 'none';
            if (clearBtn) clearBtn.style.display = 'none';
            if (verifyBtn) verifyBtn.style.display = 'inline-block';
        }
    }

    // 初始化会员批量选择
    function initMemberBatchSelection(){
        document.addEventListener('change', (e) => {
            if (e.target.id === 'selectAllMembersHeader') {
                const checked = e.target.checked;
                document.querySelectorAll('#memberList .member-checkbox').forEach(cb => cb.checked = checked);
                updateMemberBatchUI();
            }
            if (e.target.classList.contains('member-checkbox')) {
                updateMemberBatchUI();
            }
        });

        const deleteBtn = document.getElementById('deleteSelectedMembersBtn');
        if (deleteBtn) {
            deleteBtn.replaceWith(deleteBtn.cloneNode(true));
            document.getElementById('deleteSelectedMembersBtn').addEventListener('click', () => {
                const checked = document.querySelectorAll('#memberList .member-checkbox:checked');
                if (checked.length === 0) return alert('请先选中要删除的会员');
                if (!confirm(`确定删除 ${checked.length} 位会员吗？`)) return;

                checked.forEach(cb => {
                    MemberManager.deleteMember(parseInt(cb.dataset.id));
                });
                refreshMemberUI();
                updateMemberBatchUI();
            });
        }
    }

    // 更新会员批量操作UI
    function updateMemberBatchUI(){
        const checked = document.querySelectorAll('#memberList .member-checkbox:checked').length;
        const btn = document.getElementById('deleteSelectedMembersBtn');
        const span = document.getElementById('selectedMembersCount');
        if (span) span.textContent = checked;
        if (btn) {
            if (checked > 0) {
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
    }

    // 初始化会员商品批量选择
    function initMemberProductBatchSelection() {
        document.addEventListener('change', (e) => {
            if (e.target.id === 'selectAllMemberProductsHeader') {
                const checked = e.target.checked;
                document.querySelectorAll('#memberProductsList .member-product-checkbox').forEach(cb => cb.checked = checked);
                updateMemberProductBatchUI();
            }
            if (e.target.classList.contains('member-product-checkbox')) {
                updateMemberProductBatchUI();
            }
        });

        const deleteBtn = document.getElementById('deleteSelectedMemberProductsBtn');
        if (deleteBtn) {
            deleteBtn.replaceWith(deleteBtn.cloneNode(true));
            document.getElementById('deleteSelectedMemberProductsBtn').addEventListener('click', () => {
                const checked = document.querySelectorAll('#memberProductsList .member-product-checkbox:checked');
                if (checked.length === 0) return alert('请先选中要删除的会员商品');
                if (!confirm(`确定删除 ${checked.length} 条会员价格设置吗？`)) return;

                checked.forEach(cb => {
                    MemberProductManager.removeMemberPrice(cb.dataset.name);
                });
                refreshMemberUI();
                updateMemberProductBatchUI();
            });
        }
    }

    // 更新会员商品批量操作UI
    function updateMemberProductBatchUI(){
        const checked = document.querySelectorAll('#memberProductsList .member-product-checkbox:checked').length;
        const btn = document.getElementById('deleteSelectedMemberProductsBtn');
        const span = document.getElementById('selectedMemberProductsCount');
        if (span) span.textContent = checked;
        if (btn) {
            if (checked > 0) {
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
    }

    // 初始化搜索功能
    function initMemberSearch() {
        const memberSearch = document.getElementById('memberSearch');
        if (memberSearch) {
            memberSearch.addEventListener('input', handleMemberSearch);
        }

        const memberProductSearch = document.getElementById('memberProductSearch');
        if (memberProductSearch) {
            memberProductSearch.addEventListener('input', handleMemberProductSearch);
        }
    }

    // 添加会员
    function addMember() {
        const nameInput = document.getElementById('newMemberName');
        const phoneInput = document.getElementById('newMemberPhone');

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        try {
            MemberManager.addMember(name, phone);

            nameInput.value = '';
            phoneInput.value = '';

            refreshMemberUI();
            alert('会员添加成功！');
        } catch (error) {
            alert('添加会员失败: ' + error.message);
        }
    }

    // 设置会员折扣率
    function setMemberDiscount() {
        const typeSelect = document.getElementById('memberProductType');
        const productSelect = document.getElementById('memberProductSelect');
        const discountInput = document.getElementById('memberProductDiscount');

        const productName = productSelect.value;
        const discount = parseFloat(discountInput.value);

        if (!productName || isNaN(discount) || discount <= 0 || discount > 1) {
            alert('请选择商品并输入有效的折扣率(0.01-1.0)');
            return;
        }

        try {
            MemberProductManager.setMemberDiscount(productName, discount);
            refreshMemberUI();
            alert('会员折扣率设置成功！');
        } catch (error) {
            alert('设置会员折扣率失败: ' + error.message);
        }
    }

    // 批量设置折扣率
    function setBulkDiscount() {
        const discountInput = document.getElementById('bulkDiscountValue');
        const discount = parseFloat(discountInput.value);

        if (isNaN(discount) || discount <= 0 || discount > 1) {
            alert('请输入有效的折扣率(0.01-1.0)');
            return;
        }

        const checkedBoxes = document.querySelectorAll('.member-product-checkbox:checked');
        if (checkedBoxes.length === 0) {
            alert('请先选择要设置折扣率的商品');
            return;
        }

        const productNames = Array.from(checkedBoxes).map(cb => cb.dataset.product);

        if (!confirm(`确定要为选中的 ${productNames.length} 个商品设置 ${(discount * 100).toFixed(0)}% 折扣吗？`)) {
            return;
        }

        try {
            MemberProductManager.setBulkMemberDiscount(productNames, discount);
            refreshMemberUI();
            alert(`成功为 ${productNames.length} 个商品设置折扣率！`);
        } catch (error) {
            alert('批量设置折扣率失败: ' + error.message);
        }
    }

    // 实时计算会员价
    function calculateMemberPrice() {
        const discountInput = document.getElementById('memberProductDiscount');
        const productSelect = document.getElementById('memberProductSelect');
        const discount = parseFloat(discountInput.value);

        if (!productSelect.value || isNaN(discount)) return;

        let originalPrice = 0;
        for (const [type, cat] of Object.entries(categories)) {
            const product = cat.list.find(p => p.name === productSelect.value);
            if (product) {
                originalPrice = product.price;
                break;
            }
        }

        if (originalPrice > 0) {
            const memberPrice = originalPrice * discount;
            console.log(`原价: ${originalPrice}, 折扣率: ${discount}, 会员价: ${memberPrice.toFixed(2)}`);
        }
    }

    // 验证折扣率输入
    function validateDiscountInput() {
        const input = this;
        let value = parseFloat(input.value);

        if (isNaN(value)) {
            input.value = '';
            return;
        }

        if (value < 0.01) {
            value = 0.01;
        } else if (value > 1.0) {
            value = 1.0;
        }

        input.value = value;
    }

    // 更新会员商品选项
    function updateMemberProductOptions() {
        const typeSelect = document.getElementById('memberProductType');
        const productSelect = document.getElementById('memberProductSelect');

        if (!typeSelect || !productSelect) return;

        const type = typeSelect.value;
        productSelect.innerHTML = '<option value="">选择商品</option>';

        if (type && categories[type]) {
            categories[type].list.forEach(product => {
                const option = document.createElement('option');
                option.value = product.name;
                option.textContent = `${product.name} (原价: ${product.price.toFixed(2)}元)`;
                productSelect.appendChild(option);
            });
        }

        const discountInput = document.getElementById('memberProductDiscount');
        if (discountInput) {
            discountInput.value = '0.9';
        }
    }

    // 处理会员搜索
    function handleMemberSearch(e) {
        const keyword = e.target.value.trim();
        const filteredMembers = MemberManager.searchMembers(keyword);
        updateMemberList(filteredMembers);
    }

    // 处理会员商品搜索
    function handleMemberProductSearch(e) {
        const keyword = e.target.value.trim();
        const filteredProducts = MemberProductManager.searchMemberProducts(keyword);
        updateMemberProductsList(filteredProducts);
    }

    // 更新会员列表
    function updateMemberList(members = null) {
        const list = document.getElementById('memberList');
        if (!list) return;

        const memberList = members || MemberManager.getAllMembers();
        list.innerHTML = '';

        if (memberList.length === 0) {
            list.innerHTML = '<tr><td colspan="7" class="empty-message">暂无会员数据</td></tr>';
            return;
        }

        memberList.forEach(member => {
            const defaultAddress = MemberManager.getDefaultAddress(member.id);
            const defaultAddressText = defaultAddress ? 
                (defaultAddress.address.length > 20 ? 
                 defaultAddress.address.substring(0, 20) + '...' : 
                 defaultAddress.address) : '无';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="text-align:center"><input type="checkbox" class="member-checkbox" data-id="${member.id}"></td>
                <td>${member.name}</td>
                <td>${member.phone}</td>
                <td style="text-align:center">${member.addresses.length}</td>
                <td title="${defaultAddress ? defaultAddress.address : ''}">${defaultAddressText}</td>
                <td>${member.joinDate}</td>
                <td style="text-align:center">
                    <button class="manage-address-btn" data-member-id="${member.id}" 
                            style="padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        管理地址
                    </button>
                </td>
            `;
            list.appendChild(row);
        });

        // 绑定地址管理按钮事件
        document.querySelectorAll('.manage-address-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const memberId = parseInt(this.dataset.memberId);
                openAddressManagementModal(memberId);
            });
        });
    }

    // 更新会员商品列表
    function updateMemberProductsList(products = null) {
        const list = document.getElementById('memberProductsList');
        if (!list) return;

        const productList = products || MemberProductManager.getAllMemberProducts();
        list.innerHTML = '';

        if (productList.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="empty-message">暂无会员商品</td></tr>';
            return;
        }

        productList.forEach(product => {
            const row = document.createElement('tr');
            const saving = product.originalPrice - product.memberPrice;
            const discountRate = (product.discount * 100).toFixed(0);

            row.innerHTML = `
                <td style="text-align:center"><input type="checkbox" class="member-product-checkbox" data-name="${product.name}"></td>
                <td>${product.icon} ${product.name}</td>
                <td>${product.originalPrice.toFixed(2)}元</td>
                <td class="member-price">${product.memberPrice.toFixed(2)}元</td>
                <td class="discount-editable" data-product="${product.name}">${discountRate}%</td>
            `;
            list.appendChild(row);
        });

        // 绑定折扣率编辑事件
        list.querySelectorAll('.discount-editable').forEach(el => {
            el.addEventListener('click', function() {
                editMemberDiscount(this);
            });
        });
    }

    // 编辑会员折扣率
    function editMemberDiscount(element) {
        const productName = element.dataset.product;
        const currentDiscount = MemberProductManager.getMemberDiscount(productName);

        const input = document.createElement('input');
        input.type = 'number';
        input.value = (currentDiscount * 100).toFixed(0);
        input.min = '1';
        input.max = '100';
        input.step = '1';
        input.style.width = '60px';
        input.style.textAlign = 'center';

        element.innerHTML = '';
        element.appendChild(input);
        input.focus();

        const save = () => {
            const discountPercent = parseFloat(input.value);
            if (isNaN(discountPercent) || discountPercent < 1 || discountPercent > 100) {
                alert('折扣率必须在1-100之间');
                refreshMemberUI();
                return;
            }

            const discount = discountPercent / 100;
            try {
                MemberProductManager.setMemberDiscount(productName, discount);
                refreshMemberUI();
            } catch (error) {
                alert('修改折扣率失败: ' + error.message);
                refreshMemberUI();
            }
        };

        input.addEventListener('blur', save);
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') save();
        });
    }

    // 验证会员身份
    function verifyMember() {
        const input = document.getElementById('verifyMemberInput');
        const nameOrPhone = input.value.trim();

        if (!nameOrPhone) {
            alert('请输入姓名或手机号');
            return;
        }

        const member = MemberManager.verifyMember(nameOrPhone);
        if (member) {
            updateMemberVerificationUI();
            recalculateCartForMember();

            if (typeof window.updateProductCards === 'function') {
                window.updateProductCards();
            }

            alert(`会员验证成功！欢迎 ${member.name}`);
        } else {
            alert('会员验证失败，请检查姓名或手机号是否正确');
        }
    }

    // 清除会员验证
    function clearMemberVerification() {
        MemberManager.clearCurrentMember();
        updateMemberVerificationUI();
        restoreCartToOriginalPrices();

        if (typeof window.updateProductCards === 'function') {
            window.updateProductCards();
        }
        
        alert('会员验证已清除');
    }

    // 为会员重新计算整个购物车
    function recalculateCartForMember() {
        console.log('为会员重新计算整个购物车...');

        if (selectedProducts.length === 0) {
            console.log('购物车为空，无需重新计算');
            return;
        }

        let updatedCount = 0;

        selectedProducts.forEach((item, index) => {
            if (!item.isDiscount) {
                const currentMember = MemberManager.getCurrentMember();
                if (currentMember && typeof MemberProductManager !== 'undefined') {
                    const memberPrice = MemberProductManager.getPriceForCurrentMember(item.name, item.originalPrice);

                    if (typeof memberPrice === 'number' && !isNaN(memberPrice) && memberPrice < item.originalPrice) {
                        const hasDiscountVersion = selectedProducts.some(p =>
                            p.isDiscount && p.originalProductName === item.name
                        );

                        if (!hasDiscountVersion) {
                            console.log(`为会员更新 ${item.name} 价格: ${item.price} -> ${memberPrice}`);
                            selectedProducts[index].price = memberPrice;
                            selectedProducts[index].total = memberPrice * item.weight;
                            updatedCount++;
                        } else {
                            console.log(`商品 ${item.name} 有特价版本在购物车中，保持原价`);
                        }
                    } else {
                        console.log(`商品 ${item.name} 没有会员优惠，保持原价`);
                    }
                }
            } else {
                console.log(`商品 ${item.name} 是特价商品，不应用会员价`);
            }
        });

        console.log(`为会员更新了 ${updatedCount} 个商品的价格`);

        if (typeof window.checkPriceConflicts === 'function') {
            window.checkPriceConflicts();
        }

        if (typeof window.updateProductList === 'function') {
            window.updateProductList();
        }
        if (typeof window.updateTotalPrice === 'function') {
            window.updateTotalPrice();
        }
    }

    // 恢复购物车中所有商品为原价
    function restoreCartToOriginalPrices() {
        console.log('恢复购物车中所有商品为原价...');

        if (selectedProducts.length === 0) {
            console.log('购物车为空，无需恢复');
            return;
        }

        let restoredCount = 0;

        selectedProducts.forEach((item, index) => {
            if (!item.isDiscount && item.originalPrice && item.price < item.originalPrice) {
                console.log(`恢复 ${item.name} 价格为原价: ${item.price} -> ${item.originalPrice}`);
                selectedProducts[index].price = item.originalPrice;
                selectedProducts[index].total = item.originalPrice * item.weight;
                restoredCount++;
            }
        });

        console.log(`恢复了 ${restoredCount} 个商品的原价`);

        if (typeof window.updateProductList === 'function') {
            window.updateProductList();
        }
        if (typeof window.updateTotalPrice === 'function') {
            window.updateTotalPrice();
        }
    }

    // 获取会员价格显示
    function getMemberPriceDisplay(productName, originalPrice) {
        const currentMember = MemberManager.getCurrentMember();
        if (!currentMember) return '';

        if (typeof originalPrice !== 'number' || isNaN(originalPrice)) {
            console.error('无效的商品价格:', productName, originalPrice);
            return '';
        }

        const memberPrice = MemberProductManager.getPriceForCurrentMember(productName, originalPrice);

        if (typeof memberPrice !== 'number' || isNaN(memberPrice)) {
            console.error('无效的会员价格计算:', productName, memberPrice);
            return '';
        }

        let isInCart = false;
        let hasMemberPriceInCart = false;
        if (typeof window.selectedProducts !== 'undefined') {
            const cartItem = selectedProducts.find(item =>
                item.name === productName && !item.isDiscount
            );
            if (cartItem) {
                isInCart = true;
                hasMemberPriceInCart = cartItem.price < cartItem.originalPrice;
            }
        }

        let hasDiscountVersion = false;
        if (typeof window.DiscountProductManager !== 'undefined') {
            const discountProduct = window.DiscountProductManager.getDiscountProductByOriginalName(productName);
            hasDiscountVersion = discountProduct && discountProduct.isActive;
        }

        let hasDiscountInCart = false;
        if (hasDiscountVersion && typeof window.selectedProducts !== 'undefined') {
            hasDiscountInCart = selectedProducts.some(item =>
                item.isDiscount && item.originalProductName === productName
            );
        }

        if (MemberProductManager.hasMemberDiscount(productName)) {
            const saving = originalPrice - memberPrice;
            const discount = MemberProductManager.hasMemberPrice(productName)
                ? MemberProductManager.getMemberDiscount(productName)
                : currentMember.discount;

            const discountRate = (discount * 100).toFixed(0);

            let statusNotice = '';
            if (isInCart) {
                if (hasMemberPriceInCart) {
                    statusNotice = `<div class="product-discount-notice" style="color: #4CAF50; font-size: 11px; margin-top: 2px;">✓ 已应用会员价</div>`;
                } else {
                    statusNotice = `<div class="product-discount-notice" style="color: #ff9800; font-size: 11px; margin-top: 2px;">⚠️ 购物车中未应用会员价</div>`;
                }
            } else if (hasDiscountInCart) {
                statusNotice = `<div class="product-discount-notice" style="color: #ff9800; font-size: 11px; margin-top: 2px;">⚠️ 已选择特价版本</div>`;
            } else if (hasDiscountVersion) {
                statusNotice = `<div class="product-discount-notice" style="color: #2196F3; font-size: 11px; margin-top: 2px;">🏷️ 有特价版本</div>`;
            }

            return `
            <div class="product-member-price">
                会员价: ${memberPrice.toFixed(2)}元
                <span class="product-saving">${discountRate}折 省${saving.toFixed(2)}元</span>
            </div>
            ${statusNotice}
        `;
        }

        if (hasDiscountVersion) {
            if (hasDiscountInCart) {
                return `<div class="product-discount-notice" style="color: #ff9800; font-size: 11px; margin-top: 2px;">⚠️ 已选择特价版本</div>`;
            } else {
                return `<div class="product-discount-notice" style="color: #2196F3; font-size: 11px; margin-top: 2px;">🏷️ 有特价版本</div>`;
            }
        }

        return '';
    }

    // 刷新会员UI
    function refreshMemberUI() {
        updateMemberList();
        updateMemberProductsList();
        updateMemberProductOptions();
    }

    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initMemberUI, 100);
    });

    // 暴露函数供其他模块调用
    window.MemberUI = {
        refresh: refreshMemberUI,
        getMemberPriceDisplay: getMemberPriceDisplay,
        recalculateCartForMember: recalculateCartForMember,
        restoreCartToOriginalPrices: restoreCartToOriginalPrices,
        openAddressManagementModal: openAddressManagementModal
    };

    console.log('会员UI模块加载完成 - 支持多地址');
})();