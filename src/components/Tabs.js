import React from 'react';

const Tabs = ({ activeTab, onTabClick, children }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Tab Headers - Fixed height */}
      <div className="flex-shrink-0 border-b border-bg-light">
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return null;
            const { label } = child.props;
            return (
              <button
                key={label}
                onClick={() => onTabClick(label)}
                className={`py-2 px-4 font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
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
      </div>
      {/* Tab Content - Scrollable area */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 h-full">
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return null;
            return activeTab === child.props.label ? (
              <div key={child.props.label} className="h-full">
                {child}
              </div>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
};

export const Tab = ({ children }) => {
  return <>{children}</>;
};

export default Tabs; 