// INSTANT INVENTORY FIX - Routes through API Gateway to avoid CORS

console.log('🚀 INSTANT INVENTORY FIX STARTING...');

// Direct API test and fix
(async function instantInventoryFix() {
    
    // Configuration - use gateway to avoid CORS
    const DIRECT_API = 'http://localhost:9999';
    const AUTH_HEADERS = {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('authToken') && { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }),
        'X-User-Role': 'ADMIN'
    };
    
    // Helper function for status colors
    function getStatusColor(status) {
        switch(status?.toUpperCase()) {
            case 'AVAILABLE': return '#28a745';
            case 'ENABLED': return '#28a745';
            case 'ACTIVE': return '#28a745';
            case 'RESERVED': return '#ffc107';
            case 'SOLD': return '#6c757d';
            case 'DISABLED': return '#dc3545';
            case 'INACTIVE': return '#dc3545';
            default: return '#6c757d';
        }
    }
    
    // Show loading in table
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) {
        alert('❌ Inventory table not found! Make sure you are on the inventory page.');
        return;
    }
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="10" style="text-align: center; padding: 40px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin: 0; color: #666; font-weight: bold;">🔄 INSTANT FIX IN PROGRESS...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Add CSS for animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    console.log('🧪 Step 1: Testing inventory service via gateway...');
    
    // Test via gateway
    try {
        const testResponse = await fetch(`${DIRECT_API}/api/auth/admin/inventory/test`, {
            headers: AUTH_HEADERS
        });
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('✅ Direct service working:', testData);
        } else {
            console.log('⚠️ Service test failed, but continuing...');
        }
    } catch (error) {
        console.log('⚠️ Service test error:', error.message);
    }
    
    console.log('📦 Step 2: Fetching inventory data...');
    
    // Try to fetch inventory data via gateway
    try {
        const response = await fetch(`${DIRECT_API}/api/auth/admin/inventory`, {
            headers: AUTH_HEADERS
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Inventory data received:', data);
            
            if (data && data.length > 0) {
                // Populate table with real data
                let html = '';
                
                data.forEach((item, index) => {
                    html += `
                        <tr style="border-bottom: 1px solid #dee2e6; transition: background-color 0.2s;">
                            <td style="padding: 12px; font-weight: 500;">${item.id || index + 1}</td>
                            <td style="padding: 12px; font-family: 'Courier New', monospace; background: #f8f9fa; border-radius: 4px;">${item.barcode || 'N/A'}</td>
                            <td style="padding: 12px;">${item.productId || 'N/A'}</td>
                            <td style="padding: 12px; color: #28a745; font-weight: bold;">₹${(item.mrp || 0).toFixed(2)}</td>
                            <td style="padding: 12px; color: #007bff; font-weight: bold;">₹${(item.sellingPrice || 0).toFixed(2)}</td>
                            <td style="padding: 12px; color: #6c757d;">₹${(item.buyPrice || 0).toFixed(2)}</td>
                            <td style="padding: 12px;">${item.conditionStatus || 'N/A'}</td>
                            <td style="padding: 12px;">
                                <span style="background: ${getStatusColor(item.inventoryStatus)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                    ${item.inventoryStatus || 'N/A'}
                                </span>
                            </td>
                            <td style="padding: 12px;">
                                <span style="background: ${getStatusColor(item.platformStatus)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                    ${item.platformStatus || 'N/A'}
                                </span>
                            </td>
                            <td style="padding: 12px;">
                                <button onclick="alert('Edit: ${item.barcode}')" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 4px; font-size: 12px; transition: all 0.2s;">
                                    ✏️ Edit
                                </button>
                                <button onclick="alert('View: ${item.barcode}')" style="background: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                                    👁️ View
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                tableBody.innerHTML = html;
                
                // Show success notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #28a745, #20c997);
                    color: white;
                    padding: 20px 25px;
                    border-radius: 8px;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
                    z-index: 10000;
                    font-weight: 600;
                    font-size: 16px;
                    animation: slideIn 0.3s ease;
                `;
                notification.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🎉</span>
                        <div>
                            <div>SUCCESS!</div>
                            <div style="font-size: 14px; opacity: 0.9;">Loaded ${data.length} inventory items</div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 4000);
                
                console.log(`🎉 SUCCESS! Table populated with ${data.length} items!`);
                
            } else {
                // No data found - show add test data option
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 40px;">
                            <div style="background: linear-gradient(135deg, #e7f3ff, #cce7ff); border: 2px solid #b3d9ff; border-radius: 12px; padding: 30px; color: #0066cc;">
                                <div style="font-size: 48px; margin-bottom: 15px;">📦</div>
                                <h5 style="margin-bottom: 15px; font-size: 20px;">No Inventory Items Found</h5>
                                <p style="margin-bottom: 25px; font-size: 16px;">Your inventory database is empty. Let's add some test data!</p>
                                <button onclick="addTestDataInstant()" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: all 0.2s;">
                                    🚀 Add Test Data Now
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                
                // Define addTestDataInstant function
                window.addTestDataInstant = async function() {
                    console.log('➕ Adding test data instantly...');
                    
                    const testItems = [
                        {
                            productId: 1,
                            categoryId: 1,
                            subcategoryId: 1,
                            barcode: `INSTANT${Date.now()}001`,
                            warehouseId: 1,
                            inventoryStatus: "AVAILABLE",
                            platformStatus: "ENABLED",
                            conditionStatus: "NEW",
                            mrp: 1000.00,
                            showroomPrice: 950.00,
                            buyPrice: 800.00,
                            sellingPrice: 900.00,
                            stockSource: "SUPPLIER",
                            isCustomerReturned: false,
                            isWarehouseDamaged: false,
                            createdBy: 1,
                            updatedBy: 1
                        },
                        {
                            productId: 2,
                            categoryId: 1,
                            subcategoryId: 1,
                            barcode: `INSTANT${Date.now()}002`,
                            warehouseId: 1,
                            inventoryStatus: "AVAILABLE",
                            platformStatus: "ENABLED",
                            conditionStatus: "NEW",
                            mrp: 1500.00,
                            showroomPrice: 1400.00,
                            buyPrice: 1200.00,
                            sellingPrice: 1350.00,
                            stockSource: "SUPPLIER",
                            isCustomerReturned: false,
                            isWarehouseDamaged: false,
                            createdBy: 1,
                            updatedBy: 1
                        }
                    ];
                    
                    let successCount = 0;
                    
                    for (const item of testItems) {
                        try {
                            const response = await fetch(`${DIRECT_API}/api/auth/admin/inventory/add`, {
                                method: 'POST',
                                headers: AUTH_HEADERS,
                                body: JSON.stringify(item)
                            });
                            
                            if (response.ok) {
                                const result = await response.json();
                                console.log('✅ Added item:', result);
                                successCount++;
                            } else {
                                const errorText = await response.text();
                                console.error('❌ Failed to add item:', errorText);
                            }
                        } catch (error) {
                            console.error('❌ Error adding item:', error);
                        }
                    }
                    
                    if (successCount > 0) {
                        alert(`✅ Added ${successCount} test items! Refreshing page...`);
                        location.reload();
                    } else {
                        alert('❌ Failed to add test data. Please check server logs.');
                    }
                };
                
                console.log('ℹ️ No inventory data found - showing add test data option');
            }
            
        } else {
            // API error
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px;">
                        <div style="background: #f8d7da; border: 2px solid #f5c6cb; border-radius: 12px; padding: 30px; color: #721c24;">
                            <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                            <h5 style="margin-bottom: 15px;">API Error ${response.status}</h5>
                            <p style="margin-bottom: 20px;">${errorText}</p>
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0; color: #856404;">
                                <strong>Troubleshooting:</strong>
                                <ul style="margin: 10px 0; padding-left: 20px; text-align: left;">
                                    <li>Check if MySQL is running on port 3306</li>
                                    <li>Verify inventoryDB database exists</li>
                                    <li>Ensure Inventory Service is running on port 9093</li>
                                    <li>Check server logs for detailed error information</li>
                                </ul>
                            </div>
                            <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                🔄 Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        // Network error
        console.error('❌ Network Error:', error);
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    <div style="background: #f8d7da; border: 2px solid #f5c6cb; border-radius: 12px; padding: 30px; color: #721c24;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🔌</div>
                        <h5 style="margin-bottom: 15px;">Connection Failed</h5>
                        <p style="margin-bottom: 20px;">Cannot connect to inventory service: ${error.message}</p>
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0; color: #856404;">
                            <strong>Please check:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px; text-align: left;">
                                <li>API Gateway is running on <code>http://localhost:9999</code></li>
                                <li>Inventory service is running on port 9093</li>
                                <li>No firewall blocking the connection</li>
                                <li>Service is properly configured</li>
                            </ul>
                        </div>
                        <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                            🔄 Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    console.log('✅ INSTANT INVENTORY FIX COMPLETED!');
    
})();

// Add slide-in animation
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(animationStyle);