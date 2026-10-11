/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { StoreProvider, useStore } from './app/providers/StoreContext';
import { AuthProvider } from './hooks/useAuth';
import { router } from './app/router';
import { Toast } from './components/ui/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function AppContent() {
  const { toast, hideToast } = useStore();

  return (
    <>
      <RouterProvider router={router} />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
