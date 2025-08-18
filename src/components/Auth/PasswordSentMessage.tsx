import { AuthView } from '@/app/Auth/page';
import React from 'react'

interface Props{
    onSwitch:(view:AuthView) => void;
} 

export default function PasswordSentMessage({ onSwitch } : Props) {
  return (
    <>
      <h2 className="text-2xl font-bold">Forgot Password?</h2>
      <p className="mb-4 text-gray-600">Please enter your email address to continue</p>
      <p className="text-sm text-gray-700 mb-4">
        We have sent you an email with password reset link to{' '}
        <a href="mailto:test@test.com" className="text-blue-600 underline">
          test@test.com
        </a>
      </p>
      <button
        onClick={() => onSwitch('password-sent')}
        className="bg-green-600 w-full text-white py-2 rounded"
      >
        Send Again
      </button>
    </>
  );
}
