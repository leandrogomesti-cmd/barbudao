import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import NovaBarbariaForm from './nova-barbearia-form';

export const metadata = { title: 'Nova Barbearia — Super Admin' };

export default function NovaBarbeariaPage() {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Nova Barbearia</CardTitle>
          <CardDescription>
            Cria uma nova tenant com unidade, serviços iniciais e admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NovaBarbariaForm />
        </CardContent>
      </Card>
    </div>
  );
}
