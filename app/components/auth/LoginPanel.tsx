'use client';

import { useEffect, useRef } from 'react';
import type { FieldErrors } from './types';

type LoginPanelProps = {
  email: string;
  password: string;
  fieldErrors: FieldErrors;
  credentialError: string | null;
  emailErrorId: string;
  passwordErrorId: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
};

export function LoginPanel({
  email,
  password,
  fieldErrors,
  credentialError,
  emailErrorId,
  passwordErrorId,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onForgotPassword,
}: LoginPanelProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.setAttribute('aria-invalid', (fieldErrors.email || credentialError) ? 'true' : 'false');
  }, [fieldErrors.email, credentialError]);

  useEffect(() => {
    passwordRef.current?.setAttribute('aria-invalid', (fieldErrors.password || credentialError) ? 'true' : 'false');
  }, [fieldErrors.password, credentialError]);

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-sm">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-900">
            Email
          </label>
          <input
            ref={emailRef}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            aria-invalid="false"
            aria-describedby={fieldErrors.email ? emailErrorId : undefined}
            className={`mt-2 w-full rounded-lg border px-4 py-2.5 text-gray-900 outline-none focus:ring-2 disabled:bg-gray-50 ${
              fieldErrors.email || credentialError
                ? 'border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:ring-teal-200'
            }`}
          />
          <p id={emailErrorId} className="mt-2 text-xs text-red-600 min-h-4">
            {fieldErrors.email ?? ''}
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
            Password
          </label>
          <input
            ref={passwordRef}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid="false"
            aria-describedby={
              fieldErrors.password ? passwordErrorId : undefined
            }
            className={`mt-2 w-full rounded-lg border px-4 py-2.5 text-gray-900 outline-none focus:ring-2 disabled:bg-gray-50 ${
              fieldErrors.password || credentialError
                ? 'border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:ring-teal-200'
            }`}
          />
          <p id={passwordErrorId} className="mt-2 text-xs text-red-600 min-h-4">
            {fieldErrors.password ?? credentialError ?? ''}
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            Forgot Password?
          </button>
        </div>

        <div className="pt-1 flex justify-center">
          <button
            type="submit"
            className="w-full rounded-xl bg-[#178893] px-6 py-3 text-white font-semibold hover:bg-[#156c84] disabled:opacity-60 transition-colors"
          >
            Log In
          </button>
        </div>
      </div>
    </form>
  );
}