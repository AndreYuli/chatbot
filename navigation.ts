import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es-ES', 'en-US', 'es-CO'],
  defaultLocale: 'es-ES',
  localePrefix: 'always'
});

export const { Link, redirect, usePathname, useRouter } = 
  createSharedPathnamesNavigation({
    locales: routing.locales,
    localePrefix: routing.localePrefix
  });