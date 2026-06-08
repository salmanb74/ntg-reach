import Topbar from '@/components/layout/Topbar'
import styles from '../leads/placeholder.module.css'
export default function SettingsPage() {
  return (<><Topbar title="Settings" /><div className={styles.page}><div className={styles.coming}><div className={styles.icon}>⚙️</div><div className={styles.label}>Settings — Coming in Phase 4</div></div></div></>)
}
