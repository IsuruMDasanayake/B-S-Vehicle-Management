import AppraisalBoard from './AppraisalBoard';

export const AppraisalManagement = () => {
  return (
    <div style={{ padding: '0.5rem', paddingTop: '0rem', maxWidth: '1200px', margin: '0 auto' }}>
      <AppraisalBoard isHrView={true} />
    </div>
  );
};

export default AppraisalManagement;
