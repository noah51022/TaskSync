// Adapted from shadcn-ui toast implementation
import { useState, useCallback } from 'react';

export type ToastProps = {
  id?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
};

type ToastState = {
  toasts: ToastProps[];
};

let count = 0;

function generateId() {
  return `toast-${++count}`;
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback((props: ToastProps) => {
    const id = props.id || generateId();
    const newToast = { ...props, id };

    setState((prevState) => ({
      toasts: [...prevState.toasts, newToast],
    }));

    if (props.duration !== Infinity) {
      setTimeout(() => {
        setState((prevState) => ({
          toasts: prevState.toasts.filter((t) => t.id !== id),
        }));
      }, props.duration || 5000);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
} 