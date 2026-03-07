import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { login } from '../services/api';

const Login = ({ onLogin }) => {
    const [ formData, setFormData ] = useState({
        'username': '',
        'password': ''
    });

    const [ error, setError ] = useState('');
    const [ loading, setLoading ] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(formData.username, formData.password);
            onLogin();
        } catch (err) {
            setError('Invalid username or password');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className='min-h-screen bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center p-4'>
            <div className='bg-white rounded-lg shadow-xl w-full max-w-md p-8'>
                <div className='flex items-center justify-center mb-8'>
                    <Package className='w-12 h-12 text-emerald-700'/>
                    <h1 className='text-3xl font-bold text-gray-800 ml-3'>STOCKER</h1>
                </div>
                <h2 className='text-3xl font-bold text-gray-800 mb-6 text-center'>
                    Welcome Back
                </h2>
                {error && (
                    <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4'>{error}</div>
                )}

                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Username
                        </label>
                    <input
                    type='text'
                    name='username'
                    value={formData.username}
                    onChange={handleChange}
                    className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent '
                    required
                    />
                    </div>

                    <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Password
                        </label>
                    <input
                    type='password'
                    name='password'
                    value={formData.password}
                    onChange={handleChange}
                    className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent '
                    required
                    />
                    </div>

                    <button
                    type='submit'
                    disabled={loading}
                    className='w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
                <p className='text-center text-gray-600 mt-6 text-sm'>
                    Don't have an account?{' '}
                    <a href='#' className='text-emerald-700 font-semibold hover:underline'>
                        Sign up
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Login
