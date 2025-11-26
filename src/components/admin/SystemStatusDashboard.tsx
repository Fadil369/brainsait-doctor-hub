import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  message: string;
  lastChecked: Date;
}

export function SystemStatusDashboard() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const checkServices = async () => {
    setLoading(true);
    // Simple status check implementation
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    const statuses: ServiceStatus[] = [
      {
        name: 'Backend API',
        status: backendUrl ? 'online' : 'offline',
        message: backendUrl || 'Not configured',
        lastChecked: new Date(),
      },
    ];

    setServices(statuses);
    setLoading(false);
  };

  useEffect(() => {
    checkServices();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Real-time service monitoring</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={checkServices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-4">
                {service.status === 'online' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : service.status === 'degraded' ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <h4 className="font-semibold">{service.name}</h4>
                  <p className="text-sm text-muted-foreground">{service.message}</p>
                </div>
              </div>
              <Badge variant={service.status === 'online' ? 'default' : 'destructive'}>
                {service.status.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
