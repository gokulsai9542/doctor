import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: { borderRadius: '10px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
        success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
        error:   { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
      }}
    />
  );
}
