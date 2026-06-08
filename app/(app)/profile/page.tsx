import Topbar from '@/components/layout/Topbar'
import styles from '../leads/placeholder.module.css'
export default function ProfilePage() {
  return (<><Topbar title="Profile" /><div className={styles.page}><div className={styles.coming}><div className={styles.icon}>👤</div><div className={styles.label}>Profile — Coming in Phase 2</div></div></div></>)
}
