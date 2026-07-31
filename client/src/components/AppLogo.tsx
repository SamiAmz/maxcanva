interface AppLogoProps {
  className?: string;
  label?: string;
}

export function AppLogo({ className = '', label }: AppLogoProps) {
  return (
    <span
      className={`app-logo ${className}`.trim()}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <img src="/maxcanva-logo.svg" alt="" />
    </span>
  );
}
