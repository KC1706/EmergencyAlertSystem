import { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export default function ToastNotification({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow time for fade out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Determine icon and color based on type
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check_circle',
          className: 'bg-green-500 text-white'
        };
      case 'error':
        return {
          icon: 'error',
          className: 'bg-red-500 text-white'
        };
      case 'warning':
        return {
          icon: 'warning',
          className: 'bg-yellow-500 text-white'
        };
      case 'info':
        return {
          icon: 'info',
          className: 'bg-blue-500 text-white'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div 
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${styles.className} ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="material-icons mr-2">{styles.icon}</span>
      <span>{message}</span>
    </div>
  );
}
