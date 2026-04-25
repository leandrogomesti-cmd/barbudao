
import { redirect } from 'next/navigation';

export default function Home() {
  // The middleware will handle the redirection to /login or /campaigns
  // so this page can be simpler. We redirect to the (app) group route.
  redirect('/campaigns');
}
