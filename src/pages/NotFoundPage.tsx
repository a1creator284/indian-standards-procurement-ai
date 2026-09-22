import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="size-5" />}
      title="Page not found"
      description="The page you requested does not exist."
      action={
        <Link to="/">
          <Button>Back to dashboard</Button>
        </Link>
      }
    />
  );
}
