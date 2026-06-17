// inventoryDataFix.js - Fix for inventory data not loading in admin dashboard

const API_CONFIG = {
    GATEWAY_URL: 'http://localhost:9999',
    AUTH_SERVER_URL: 'http://localhost:2000'
};

// Get auth headers with admin role
function getAuthHeaders() {
    const isAdminSession = sessionStorage.getItem('isAdminSession') === 'true';
    const token = isAdminSession
        ? sessionStorage.getItem('adminToken')
        : (localStorage.getItem('authToken') || localStorage.getItem('token'));
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-User-Role': 'ADMIN'
    };
}

// Enhanced inventory data fetching with multiple fallback strategies
export async function fetchInventoryData() {
    console.log('🔄 Starting inventory data fetch...');
    
    // Strategy 1: Try Warehouse Inventory API (for putaway-based inventory)
    try {
        console.log('📡 Trying Warehouse Inventory API...');
        const warehouseResponse = await fetch(`${API_CONFIG.GATEWAY_URL}/api/warehouse/inventory`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (warehouseResponse.ok) {
            const data = await warehouseResponse.json();
            console.log('✅ Warehouse Inventory success:', data?.length || 0, 'items');
            return { success: true, data: Array.isArray(data) ? data : [] };
        } else {
            console.log('⚠️ Warehouse Inventory failed:', warehouseResponse.status);
        }
    } catch (error) {
        console.log('⚠️ Warehouse Inventory error:', error.message);
    }
    
    // Strategy 2: Fallback to old inventory API (for backward compatibility)
    try {
        console.log('📡 Trying API Gateway (fallback)...');
        const gatewayResponse = await fetch(`${API_CONFIG.GATEWAY_URL}/api/auth/admin/inventory`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (gatewayResponse.ok) {
            const data = await gatewayResponse.json();
            console.log('✅ Gateway success:', data?.length || 0, 'items');
            return { success: true, data: Array.isArray(data) ? data : [] };
        } else {
            console.log('⚠️ Gateway failed:', gatewayResponse.status);
            return {
                success: false,
                error: `Server returned ${gatewayResponse.status}: ${gatewayResponse.statusText}. Check that the inventory service is running.`
            };
        }
    } catch (error) {
        console.log('⚠️ Gateway error:', error.message);
        return {
            success: false,
            error: `Cannot reach API Gateway at ${API_CONFIG.GATEWAY_URL}. Make sure the gateway and inventory service are running.`
        };
    }
}

// Test backend services connectivity
export async function testBackendServices() {
    const results = {
        gateway: false,
        inventory: false,
        details: {}
    };
    
    // Test API Gateway
    try {
        const gatewayResponse = await fetch(`${API_CONFIG.GATEWAY_URL}/actuator/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        results.gateway = gatewayResponse.ok;
        results.details.gateway = gatewayResponse.status;
    } catch (error) {
        results.details.gateway = error.message;
    }
    
    // Test Inventory Service (via gateway)
    try {
        const inventoryResponse = await fetch(`${API_CONFIG.GATEWAY_URL}/api/auth/admin/inventory/test`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        results.inventory = inventoryResponse.ok;
        results.details.inventory = inventoryResponse.status;
    } catch (error) {
        results.details.inventory = error.message;
    }
    
    return results;
}

// Add test inventory data
export async function addTestInventoryData() {
    const testItems = [
        {
            productId: 1,
            categoryId: 1,
            subcategoryId: 1,
            barcode: `TEST${Date.now()}001`,
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
        }
    ];
    
    // Try API Gateway first
    try {
        const response = await fetch(`${API_CONFIG.GATEWAY_URL}/api/auth/admin/inventory/add`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(testItems[0])
        });
        
        if (response.ok) {
            const result = await response.json();
            return { success: true, data: result };
        }
    } catch (error) {
        console.log('Gateway add failed:', error.message);
    }
    
    return { success: false, error: 'Could not add test data - gateway not available' };
}

// Service status checker
export function getServiceStatus() {
    return {
        expectedServices: [
            { name: 'API Gateway', url: 'http://localhost:9999', port: 9999 },
            { name: 'Service Registry', url: 'http://localhost:8761', port: 8761 },
            { name: 'Inventory Service', url: 'http://localhost:9093', port: 9093 },
            { name: 'Products Service', url: 'http://localhost:9094', port: 9094 },
            { name: 'Auth Server', url: 'http://localhost:9090', port: 9090 }
        ],
        troubleshooting: [
            'Check if MySQL is running on port 3306',
            'Verify inventoryDB database exists',
            'Start Service Registry first (port 8761)',
            'Start API Gateway (port 9999)',
            'Start Inventory Service (port 9093)',
            'Check application.properties files for correct database configuration'
        ]
    };
}