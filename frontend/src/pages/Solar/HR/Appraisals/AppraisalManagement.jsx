import AppraisalBoard from './AppraisalBoard';

export const AppraisalManagement = () => {
  return (
    <div style={{ padding: '1.25rem', paddingTop: '1.75rem', maxWidth: '1200px', margin: '0 auto' }}>
      <AppraisalBoard isHrView={true} />
    </div>
  );
};

export default AppraisalManagement;
