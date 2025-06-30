import React from 'react';

const Tabs = ({ activeTab, onTabClick, children }) => {
  return (
    <div>
      <div className="flex border-b border-bg-light">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;
          const { label } = child.props;
          return (
            <button
              onClick={() => onTabClick(label)}
              className={`py-2 px-6 font-semibold transition-colors ${
                activeTab === label
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-secondary hover:bg-bg-light'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="p-4">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;
          return activeTab === child.props.label ? child : undefined;
        })}
      </div>
    </div>
  );
};

export const Tab = ({ children }) => {
  return <>{children}</>;
};

export default Tabs; 