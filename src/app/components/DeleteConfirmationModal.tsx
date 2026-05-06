import { ConfirmationModal } from './ConfirmationModal';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemTitle: string;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemTitle 
}: DeleteConfirmationModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Excluir item?"
      message={`Tem certeza que deseja excluir "${itemTitle}"?`}
      confirmText="Excluir"
      cancelText="Cancelar"
    />
  );
}