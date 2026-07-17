import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <p className="text-center text-primary-400 py-16">
          Coming soon.
        </p>
      </Card>
    </div>
  );
}
