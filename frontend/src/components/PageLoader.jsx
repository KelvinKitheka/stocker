import React from 'react'

const PageLoader = ({ message = "Loading..." }) => {
  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='flex flex-col items-center gap-4'>
        <div className='relative w-16 h-16'>
            <img
            src='/stocker.png'
            className='w-16 h-16 object-contain rounded-2xl'
            />
            <div className='absolute inset-0 rounded-2xl border-2 border-transparent border-t-emerald-600 animate-spin'/>
        </div>
        <p className='text-sm text-gray-500 animate-pulse'>{message}</p>
      </div>
    </div>
  )
}

export default PageLoader;
