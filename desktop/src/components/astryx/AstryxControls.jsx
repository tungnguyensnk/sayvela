import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";

export function ActionButton({ children, label, disabled, className = "", variant = "secondary", size = "md", icon, title, ...props }) {
  const text = label || (typeof children === "string" ? children : title || "action");
  return (
    <Button
      {...props}
      className={className}
      icon={icon}
      isDisabled={disabled}
      label={text}
      size={size}
      tooltip={title}
      variant={variant}
    >
      {children}
    </Button>
  );
}

export function ActionIconButton({ label, title, tooltip, disabled, className = "", variant = "ghost", size = "md", icon, ...props }) {
  const text = label || title || "action";
  return (
    <IconButton
      {...props}
      className={className}
      icon={icon}
      isDisabled={disabled}
      label={text}
      size={size}
      tooltip={tooltip === undefined ? title || label : tooltip}
      variant={variant}
    />
  );
}
