import { create } from 'zustand';

// Notification store
export const useNotificationStore = create((set) => ({
  notifications: [],
  
  addNotification: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }]
    }));
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    }, 3000);
  },
  
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },
}));

// Helper function to show notifications
export const showNotification = (message, type = 'info') => {
  useNotificationStore.getState().addNotification(message, type);
};
