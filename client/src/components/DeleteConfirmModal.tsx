interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contactName: string;
}

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  contactName 
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
        <p className="mb-6">
          Are you sure you want to remove <span className="font-medium">{contactName}</span> from your emergency contacts?
        </p>
        
        <div className="flex justify-end space-x-2">
          <button 
            onClick={onClose} 
            className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Delete Contact
          </button>
        </div>
      </div>
    </div>
  );
}
