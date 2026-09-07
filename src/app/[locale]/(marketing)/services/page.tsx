import type { Metadata } from 'next';
import { hasLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { buildPageMetadata } from '@/i18n/seo';
import { ROUTES } from '@/shared/constants/routes';
import {
  fetchServiceGroupsList,
  serviceGroupToServiceListItem,
} from '@/modules/auth/server/ServiceGroupService';
import { ServicesPage } from '@/modules/services';
import { MarketingStickyHeaderOffset } from '@/shared/components/marketing';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale as Locale);
  return buildPageMetadata({
    locale: locale as Locale,
    route: ROUTES.SERVICES,
    title: dict.seo.services.title,
    description: dict.seo.services.description,
  });
}

export default async function ServicesRoute({
  params,
  searchParams,
}: RouteProps & {
  searchParams: Promise<{ search: string; page: string }>;
}) {
  const { locale } = await params;
  const { search, page } = await searchParams;

  const data = await fetchServiceGroupsList({
    pageNumber: page ? +page : 1,
    pageSize: 8,
    Search: search,
    OrderDirection: true,
    culture: hasLocale(locale) ? locale : undefined,
  });

  return (
    <MarketingStickyHeaderOffset variant='filter'>
      <ServicesPage
        services={data.data.map(serviceGroupToServiceListItem)}
        page={data.pageNumber}
        totalPages={data.totalPages}
      />
    </MarketingStickyHeaderOffset>
  );
}
