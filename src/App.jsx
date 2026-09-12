import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Scan, Plus, Minus, Trash2, BarChart3, RefreshCw, AlertCircle, Search, Wallet, RotateCcw, Printer } from 'lucide-react';
import { API_BASE } from './config';
import { getAuthToken, clearAuthToken } from './lib/auth';
import BarcodeLabel from './components/BarcodeLabel';
import LabelPrintSheet from './components/LabelPrintSheet';
import './label-print.css';
const GarmentsPOSSystem = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [activeTab, setActiveTab] = useState('billing');
  const [bills, setBills] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [cartDiscount, setCartDiscount] = useState('');
  const [openCredits, setOpenCredits] = useState([]);
  const [selectedOpenCreditId, setSelectedOpenCreditId] = useState('');
  const [returnSale, setReturnSale] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnNote, setReturnNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelSearchTerm, setLabelSearchTerm] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState({});
  const [labelsToPrint, setLabelsToPrint] = useState([]);

  // Stock management states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    size: '',
    color: '',
    price: '',
    stock: '',
    barcode: '',
    category: '',
    brand: ''
  });
  const [bulkImportData, setBulkImportData] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);



  // API Helper Functions
  const apiCall = async (endpoint, options = {}) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        ...options,
      });

      if (response.status === 401) {
        clearAuthToken();
        navigate('/login');
        throw new Error('Session expired');
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error || `API Error: ${response.status}`;
        throw new Error(message);
      }

      return data;
    } catch (err) {
      console.error('API call failed:', err);
      setError(err.message || 'API request failed');
      throw err;
    }
  };

  // Load initial data
  useEffect(() => {
    loadInventory();
    loadSalesHistory();
    loadOpenCredits();
    loadAnalytics();
    loadCategories();
    loadBrands();
  }, []);

  const loadCategories = async () => {
    try {
      const categoryList = await apiCall('/categories');
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadBrands = async () => {
    try {
      const brandList = await apiCall('/brands');
      setBrands(brandList);
    } catch (err) {
      console.error('Failed to load brands:', err);
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const products = await apiCall('/products');
      setInventory(products);
      setError('');
    } catch (err) {
      setError('Failed to load inventory. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesHistory = async () => {
    try {
      const sales = await apiCall('/sales');
      setBills(sales);
    } catch (err) {
      console.error('Failed to load sales history:', err);
    }
  };

  const loadOpenCredits = async () => {
    try {
      const credits = await apiCall('/open-credits?status=open');
      setOpenCredits(credits);
    } catch (err) {
      console.error('Failed to load open credits:', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await apiCall('/analytics');
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  // Add item to cart by barcode
  const addToCartByBarcode = async () => {
    if (!barcodeInput.trim()) return;

    setLoading(true);
    try {
      const item = await apiCall(`/products/barcode/${barcodeInput}`);

      if (item.stock > 0) {
        const existingCartItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingCartItem) {
          if (existingCartItem.quantity < item.stock) {
            setCart(cart.map(cartItem =>
              cartItem.id === item.id
                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                : cartItem
            ));
          } else {
            setError('Insufficient stock!');
          }
        } else {
          setCart([...cart, { ...item, quantity: 1 }]);
        }
        setBarcodeInput('');
        setError('');
      } else {
        setError('Item is out of stock!');
      }
    } catch (err) {
      setError('Item not found or server error!');
    } finally {
      setLoading(false);
    }
  };

  // Update cart item quantity
  const updateCartQuantity = (id, change) => {
    const item = inventory.find(item => item.id === id);
    setCart(cart.map(cartItem => {
      if (cartItem.id === id) {
        const newQuantity = cartItem.quantity + change;
        if (newQuantity <= 0) {
          return null;
        }
        if (newQuantity > item.stock) {
          setError('Insufficient stock!');
          return cartItem;
        }
        setError('');
        return { ...cartItem, quantity: newQuantity };
      }
      return cartItem;
    }).filter(Boolean));
  };

  // Remove item from cart
  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartDiscountAmount = () => {
    const discount = parseFloat(cartDiscount) || 0;
    return Math.max(0, discount);
  };

  const getSelectedCreditAmount = () => {
    if (!selectedOpenCreditId) return 0;
    const credit = openCredits.find(c => String(c.id) === String(selectedOpenCreditId));
    return credit ? credit.amount : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = getCartDiscountAmount();
    const credit = getSelectedCreditAmount();
    return Math.max(0, Math.round((subtotal - discount - credit) * 100) / 100);
  };

  const openReturnModal = (bill) => {
    const quantities = {};
    bill.items.forEach(item => {
      const remaining = item.quantity - (item.returnedQuantity || 0);
      if (remaining > 0) {
        quantities[item.id] = 0;
      }
    });
    if (Object.keys(quantities).length === 0) {
      setError('All items on this bill have already been returned');
      return;
    }
    setReturnSale(bill);
    setReturnQuantities(quantities);
    setReturnNote('');
    setError('');
  };

  const closeReturnModal = () => {
    setReturnSale(null);
    setReturnQuantities({});
    setReturnNote('');
  };

  const processReturn = async () => {
    if (!returnSale) return;

    const items = Object.entries(returnQuantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([productId, qty]) => ({ productId: Number(productId), quantity: Number(qty) }));

    if (items.length === 0) {
      setError('Select at least one item to return');
      return;
    }

    setLoading(true);
    try {
      const result = await apiCall(`/sales/${returnSale.id}/returns`, {
        method: 'POST',
        body: JSON.stringify({ items, note: returnNote.trim() || null }),
      });
      await loadInventory();
      await loadSalesHistory();
      await loadOpenCredits();
      closeReturnModal();
      setError('');
      alert(`Return recorded. Store credit ₹${result.creditAmount} added.`);
    } catch (err) {
      // error already set by apiCall
    } finally {
      setLoading(false);
    }
  };

  const markCreditUsed = async (creditId) => {
    if (!window.confirm('Mark this credit as used?')) return;

    setLoading(true);
    try {
      await apiCall(`/open-credits/${creditId}/mark-used`, { method: 'PATCH' });
      if (String(selectedOpenCreditId) === String(creditId)) {
        setSelectedOpenCreditId('');
      }
      await loadOpenCredits();
      setError('');
    } catch (err) {
      // error already set by apiCall
    } finally {
      setLoading(false);
    }
  };

  // Process sale and update database
  const processSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty!');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        items: cart,
        total: calculateTotal(),
        cartDiscount: getCartDiscountAmount(),
        customerName: customerName.trim() || null,
        openCreditId: selectedOpenCreditId ? Number(selectedOpenCreditId) : undefined
      };

      await apiCall('/sales', {
        method: 'POST',
        body: JSON.stringify(saleData),
      });

      // Refresh data
      await loadInventory();
      await loadSalesHistory();
      await loadOpenCredits();
      await loadAnalytics();

      // Clear cart and customer name
      setCart([]);
      setCustomerName('');
      setCartDiscount('');
      setSelectedOpenCreditId('');
      setError('');
      alert('Sale completed successfully!');
    } catch (err) {
      setError('Failed to process sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      loadInventory(),
      loadSalesHistory(),
      loadOpenCredits(),
      loadAnalytics(),
      loadCategories(),
      loadBrands()
    ]);
    setLoading(false);
  };

  const generateBarcodeAtServer = async () => {
    try {
      const barcode = await apiCall('/barcode/generate', {
        method: 'POST',
      });
      //setCategories(categoryList);
      return barcode.barcode;
    } catch (err) {
      console.error('Failed to generate barcode:', err);
    }
  };

  // Add new product
  const addNewProduct = async () => {
    if (!newProduct.name || !newProduct.size || !newProduct.price || !newProduct.stock || !newProduct.category) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      var barcode = await generateBarcodeAtServer();
      const productData = {
        ...newProduct,
        barcode: newProduct.barcode || barcode,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock)
      };

      await apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });

      setNewProduct({
        name: '',
        size: '',
        color: '',
        price: '',
        stock: '',
        barcode: '',
        category: '',
        brand: ''
      });
      setShowAddProduct(false);
      await refreshData();
      setError('');
      alert('Product added successfully!');
    } catch (err) {
      setError('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  // Restock existing product
  const restockProduct = async (productId, additionalStock) => {
    if (!additionalStock || additionalStock <= 0) {
      setError('Please enter a valid stock quantity');
      return;
    }

    setLoading(true);
    try {
      await apiCall(`/products/${productId}/restock`, {
        method: 'PUT',
        body: JSON.stringify({ additionalStock: parseInt(additionalStock) }),
      });

      await loadInventory();
      setError('');
      alert('Stock updated successfully!');
    } catch (err) {
      setError('Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal for a product
  const openEditProduct = (product) => {
    setEditingProduct({ ...product });
  };

  // Save edited product to server
  const saveEditedProduct = async () => {
    if (!editingProduct) return;

    // Basic validation
    if (!editingProduct.name || !editingProduct.size || !editingProduct.price || editingProduct.stock === undefined) {
      setError('Please fill required fields (name, size, price, stock)');
      return;
    }

    setLoading(true);
    try {
      const updated = {
        name: editingProduct.name,
        size: editingProduct.size,
        color: editingProduct.color,
        price: parseFloat(editingProduct.price),
        stock: parseInt(editingProduct.stock, 10),
        barcode: editingProduct.barcode,
        category: editingProduct.category,
        brand: editingProduct.brand
      };

      await apiCall(`/products/barcode/${editingProduct.barcode}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });

      setEditingProduct(null);
      await loadInventory();
      setError('');
      alert('Product updated successfully!');
    } catch (err) {
      setError('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

 const bulkImportProducts = async () => {
  if (!bulkImportData.trim()) {
    setError('Please enter product data');
    return;
  }

  try {
    setLoading(true);
    
    // Parse CSV-like data
    const lines = bulkImportData.trim().split('\n');
    const products = [];
    for (const [index, line] of lines.entries()) {
      const [name, size, color, price, stock, barcode, category, brand] =
        line.split(',').map(item => item.trim());

      const barCodeFromServer = barcode || await generateBarcodeAtServer(); // wait one at a time

      if (!name || !size || !price || !stock || !category || !barCodeFromServer) {
        throw new Error(`Row ${index + 1}: Missing required fields`);
      }

      products.push({
        name,
        size,
        color: color || 'Mixed',
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        barcode: barCodeFromServer,
        category,
        brand: brand || 'Generic',
      });
    }

    // Send to API
    await apiCall('/products/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ products }),
    });

    // Success cleanup
    setBulkImportData('');
    setShowBulkImport(false);
    await refreshData();
    setError('');
    alert(`Successfully imported ${products.length} products!`);
    
  } catch (err) {
    setError(err.message || 'Failed to import products');
  } finally {
    setLoading(false);
  }
};

  // Filter inventory based on search term
const filteredInventory = inventory.filter(item => {
  const matchesSearch = searchTerm === '' || 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.size.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesSearch;
});

  const filteredLabelInventory = inventory.filter(item => {
    const term = labelSearchTerm.toLowerCase();
    return labelSearchTerm === '' ||
      item.name.toLowerCase().includes(term) ||
      item.size.toLowerCase().includes(term) ||
      item.barcode.includes(labelSearchTerm);
  });

  const toggleProductForPrint = (productId) => {
    setSelectedForPrint(prev => {
      if (prev[productId]) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: 1 };
    });
  };

  const updatePrintCopies = (productId, copies) => {
    const count = Math.max(1, parseInt(copies, 10) || 1);
    setSelectedForPrint(prev => ({ ...prev, [productId]: count }));
  };

  const selectAllVisibleForPrint = () => {
    const allSelected = filteredLabelInventory.every(item => selectedForPrint[item.id]);
    if (allSelected) {
      setSelectedForPrint(prev => {
        const next = { ...prev };
        filteredLabelInventory.forEach(item => delete next[item.id]);
        return next;
      });
    } else {
      setSelectedForPrint(prev => {
        const next = { ...prev };
        filteredLabelInventory.forEach(item => {
          if (!next[item.id]) next[item.id] = 1;
        });
        return next;
      });
    }
  };

  const buildPrintLabels = () => {
    const labels = [];
    inventory.forEach(item => {
      const copies = selectedForPrint[item.id];
      if (copies && copies > 0) {
        for (let i = 0; i < copies; i++) {
          labels.push(item);
        }
      }
    });
    return labels;
  };

  const handlePrintLabels = () => {
    const labels = buildPrintLabels();
    if (labels.length === 0) return;
    setLabelsToPrint(labels);
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 100);
    });
  };

  const selectedLabelCount = Object.values(selectedForPrint).reduce((sum, n) => sum + n, 0);
  const previewLabels = buildPrintLabels();

  return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Readymade Garments POS System
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              clearAuthToken();
              navigate('/login');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-semibold mb-4">Edit Product</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Product Name *"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Size *"
                    value={editingProduct.size}
                    onChange={(e) => setEditingProduct({ ...editingProduct, size: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Color"
                    value={editingProduct.color}
                    onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Price *"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Stock *"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category *</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Brand"
                    value={editingProduct.brand}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Barcode"
                    value={editingProduct.barcode}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={saveEditedProduct}
                  disabled={loading}
                  className="w-full sm:flex-1 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="w-full sm:flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      

      {/* Navigation Tabs */}
  <div className="flex flex-col sm:flex-row mb-6 bg-white rounded-lg shadow-sm">
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex-1 py-3 px-6 text-center font-medium rounded-l-lg transition-colors ${activeTab === 'billing' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <ShoppingCart className="inline mr-2" size={20} />
          Billing
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 py-3 px-6 text-center font-medium transition-colors ${activeTab === 'stock' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Package className="inline mr-2" size={20} />
          Stock Management
        </button>
        <button
          onClick={() => setActiveTab('labels')}
          className={`flex-1 py-3 px-6 text-center font-medium transition-colors ${activeTab === 'labels' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Printer className="inline mr-2" size={20} />
          Labels
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-3 px-6 text-center font-medium transition-colors ${activeTab === 'inventory' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <BarChart3 className="inline mr-2" size={20} />
          View Inventory
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-3 px-6 text-center font-medium transition-colors ${activeTab === 'sales' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Scan className="inline mr-2" size={20} />
          Sales History
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-3 px-6 text-center font-medium rounded-r-lg transition-colors ${activeTab === 'analytics' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <BarChart3 className="inline mr-2" size={20} />
          Analytics
        </button>
      </div>

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div>
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="text-amber-700" size={20} />
              <h2 className="text-lg font-semibold text-amber-900">Open Store Credits</h2>
            </div>
            {openCredits.length === 0 ? (
              <p className="text-sm text-amber-800">No open credits — nothing to remember.</p>
            ) : (
              <div className="space-y-2">
                {openCredits.map(credit => (
                  <div key={credit.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-lg p-3 border border-amber-100">
                    <div className="text-sm text-gray-800">
                      <span className="font-semibold text-amber-900">₹{credit.amount}</span>
                      <span className="text-gray-600"> — Bill #{credit.saleId}</span>
                      {credit.customerName && <span className="text-blue-600"> ({credit.customerName})</span>}
                      {credit.note && <span className="block text-gray-500">{credit.note}</span>}
                      <span className="block text-xs text-gray-400">{new Date(credit.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => markCreditUsed(credit.id)}
                      disabled={loading}
                      className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                      Mark used
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Barcode Scanner */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Barcode Scanner</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or enter barcode"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && addToCartByBarcode()}
                disabled={loading}
              />
              <button
                onClick={addToCartByBarcode}
                disabled={loading || !barcodeInput.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? <RefreshCw size={20} className="animate-spin" /> : <Scan size={20} />}
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-sm text-gray-600">Try scanning: 8901234567890</p>
          </div>

          {/* Shopping Cart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Shopping Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500">Cart is empty</p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">
                        {item.name} ({item.size})
                        {item.color && <span className="text-sm text-gray-500"> - {item.color}</span>}
                      </h3>
                      <p className="text-sm text-gray-600">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="p-1 text-green-500 hover:bg-green-100 rounded"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3 mt-4">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cart discount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cartDiscount}
                      onChange={(e) => setCartDiscount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {openCredits.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apply store credit
                      </label>
                      <select
                        value={selectedOpenCreditId}
                        onChange={(e) => setSelectedOpenCreditId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">None</option>
                        {openCredits.map(credit => (
                          <option key={credit.id} value={credit.id}>
                            ₹{credit.amount} — Bill #{credit.saleId}{credit.customerName ? ` (${credit.customerName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1 mb-4 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{calculateSubtotal()}</span>
                    </div>
                    {getCartDiscountAmount() > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount</span>
                        <span>-₹{getCartDiscountAmount()}</span>
                      </div>
                    )}
                    {getSelectedCreditAmount() > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>Store credit</span>
                        <span>-₹{getSelectedCreditAmount()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold text-gray-800 pt-1">
                      <span>Total</span>
                      <span>₹{calculateTotal()}</span>
                    </div>
                  </div>
                  <button
                    onClick={processSale}
                    disabled={loading}
                    className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Complete Sale'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Stock Management Tab */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={() => setShowAddProduct(true)}
              className="w-full sm:w-auto px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <Plus className="inline mr-2" size={20} />
              Add New Product
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="w-full sm:w-auto px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Package className="inline mr-2" size={20} />
              Bulk Import
            </button>
          </div>

          {/* Add Product Modal */}
          {showAddProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-xl font-semibold mb-4">Add New Product</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Product Name *"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Size *"
                      value={newProduct.size}
                      onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Color"
                      value={newProduct.color}
                      onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Price *"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Stock *"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category *</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Brand"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Barcode (auto-generated)"
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={addNewProduct}
                    disabled={loading}
                    className="w-full sm:flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Product'}
                  </button>
                  <button
                    onClick={() => setShowAddProduct(false)}
                    className="w-full sm:flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Import Modal */}
          {showBulkImport && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                <h3 className="text-xl font-semibold mb-4">Bulk Import Products</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter products in CSV format: Name, Size, Color, Price, Stock, Barcode, Category, Brand
                  <br />
                  Example: Cotton T-Shirt, M, Blue, 499, 25, 8901234567890, T-Shirts, ComfortWear
                </p>
                <textarea
                  value={bulkImportData}
                  onChange={(e) => setBulkImportData(e.target.value)}
                  placeholder="Cotton T-Shirt, M, Blue, 499, 25, 8901234567890, T-Shirts, ComfortWear
Denim Jeans, 32, Dark Blue, 1299, 15, 8901234567891, Jeans, DenimCo
Formal Shirt, L, White, 899, 8, 8901234567892, Shirts, FormalFit"
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={bulkImportProducts}
                    disabled={loading}
                    className="w-full sm:flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Importing...' : 'Import Products'}
                  </button>
                  <button
                    onClick={() => setShowBulkImport(false)}
                    className="w-full sm:flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stock Management Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Current Stock</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw size={24} className="animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Current Stock</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Price</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-800">
                              {item.name} ({item.size})
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.color} | {item.category}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${item.stock < 15 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.stock} units
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-800">₹{item.price}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock === 0 ? 'bg-red-100 text-red-800' :
                              item.stock < 15 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                            }`}>
                            {item.stock === 0 ? 'Out of Stock' :
                              item.stock < 15 ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              const additionalStock = prompt('Enter additional stock quantity:');
                              if (additionalStock) {
                                restockProduct(item.id, additionalStock);
                              }
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm mr-2"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => openEditProduct(item)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm mr-2"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
		)}
    
      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-2xl font-semibold mb-6 text-gray-800">Inventory Management</h2>
    
    {/* Search Bar */}
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by item name or size..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {/* Results Counter */}
      {searchTerm && (
        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredInventory.length} of {inventory.length} items
        </div>
      )}
    </div>

    {loading ? (
      <div className="flex justify-center py-8">
        <RefreshCw size={24} className="animate-spin" />
      </div>
    ) : filteredInventory.length === 0 && searchTerm ? (
      <div className="text-center py-8">
        <p className="text-gray-500 text-lg">No items found</p>
        <p className="text-gray-400 text-sm">Try searching for a different item name or size</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Item</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Size</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Color</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Price</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Stock</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Barcode</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {item.name}
                  {item.brand && <span className="text-sm text-gray-500 block">{item.brand}</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 font-medium">{item.size}</td>
                <td className="px-4 py-3 text-gray-600">{item.color}</td>
                <td className="px-4 py-3 text-gray-600">{item.category}</td>
                <td className="px-4 py-3 text-gray-800">₹{item.price}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${item.stock < 15 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.stock}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-700">{item.barcode}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock === 0 ? 'bg-red-100 text-red-800' :
                      item.stock < 15 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                    {item.stock === 0 ? 'Out of Stock' :
                      item.stock < 15 ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
      )}

      {/* Labels Tab */}
      {activeTab === 'labels' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Print Barcode Labels</h2>
            <button
              onClick={handlePrintLabels}
              disabled={selectedLabelCount === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={18} />
              Print {selectedLabelCount > 0 ? `${selectedLabelCount} label${selectedLabelCount !== 1 ? 's' : ''}` : 'selected'}
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Select products and set copies, then print on Avery L7159 sheets (48 labels per A4).
            Use scale 100%, margins None.
          </p>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, size, or barcode..."
                value={labelSearchTerm}
                onChange={(e) => setLabelSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-6 overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredLabelInventory.length > 0 && filteredLabelInventory.every(item => selectedForPrint[item.id])}
                      onChange={selectAllVisibleForPrint}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Size</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Price</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Barcode</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Copies</th>
                </tr>
              </thead>
              <tbody>
                {filteredLabelInventory.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!!selectedForPrint[item.id]}
                        onChange={() => toggleProductForPrint(item.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.size}</td>
                    <td className="px-4 py-3 text-gray-800">₹{item.price}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700">{item.barcode}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={selectedForPrint[item.id] || 1}
                        disabled={!selectedForPrint[item.id]}
                        onChange={(e) => updatePrintCopies(item.id, e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100 disabled:opacity-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLabelInventory.length === 0 && (
              <p className="text-center text-gray-500 py-8">No products found</p>
            )}
          </div>

          {previewLabels.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Preview</h3>
              <div className="flex flex-wrap gap-3">
                {previewLabels.slice(0, 12).map((item, index) => (
                  <BarcodeLabel key={`preview-${item.id}-${index}`} product={item} />
                ))}
                {previewLabels.length > 12 && (
                  <div className="flex items-center justify-center w-[180px] h-[84px] border border-dashed border-gray-300 rounded text-sm text-gray-500">
                    +{previewLabels.length - 12} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales History Tab */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Sales History</h2>
          {bills.length === 0 ? (
            <p className="text-gray-500">No sales recorded yet</p>
          ) : (
            <div className="space-y-4">
              {bills.map(bill => (
                <div key={bill.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Bill #{bill.id}</h3>
                    <div className="text-right">
                      <span className="text-sm text-gray-600 block">{new Date(bill.date).toLocaleString()}</span>
                      {bill.customerName && (
                        <span className="text-sm text-blue-600">Customer: {bill.customerName}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {bill.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.name} x {item.quantity}
                          {(item.returnedQuantity || 0) > 0 && (
                            <span className="text-amber-600 ml-1">({item.returnedQuantity} returned)</span>
                          )}
                        </span>
                        <span>₹{item.totalPrice || (item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between items-center">
                    <div className="font-semibold">
                      <span>Total: </span>
                      <span>₹{bill.total}</span>
                    </div>
                    {bill.items.some(item => item.quantity > (item.returnedQuantity || 0)) && (
                      <button
                        onClick={() => openReturnModal(bill)}
                        className="flex items-center gap-1 text-sm px-3 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                      >
                        <RotateCcw size={14} />
                        Record return
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Sales</h3>
              <p className="text-3xl font-bold text-blue-600">
                {analytics.totalSales?.[0]?.count || 0}
              </p>
              <p className="text-sm text-gray-600">
                Revenue: ₹{analytics.totalSales?.[0]?.revenue || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Low Stock Items</h3>
              <p className="text-3xl font-bold text-red-600">
                {analytics.lowStock?.length || 0}
              </p>
              <p className="text-sm text-gray-600">Items below 15 units</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Top Categories</h3>
              <p className="text-3xl font-bold text-green-600">
                {analytics.topProducts?.length || 0}
              </p>
              <p className="text-sm text-gray-600">Products sold</p>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Selling Products</h3>
            {analytics.topProducts && analytics.topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Units Sold</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProducts.map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                        <td className="px-4 py-3 text-gray-600">{product.category}</td>
                        <td className="px-4 py-3 text-gray-800">{product.total_sold}</td>
                        <td className="px-4 py-3 text-gray-800">₹{product.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No sales data available</p>
            )}
          </div>

          {/* Low Stock Alert */}
          {analytics.lowStock && analytics.lowStock.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 text-red-600">
                <AlertCircle className="inline mr-2" size={20} />
                Low Stock Alert
              </h3>
              <div className="space-y-2">
                {analytics.lowStock.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="text-sm text-gray-600 ml-2">({item.category})</span>
                    </div>
                    <span className="font-bold text-red-600">{item.stock} units left</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {returnSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-2">Record Return</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bill #{returnSale.id}
              {returnSale.customerName && ` — ${returnSale.customerName}`}
            </p>
            <div className="space-y-3 mb-4">
              {returnSale.items
                .filter(item => item.quantity > (item.returnedQuantity || 0))
                .map(item => {
                  const maxReturn = item.quantity - (item.returnedQuantity || 0);
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="text-sm flex-1">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500 block">₹{item.price} each — max {maxReturn}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={maxReturn}
                        value={returnQuantities[item.id] ?? 0}
                        onChange={(e) => {
                          const val = Math.min(maxReturn, Math.max(0, Number(e.target.value) || 0));
                          setReturnQuantities({ ...returnQuantities, [item.id]: val });
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-center"
                      />
                    </div>
                  );
                })}
            </div>
            <input
              type="text"
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="Note (optional, e.g. returned 1 capri set)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <p className="text-xs text-amber-700 mb-4">
              Stock will be restored. A store credit will be added to Open Store Credits — no cash refund.
            </p>
            <div className="flex gap-3">
              <button
                onClick={processReturn}
                disabled={loading}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Confirm return'}
              </button>
              <button
                onClick={closeReturnModal}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {labelsToPrint.length > 0 && (
        <div className="label-print-container">
          <LabelPrintSheet labels={labelsToPrint} />
        </div>
      )}
    </div>
  );
};

export default GarmentsPOSSystem;