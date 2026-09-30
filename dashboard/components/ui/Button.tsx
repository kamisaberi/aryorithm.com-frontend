import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  href?: string;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}

const variantClasses: Record<string, string> = {
  primary: "admin-btn-primary",
  secondary: "admin-btn-secondary",
  ghost: "admin-btn-ghost",
};

export default function Button({
  children,
  variant = "primary",
  href,
  className = "",
  onClick,
  type = "button",
}: ButtonProps) {
  const classes = `${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
