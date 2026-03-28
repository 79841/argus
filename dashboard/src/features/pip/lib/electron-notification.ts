export const sendSystemNotification = (title: string, body: string): void => {
  if (typeof window === 'undefined') return

  if (window.electronAPI?.showNotification) {
    window.electronAPI.showNotification(title, body)
    return
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}
