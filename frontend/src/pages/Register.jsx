import React, {useState} from "react";
import {useNavigate, Link} from 'react-router-dom';
import {Package, Eye, EyeOff, Check, X} from 'lucide-react';
import { register } from "../services/api";

const RULES = [
    { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'One number', test: (p) => /\d/.test(p) },
];

const PasswordRules = ({ passes, label }) => (
    <div className={`flex items-center gap-1.5 text-xs transition-colors ${passes ? 'text-emerald-600' : 'text-gray-400'}`}>
        { passes
        ? <Check className="w-3 h-3 shrink-0"/>
        : <X className="w-3 h-3 shrink-0"/>
    }
    {label}
    </div>
);

const PasswordInput = ({ name, value, onChange, placeholder, label }) => {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="relative">
                <input
                type={show ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-emerald-500
                focus:border-transparent outline-none"
                required
                />

                <button
                type="button"
                onClick={() => setShow((s) => !s)}
                tabIndex={-1}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                    {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
            </div>
        </div>
    );
};

const parseErrors = (errorsData) => {
    if (!errorsData) return ['Something went wrong. Please try again'];
    if (typeof errorsData === 'string') return [errorsData];

    const messages = [];
    for (const [field, value] of Object.entries(errorsData)) {
        const fieldLabel = field === 'non_field_errors' ? '' : `${field}: `;
        if (Array.isArray(value)) {
            value.forEach((msg) => messages.push(`${fieldLabel}${msg}`));
        } else if (typeof value === 'string') {
            messages.push(`${fieldLabel}${value}`);
        }
    }
    return messages.length ? messages : ['Something went wrong. Please try again.'];
};

const Register = ({ onLogin }) => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        confirm_password: '',
    })

    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showRules, setShowRules] = useState(false);

    const passwordRulesPassed = RULES.map((r) => ({ ...r , passes: r.test(formData.password)}));
    const allRulesPassed = passwordRulesPassed.every((r) => r.passes);
    const passwordsMatch = formData.password === formData.confirm_password;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors.length) setErrors([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors([]);

        if(!allRulesPassed) {
            setErrors(['Please make sure your password meets all the requirements']);
            return;
        }

        if(!passwordsMatch) {
            setErrors(['Passwords do not match']);
            return;
        }

        setLoading(true);
        try {
            const data = await register(formData);
            onLogin({username: data.user.username, first_name: data.user.first_name});
            navigate('/', { replace: true });
        } catch (err) {
            const data = err.response?.data;
            setErrors(parseErrors(data));
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="min-h-screen bg-emerald-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
                <div className="flex items-center justify-center mb-6">
                <img
                    src="/stocker.png"
                    alt="Stocker"
                    className="w-8 h-8 object-contain rounded-xl"
                />
                    <h1 className="text-3xl font-bold text-gray-800 ml-3">STOCKER</h1>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-1 text-center">Create your account</h2>
                <p className="text-sm text-gray-500 text-center mb-6">Start managing your inventory today</p>
                { errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-1  text-center">
                        { errors.map((msg, i) => (
                            <p key={i} className="text-sm">{msg}</p>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="">
                            <label className="block text-sm font-medium text-gray-700 mb-2">First name</label>
                            <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 
                            focus:ring-emerald-500 focus:border-transparent outline-none"
                            />
                        </div>

                        <div>
                            <label className=" block text-sm font-medium text-gray-700 mb-2">Last name</label>
                            <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 
                            focus:ring-emerald-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Username <span>*</span></label>
                        <input 
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        autoComplete="username"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-emerald-500
                        focus:border-transparent outline-none"
                        required
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-2 text-gray-700 font-medium">Email</label>
                        <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-emerald-600
                        focus:border-transparent outline-none"
                        />
                    </div>

                    <div onFocus={() => setShowRules(true)}
                        onBlur={() => setShowRules(false)}>
                        <PasswordInput
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min. 8 characters"
                        label={<>Password <span className="text-red-500">*</span></>}
                        />

                        {showRules && (
                            <div>
                                {passwordRulesPassed.map((r) => (
                                    <PasswordRules key={r.id} passes={r.passes} label={r.label}/>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <PasswordInput
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        label={<>Confirm password <span>*</span></>}
                        />

                        { formData.confirm_password.length > 0 && (
                            <p className={`text-xs mt-1.5 pl-1 ${passwordsMatch ? 'text-emerald-700' : 'text-red-500'}`}>
                                { passwordsMatch ? 'Passwords match' : 'x Passwords do not match'}
                            </p>
                        )}
                    </div>

                    <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-800 transition
                    disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>
                </form>
                <p className="text-center text-gray-600 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-emerald-700 font-semibold hover:underline">
                    Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default Register;

