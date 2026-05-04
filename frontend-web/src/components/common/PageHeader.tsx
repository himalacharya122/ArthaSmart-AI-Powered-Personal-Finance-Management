interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="bg-primary-950 -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-6 lg:px-8 pt-8 pb-20 mb-8 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-3xl font-[800] text-white tracking-tight">{title}</h1>
          {description && (
            <p className="mt-2 text-base font-medium text-white/55">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
