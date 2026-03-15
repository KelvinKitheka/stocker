import React, { useEffect, useState } from "react";
import { X, ArrowLeft, Check } from "lucide-react";
import api from "../services/api";

const DepletionModal = ({ batch, onClose, onSuccess }) => {
    const [ status, setStatus ] = useState('');
    const [ quantityUSed, setQuantityUsed ] = useState('');
    const [ batches, setBatches ] = useState([]);
    const [ selectedBatch, setSelectedBatch ] = useState(null);
    const [ selectedBatchId, setSelectedBatchId ] = useState('');

    useEffect(() => {
        fetchBatches();
    }, [])

    const fetchBatches = async () => {
        try{
            const response = await api.get('/batches/active/')
            setBatches(response.data);
        } catch (error) {
        console.error('Error fetching batches:', error);
        }
    };

    const handleBatchSelect = (e) => {
        const id = e.target.value;
        setSelectedBatchId(id);
        setSelectedBatch(batches.find(b => b.product__id === parseInt(id)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await api.post(`/products/${selectedBatch.product__id}/deplete/`, {
                status: status,
                quantity_used: quantityUSed || selectedBatch.total_remaining
            });

            onSuccess();
        } catch (error) {
            console.error('Error marking depletion:', error);
            alert('Failed to mark stock as depleted. Please try again')
        }
    };

    if(!selectedBatch){
        return (
            <div className="fixed bg-black bg-opacity-50 inset-0 flex items-center justify-center z-50 "> 
                <div className="bg-white rounded-lg w-full max-w-md mx-4">
                    <div className="bg-orange-500 text-white p-4 rounded-t-lg flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Mark Stock Depleted</h2>
                        <button
                        type="button"
                        onClick={onClose}
                        >
                            <X className="w-6 h-6"/>
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <select
                            value={selectedBatchId}
                            onChange={handleBatchSelect}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option value="">Select a product</option>
                            { batches.map((batch) => (
                                <option key={batch.id} value={batch.product__id}>
                                    {batch.product__name} - {batch.total_remaining} remaining
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        )
    }

    if (!status) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg w-full max-w-md mx-4">
                    <div className="bg-orange-500 text-white p-4 rounded-t-lg flex items-center justify-between">
                            <button onClick={() => setSelectedBatch(null)}>
                                <ArrowLeft className="w-6 h-6"/>
                            </button>
                            <h2 className="text-xl font-semibold">{selectedBatch.product__name}</h2>
                            <button
                            type="button"
                            onClick={onClose}
                            >
                                <X className="w-6 h-6"/>
                            </button>
                    </div>
                    <div className="p-6 space-y-3">
                        <p className="text-gray-500 mb-2">{selectedBatch.total_remaining} units remaining</p>
                        <button
                        onClick={() => setStatus('finished')}
                        className="w-full p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition text-left"
                        >
                            <div className="font-semibold">Yes, finished</div>
                            <div className="text-sm text-gray-500">Completely sold out</div>
                        </button>
                        <button
                        type="button"
                        onClick={() => {setStatus('partly_used')}}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition text-left"
                        >
                            <div className="font-semibold">Partly used</div>
                            <div className="text-sm text-gray-500">Enter how much was used</div>
                        </button>
                    </div>
                </div>
            </div>
        )
    } 

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md mx-4">
                <div className="bg-orange-500 text-white p-4 rounded-t-lg flex items-center justify-between">
                    <button type="button" onClick={() => { setStatus('')}}>
                        <ArrowLeft className="w-6 h-6"/>
                    </button>
                        <h2 className="text-xl font-semibold">
                        {status === 'partly_used' ? 'How much was used?' : 'Confirm Depletion'}
                        </h2>
                        <button onClick={onClose}>
                        <X className="w-6 h-6"/>
                        </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {status === 'partly_used' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity used
                            </label>
                            <input
                            type="number"
                            value={quantityUSed}
                            onChange={(e) => setQuantityUsed(e.target.value)}
                            placeholder={`Max: ${selectedBatch.total_remaining}`}
                            max={selectedBatch.total_remaining}
                            min="1"
                            required
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                    )} 
                    <button 
                    type="submit"
                    className="w-full bg-orange-500 text-white p-3 rounded-lg font-semibold hover:bg-orange-600 transition"
                    >
                        Confirm
                    </button>
                </form>
            </div>
        </div>
    )
}


export default DepletionModal