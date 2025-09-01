import Link from 'next/link';
import { getCampaigns } from '@/lib/actions/campaigns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  live: 'bg-green-100 text-green-800',
  triggered: 'bg-blue-100 text-blue-800',
  closed: 'bg-red-100 text-red-800',
};

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Manage wine campaigns</p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button>Create Campaign</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{campaign.title}</CardTitle>
                  <CardDescription>
                    Producer: {campaign.producer?.name || 'Unknown'}
                  </CardDescription>
                </div>
                <Badge className={statusColors[campaign.status]}>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {campaign.description}
                </p>
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-gray-400">
                    ID: {campaign.id.slice(0, 8)}...
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/admin/campaigns/${campaign.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No campaigns found</p>
            <Link href="/admin/campaigns/new">
              <Button>Create your first campaign</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
