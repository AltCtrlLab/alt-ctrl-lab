import { redirect } from 'next/navigation';

export default function CockpitRedirect() {
  redirect('/dashboard');
}
