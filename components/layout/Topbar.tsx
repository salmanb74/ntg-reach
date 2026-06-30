import styles from './Topbar.module.css'

interface TopbarProps {
  title: string
  userName?: string
}

export default function Topbar({ title, userName }: TopbarProps) {
  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.right}>
        <div className={styles.avatar} title={userName ?? 'User'}>
          {initials}
        </div>
      </div>
    </header>
  )
}
