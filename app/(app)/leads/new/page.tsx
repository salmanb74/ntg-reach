import Topbar from '@/components/layout/Topbar'
import LeadForm from '@/components/leads/LeadForm'
import styles from './new.module.css'

export default function NewLeadPage({
  searchParams,
}: {
  searchParams: { stage?: string }
}) {
  return (
    <>
      <Topbar title="New Lead" />
      <div className={styles.page}>
        <div className={styles.card}>
          <h2 className={styles.heading}>Create a new lead</h2>
          <LeadForm initialStage={searchParams.stage} />
        </div>
      </div>
    </>
  )
}
