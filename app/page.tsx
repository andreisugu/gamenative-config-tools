import { redirect } from 'next/navigation';

/**
 * Navigates to "/config-converter" when this page is rendered.
 *
 * This page component performs an immediate redirect to the "/config-converter"
 * route and does not render any user interface.
 */
export default function Home() {
  redirect('/config-converter');
}
