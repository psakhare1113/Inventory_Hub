// inventory-direct-fix.js - Routes all calls through the API Gateway to avoid CORS

console.log('🚀 Starting Inventory Fix...');

// Configuration
const DIRECT_API = 'http://localhost:9999'; // Use gateway to avoid CORS
const GATEWAY_API = 'http://localhost:9999';

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'X-User-Role': 'ADMIN'
    };
}

// Test inventory service via gateway
async function testDirectInventoryService() {
    console.log('🧪 Testing inventory service via gateway...');
    
    try {
        const response = await fetch(`${GATEWAY_API}/api/auth/admin/inventory/test`, {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Inventory service working:', data);
            return true;
        } else {
            console.error('❌ Service test failed:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Service connection failed:', error.message);
        return false;
    }
}

// Fetch inventory data via gateway
async function fetchInventoryDirectly() {
    console.log('📦 Fetching inventory data via gateway...');
    
    try {
        const response = await fetch(`${GATEWAY_API}/api/auth/admin/inventory`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Inventory data:', data);
            return { success: true, data: data };
        } else {
            const errorText = await response.text();
            console.error('❌ API failed:', response.status, errorText);
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }
    } catch (error) {
        console.error('❌ Fetch failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Add test data via gateway
async function addTestDataDirectly() {
    console.log('➕ Adding test data via gateway...');
    
    const testItems = [
        {
            productId: 1,
            categoryId: 1,
            subcategoryId: 1,
            barcode: `DIRECT${Date.now()}001`,
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
            barcode: `DIRECT${Date.now()}002`,
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
            const response = await fetch(`${GATEWAY_API}/api/auth/admin/inventory/add`, {
                method: 'POST',
                headers: getAuthHeaders(),
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
    
    return successCount;
}

// Populate table with inventory data
function populateInventoryTableDirect(inventoryData) {
    console.log('📊 Populating table with', inventoryData.length, 'items');
    
    const tableBody = document.getElementById('inventory-table-body');
    
    if (!tableBody) {
        console.error('❌ Table body element not found!');
        alert('❌ Table element not found. Make sure you are on the inventory page.');
        return false;
    }
    
    if (inventoryData && inventoryData.length > 0) {
        let html = '';
        
        inventoryData.forEach((item, index) => {
            html += `
                <tr style="border-bottom: 1px solid #dee2e6;">
                    <td style="padding: 12px;">${item.id || index + 1}</td>
                    <td style="padding: 12px; font-family: monospace; background: #f8f9fa;">${item.barcode || 'N/A'}</td>
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
                        <button onclick="editInventoryItem('${item.barcode}')" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 4px; font-size: 12px;">
                            ✏️ Edit
                        </button>
                        <button onclick="viewInventoryItem('${item.barcode}')" style="background: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            👁️ View
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        console.log(`✅ Table populated successfully with ${inventoryData.length} items!`);
        
        // Show success message
        showSuccessMessage(`🎉 Successfully loaded ${inventoryData.length} inventory items!`);
        
        return true;
    } else {
        // Show empty state with actions
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 30px; color: #0066cc;">
                        <h5 style="margin-bottom: 15px;">📦 No Inventory Items Found</h5>
                        <p style="margin-bottom: 20px;">Your inventory database is empty. Add some items to get started!</p>
                        <div style="margin-top: 20px;">
                            <button onclick="addTestDataAndRefresh()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; margin-right: 10px; font-weight: bold;">
                                📦 Add Test Data
                            </button>
                            <button onclick="refreshInventoryTable()" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                                🔄 Refresh
                            </button>
                            <button onclick="testDirectInventoryService().then(result => alert(result ? '✅ Service Working!' : '❌ Service Failed!'))" style="background: #17a2b8; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer;">
                                🧪 Test Service
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        
        console.log('ℹ️ No inventory data found - showing empty state');
        return false;
    }
}

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

// Show success message
function showSuccessMessage(message) {
    console.log('✅', message);
    
    // Create and show toast-like notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Show error message
function showErrorMessage(message) {
    console.error('❌', message);
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 500;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Main function to refresh inventory table
async function refreshInventoryTable() {
    console.log('🔄 Refreshing inventory table...');
    
    const tableBody = document.getElementById('inventory-table-body');
    
    if (!tableBody) {
        showErrorMessage('Table element not found. Make sure you are on the inventory page.');
        return;
    }
    
    // Show loading
    tableBody.innerHTML = `
        <tr>
            <td colspan="10" style="text-align: center; padding: 40px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin: 0; color: #666;">Loading inventory data...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Test service first
    const serviceWorking = await testDirectInventoryService();
    
    if (!serviceWorking) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; color: #721c24;">
                        <h5 style="margin-bottom: 15px;">❌ Inventory Service Not Available</h5>
                        <p style="margin-bottom: 10px;">Cannot connect to inventory service via API Gateway.</p>
                        <div style="text-align: left; margin: 15px 0;">
                            <strong>Please check:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>API Gateway is running on port 9999</li>
                                <li>Inventory service is running on port 9093</li>
                                <li>MySQL database is running on port 3306</li>
                                <li>Database 'inventoryDB' exists</li>
                            </ul>
                        </div>
                        <button onclick="refreshInventoryTable()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                            🔄 Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
        showErrorMessage('Inventory service is not available. Please check if the API Gateway (port 9999) and Inventory Service (port 9093) are running.');
        return;
    }
    
    // Fetch data
    const result = await fetchInventoryDirectly();
    
    if (result.success) {
        populateInventoryTableDirect(result.data);
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; color: #721c24;">
                        <h5 style="margin-bottom: 15px;">❌ Failed to Load Inventory Data</h5>
                        <p style="margin-bottom: 15px;">${result.error}</p>
                        <div style="margin-top: 20px;">
                            <button onclick="refreshInventoryTable()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                                🔄 Retry
                            </button>
                            <button onclick="addTestDataAndRefresh()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                                📦 Add Test Data
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        showErrorMessage(`Failed to load inventory: ${result.error}`);
    }
}

// Add test data and refresh
async function addTestDataAndRefresh() {
    console.log('➕ Adding test data and refreshing...');
    
    showSuccessMessage('Adding test data...');
    
    const successCount = await addTestDataDirectly();
    
    if (successCount > 0) {
        showSuccessMessage(`✅ Added ${successCount} test items successfully!`);
        setTimeout(() => {
            refreshInventoryTable();
        }, 1000);
    } else {
        showErrorMessage('❌ Failed to add test data. Please check server logs.');
    }
}

// Placeholder functions for edit/view
function editInventoryItem(barcode) {
    console.log('Edit inventory item:', barcode);
    alert(`Edit functionality for barcode: ${barcode}\n(Not implemented yet)`);
}

function viewInventoryItem(barcode) {
    console.log('View inventory item:', barcode);
    alert(`View functionality for barcode: ${barcode}\n(Not implemented yet)`);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.refreshInventoryTable = refreshInventoryTable;
window.addTestDataAndRefresh = addTestDataAndRefresh;
window.testDirectInventoryService = testDirectInventoryService;
window.fetchInventoryDirectly = fetchInventoryDirectly;
window.addTestDataDirectly = addTestDataDirectly;
window.editInventoryItem = editInventoryItem;
window.viewInventoryItem = viewInventoryItem;

// Auto-run if on inventory page
if (document.getElementById('inventory-table-body')) {
    console.log('🎯 Inventory table found - auto-refreshing...');
    refreshInventoryTable();
} else {
    console.log('ℹ️ Inventory table not found. Run refreshInventoryTable() manually when on inventory page.');
}

console.log('✅ Inventory Fix loaded successfully!');
console.log('📋 Available functions:');
console.log('  - refreshInventoryTable()');
console.log('  - addTestDataAndRefresh()');
console.log('  - testDirectInventoryService()');

export {
    refreshInventoryTable,
    addTestDataAndRefresh,
    testDirectInventoryService,
    fetchInventoryDirectly,
    addTestDataDirectly
};