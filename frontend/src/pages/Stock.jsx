import { useState ,useEffect, useCallback } from "react";
import { Plus, Search, Filter, Package, TrendingDown, CheckCircle, Clock, ChevronDown } from 'lucide-react';
import api from "../services/api";
import AddStockModal from "../components/AddStockModal";
import DepletionModal from "../components/DepletionModal";

const CATEGORY_COLORS = {
    food:"bg-emerald-100 text-emerald-800",
    drink: "bg-blue-100 text-blue-800",
    electronics: "bg-purple-100 text-purple-800",
    clothing: "bg-pink-100 text-pink-800",
    other: "bg-gray-100 text-gray-700",
};

const StatusBadge = ({isDepleted}) => 
    isDepleted ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <CheckCircle className="w-3 h-3"/> Depleted
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <Clock className="w-3 h-3"/> Active
        </span>
    );

const StatCard = ({label, value, sub, color = "text-gray-800"}) => (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        { sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
);

const Th = ({ children, align="left"}) => {
    const base = 
    "px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide"

    const alignClass = {
        left: "text-left",
        right: "text-right",
        center: "text-center"
    }[align];

    return <th className={`${base} ${alignClass}`}>{children}</th>
}

const Stock = () => {
    const [batches, setBatches] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterProduct, setFilterProduct] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterCategory, setFilterCategory] = useState("");
    const [sortBy, setSortBy] = useState("added_at_desc");
    const [showAddStock, setShowAddStock] = useState(false);
    const [showDepletion, setShowDepletion] = useState(false);
    const [stats, setStats] = useState(null);


    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const params = {}
            if (filterProduct) params.product = filterProduct;
            if (filterStatus === "active") params.is_depleted = "false";
            if (filterStatus === "depleted") params.is_depleted = "true";


        const [batchRes, productRes, reportRes] = await Promise.all([
            api.get("/batches/", {params}),
            api.get("/products/"),
            api.get("/reports/"),
        ]);

        setBatches(batchRes.data.results || batchRes.data);
        setProducts(productRes.data.results || productRes.data);
        setStats(reportRes.data)
    } catch (error) {
        console.error("Error fetching stock", error);
    } finally {
        setLoading(false);
    }
    }, [ filterProduct, filterStatus]);

    useEffect(() => {
    fetchAll(); 
    }, [fetchAll]);

    const filtered = batches
    .filter((b) => {
        const name = b.product_name || "";
        if(search && !name.toLowerCase().includes(search.toLowerCase())) return false;
        if(filterCategory && b.product_category !== filterCategory) return false;
        return true
    })
    .sort((a, b) => {
        if(sortBy === "added_at_desc") return new Date(b.added_at) - new Date(a.added_at);
        if(sortBy === "added_at_asc") return new Date (a.added_at) - new Date(b.added_at);
        if(sortBy === "profit_desc") return b.estimated_profit - a.estimated_profit;
        if(sortBy === "quantity_desc") return b.quantity - a.quantity;
        return 0;
    });

    const activeCount = batches.filter((b) => !b.is_depleted).length;
    const depletedCount = batches.filter((b) => b.is_depleted).length;

    const categories = [... new Set(batches.map((b) => b.product_category).filter(Boolean))]

    if(loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"/>
                        <p className="text-sm text-gray-500">Loading stock...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Stock</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {activeCount} active - {depletedCount} depleted
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                    onClick={() => setShowDepletion(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-orange-50 text-orange-700
                     hover:bg-orange-100 transition border border-orange-200"
                    >
                        <TrendingDown/>
                        Mark Depleted
                    </button>
                    <button
                    onClick={() => setShowAddStock(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 text-sm text-white rounded-lg 
                    font-medium hover:bg-emerald-800"
                    >
                        <Plus/>
                        Add Stock
                    </button>
                </div>
            </header>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            { stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                    label="Active Stock Value"
                    value={`KSH ${Number(stats.active_stock_value).toLocaleString()}`}
                    sub="Current Inventory worth"
                    />
                    <StatCard
                    label="Total Revenue"
                    value={`KSH ${Number(stats.total_revenue).toLocaleString()}`}
                    sub="All time from depleted stock"
                    />
                    <StatCard
                    label="Total Profit"
                    value={`KSH ${Number(stats.total_profit).toLocaleString()}`}
                    sub={`${stats.overall_margin}% overall margin`}
                    color = "text-emerald-700"
                    />
                    <StatCard
                    label="Batches"
                    value={stats.total_batches}
                    sub={`${stats.active_batches} active - ${stats.depleted_batches} depleted`}
                    />
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                        <input
                        type="text"
                        placeholder="Search product..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2
                        focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                    </div>

                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                        {["all", "active", "depleted"].map((s) => (
                                <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-2 capitalize transition ${
                                filterStatus === s
                                ? "bg-emerald-700 text-white"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                                >
                                    {s}
                                </button>
                        ))}
                    </div>

                    <div className="relative">
                        <select
                        value={filterProduct}
                        onChange={(e) => setFilterProduct(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2
                        focus:ring-emerald-500 outline-none bg-white text-gray-700"
                        >
                            <option value="">All Products</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                    </div>


                    {categories.length > 0 && (
                        <div className="relative">
                            <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 
                            focus:ring-emerald-500 outline-none bg-white text-gray-700"
                            >
                                <option value="">All Categories</option>
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                        </div>
                    )}


                    <div className="relative ml-auto">
                        <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2
                        focus:ring-emerald-500 outline-none bg-white text-gray-700"
                        >
                            <option value="added_at_desc">Newest first</option>
                            <option value="added_at_asc">Oldest first</option>
                            <option value="profit_desc">Highest first</option>
                            <option value="quantity_desc">Most Quantity</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>

                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Package className="w-10 h-10 mb-3 opacity-30"/>
                        <p className="text-sm">No batches found</p>
                        <p className="text-xs mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray bg-gray-50">
                                    <Th align="left">Product</Th>
                                    <Th>Qty</Th>
                                    <Th>Remaining</Th>
                                    <Th>Buy Price</Th>
                                    <Th>Sell Price</Th>
                                    <Th>Profit</Th>
                                    <Th>Margin</Th>
                                    <Th align="center">Status</Th>
                                    <Th>Added</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((batch) => (
                                    <tr key={batch.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>{batch.product_name}</div>
                                            <span
                                            className={`inline-block mt-0.5 text-xs px-0.5 rounded capitalize ${
                                                CATEGORY_COLORS[batch.product_category] || CATEGORY_COLORS.other
                                            }`}
                                            >
                                                {batch.product_category || "other"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700">
                                            {Number(batch.quantity).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span
                                            className={
                                                batch.is_depleted
                                                ? "text-gray-400"
                                                : Number(batch.remaining_quantity) < Number(batch.quantity) * 0.2
                                                ? "text-red-600 font-semibold"
                                                : "text-gray-700"
                                            }
                                            >
                                                {Number(batch.remaining_quantity).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">
                                            {Number(batch.buy_price_per_unit).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">
                                            {Number(batch.sell_price_per_unit).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                                            {Number(batch.estimated_profit).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span 
                                            className={
                                                `text-xs font-medium px-2 py-0.5 rounded-full ${
                                                    batch.profit_margin >= 20
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : batch.profit_margin >= 10
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-red-100 text-red-700"
                                                }`
                                            }>
                                                {Number(batch.profit_margin).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge isDepleted={batch.is_depleted}/>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-gray-400">
                                            {new Date(batch.added_at).toLocaleString("en-GB", {
                                                day:"numeric",
                                                month:"short",
                                                year:"numeric"
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        {showAddStock && (
            <AddStockModal
            onClose={() => {setShowAddStock(false)}}
            onSuccess={() => {
                setShowAddStock(false);
                fetchAll();
            }}
            />
        )}

        {showDepletion && (
            <DepletionModal
            batch={null}
            onClose={() => setShowDepletion(false)}
            onSuccess={() => {
                setShowDepletion(false);
                fetchAll();
            }}
            />
        )}
        </div>
    )

}

export default Stock;