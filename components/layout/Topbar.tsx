import NotificationBell from './NotificationBell'
import styles from './Topbar.module.css'

interface TopbarProps {
  title:    string
  userName?: string
}

export default function Topbar({ title, userName }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.right}>
        <NotificationBell />
      </div>
    </header>
  )
}
