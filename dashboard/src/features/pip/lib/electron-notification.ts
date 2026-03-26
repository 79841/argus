export const sendSystemNotification = (title: string, body: string): void => {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return
  }
  new Notification(title, { body })
}
