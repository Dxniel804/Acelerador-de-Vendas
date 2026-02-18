import React from 'react';
import '../../styles/ui/tabs.css';
import { createContext, useContext, useState } from 'react';

const TabsContext = createContext({
  value: "",
  setValue: () => {},
});

const Tabs = ({ defaultValue, value, onValueChange, className, children, ...props }) => {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;
  const setValue = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className || ''}`}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, value, ...props }, ref) => {
  const { value: currentValue, setValue } = useContext(TabsContext);
  const isActive = currentValue === value;

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50"
      } ${className || ''}`}
      onClick={() => setValue(value)}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, value, ...props }, ref) => {
  const { value: currentValue } = useContext(TabsContext);
  const isActive = currentValue === value;

  if (!isActive) return null;

  return (
    <div
      ref={ref}
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ''}`}
      {...props}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
