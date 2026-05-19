import React, { useState, useEffect } from "react";
import {X, Plus, ChevronDown} from "lucide-react";
import api from "../services/api";


const AddStockModal = ({ onClose, onSuccess}) => {

    const [ products, setProducts ] = useState([]);
    const [ showNewProduct, setShowNewProduct ] = useState(false);
    const [ submitting, setSubmitting ] = useState(false)
    const [ formData, setFormData ] = useState({
        product: '',
        productName: '',
        brand: '',
        quantity: '',
        buyPrice: '',
        sellPrice: '',
        category: ''
    });

    const grouped = products.reduce((acc, p) => {
        if (!acc[p.name]) acc[p.name] = [];
        acc[p.name].push(p)
        return acc;
    }, {});

    useEffect(() =>{
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try{
            const response = await api.get('/products/');
            setProducts(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }  
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(submitting) return;
        setSubmitting(true);
        
        try {
            let productId = formData.product
            if (showNewProduct || !productId){
                const productResponse = await api.post('/products/', {
                    name: formData.productName,
                    brand: formData.brand,
                    category: formData.category,
                    default_sell_price: formData.sellPrice
                });
                productId = productResponse.data.id;
            }
            await api.post('/batches/', {
                product: productId,
                quantity: formData.quantity,
                buy_price_per_unit: formData.buyPrice,
                sell_price_per_unit: formData.sellPrice
            });

            onSuccess();
        } catch(error) {
            console.error('Error adding stock:', error);
            alert('Failed to add stock. Ensure product does not exist.')
        } finally {
            setSubmitting(false);
        }
    };

    const handlechange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex overflow-y-auto p-4 justify-center z-50">
      <div className="bg-white rounded-lg max-h-[90vh] overflow-y-auto my-auto w-full max-w-md mx-4">
        <div className="bg-emerald-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Add new stock</h2>
            </div>
            <button onClick={onClose}> 
                <X className="w-6 h-6 ml-2"/>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name:
                </label>
                {!showNewProduct ? (
                    <div className="space-y-2">
                       <div className="relative">
                        <select
                        name="product"
                        value={formData.product}
                        onChange={handlechange}
                        className="w-full appearance-none border border-gray-300 rounded-lg p-3 pr-8 focus:ring-2 focus:ring-emerald-500
                        focus-border-transparent"
                        required={!showNewProduct}
                        >
                            <option value="">Select existing product</option>
                            {Object.entries(grouped).map(([name, variants]) => 
                            variants.length === 1 ? (
                                <option key={variants[0].id} value={variants[0].id}>
                                    {variants[0].name}
                                </option>
                            ) : (
                                <optgroup key={name} label={name}>
                                    {variants.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.brand ? p.brand : p.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )
                            )}
                        </select>
                        <ChevronDown className="absolute right-2 top-3.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                       </div>
                        <button
                            type="button"
                            onClick={() => {setShowNewProduct(true)}}
                            className="text-emerald-700 text-sm flex items-center gap-1 hover:underline"
                        >
                        <Plus/>
                        Add new product
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Product name<span className="text-red-400">*</span>
                            </label>
                            <input
                            type="text"
                            name="productName"
                            value={formData.productName}
                            onChange={handlechange}
                            placeholder="Enter product name"
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            required
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Brand/Variant
                            </label>
                            <input
                            type="text"
                            name="brand"
                            value={formData.brand}
                            onChange={handlechange}
                            placeholder="Enter brand"
                            className="w-full border border-gray-300 rounded-lg p-3 mb-2focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>

                        <select
                        name="category"
                        value={formData.category}
                        onChange={handlechange}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        required
                        >

                        <option value="">Select category</option>
                        <option value="food">Food</option>
                        <option value="drink">Drink</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                        <option value="other">Other</option>

                        </select>

                        <button
                        type="button"
                        onClick={() => setShowNewProduct(false)}
                        className="text-gray-600 text-sm hover:underline"
                        >
                            Use existing product
                        </button>
                        
                    </div>
                )}
            </div>


            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity:
                </label>
                <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handlechange}
                placeholder="10 Packs"
                required
                min="0"
                step="1"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 mb-4 focus:ring-emerald-500 focus:border-transparent"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buy Price(per pack)
                    </label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">KSH</span>
                    <input
                    type="number"
                    name="buyPrice"
                    value={formData.buyPrice}
                    onChange={handlechange}
                    placeholder="100"
                    required
                    min="0"
                    step="1"
                    className="w-full border border-gray-300 rounded-lg p-3 pl-14 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sell Price(per pack)
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">KSH</span>
                    <input
                    type="number"
                    name="sellPrice"
                    value={formData.sellPrice}
                    onChange={handlechange}
                    placeholder="200"
                    required
                    min="0"
                    step="1"
                    className="w-full border border-gray-300 rounded-lg p-3 pl-14 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
            </div>
            <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-700 text-white p-3 rounded-lg font-semibold hover:bg-emerald-800 transition"
            >
                {submitting ? 'Saving...' : 'Save Stock'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal
