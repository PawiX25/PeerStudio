import React, { useEffect, useRef } from 'react';

const ContextMenu = ({
  x,
  y,
  onRename,
  onDelete,
  onImportAudio,
  onExportAudio,
  onAddTrack,
  onSolo,
  onClose,
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const createHandler = (fn) => () => {
    if (fn) fn();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 bg-bg-light rounded-md shadow-lg"
      style={{ top: y, left: x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ul className="py-1">
        {onImportAudio && (
          <li>
            <button
              onClick={createHandler(onImportAudio)}
              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-dark"
            >
              Import Audio
            </button>
          </li>
        )}
        {onExportAudio && (
          <li>
            <button
              onClick={createHandler(onExportAudio)}
              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-dark"
            >
              Export Track
            </button>
          </li>
        )}
        {onRename && (
          <li>
            <button
              onClick={createHandler(onRename)}
              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-dark"
            >
              Rename
            </button>
          </li>
        )}
        {onDelete && (
          <li>
            <button
              onClick={createHandler(onDelete)}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-bg-dark"
            >
              Delete
            </button>
          </li>
        )}
        {onAddTrack && (
          <li>
            <button
              onClick={createHandler(onAddTrack)}
              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-dark"
            >
              Add Track
            </button>
          </li>
        )}
        {onSolo && (
          <li>
            <button
              onClick={createHandler(onSolo)}
              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-dark"
            >
              Solo
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};

export default ContextMenu; 