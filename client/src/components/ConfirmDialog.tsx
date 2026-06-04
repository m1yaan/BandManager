import Modal from './Modal';

type Props = {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
};

export function ConfirmDialog({ title, description, onConfirm, onCancel, confirmLabel = 'Удалить', danger = true }: Props) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn btn-ghost">Отмена</button>
          <button
            onClick={onConfirm}
            className="btn"
            style={{
              background: danger ? 'var(--error)' : 'var(--accent)',
              color: '#fff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
    </Modal>
  );
}