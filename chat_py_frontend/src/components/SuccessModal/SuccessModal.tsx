import './SuccessModal.css';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
}

const SuccessModal = ({ isOpen, onClose, title, message, onConfirm }: SuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="success-icon">
            <i className="fas fa-check-circle" />
          </div>
          <h4 className="modal-title">{title}</h4>
        </div>

        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>

        <div className="modal-footer">
          <button className="premium-btn w-auto" onClick={onConfirm}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
