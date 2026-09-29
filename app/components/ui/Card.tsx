interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`admin-card ${className}`}>
      {children}
    </div>
  );
}
