import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

const NotFound = () => {
  return (
    <div className='min-h-screen bg-gray-50 md:ml-64 flex items-center justify-center'>
      <div className='text-center'>
        <Package className='w-16 h-16 text-gray-300 mx-auto mb-4'/>
        <h1 className='text-6xl font-bold text-gray-200 mb-2'>404</h1>
        <p className='text-gray-500 mb-6'>This Page does not exist</p>
        <Link
        to="/"
        className='bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-800 transition'
        >
        Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFound
