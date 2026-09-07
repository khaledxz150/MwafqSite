import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { localeToLangId } from '@/i18n/config';
import { GetLocale } from '@/i18n/server';
import { buildPageMetadata } from '@/i18n/seo';
import { ROUTES } from '@/shared/constants/routes';
import { getCurrentUser } from '@/modules/auth/server/authSession';
import {
  fetchServiceGroupById,
  fetchServiceGroupsList,
  serviceGroupToServiceListItem,
} from '@/modules/auth/server/ServiceGroupService';
import { ServiceGroupDetailsView } from '@/modules/services/ServiceGroupDetailsView';
import { FetchResponseError } from '@/shared/lib/fetchWithErrorHandling.shared';
import { MarketingStickyHeaderOffset } from '@/shared/components/marketing';
import { SITE_URL } from '@/shared/constants/config';
import { JsonLd } from '@/shared/components/seo/JsonLd';
import { stripHtmlToNull } from '@/shared/lib/text';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return {};

  const locale = await GetLocale();
  const langId = localeToLangId[locale];
  const service = await fetchServiceGroupById(numericId, { locale }).catch(
    (error) => {
      if (error instanceof FetchResponseError) notFound();
      throw error;
    }
  );
  const translation =
    service.translations.find((t) => t.langId === langId) ??
    service.translations[0];
  if (!translation) notFound();

  return buildPageMetadata({
    locale,
    route: `${ROUTES.SERVICES}/${numericId}`,
    title: translation.name,
    description: stripHtmlToNull(translation.description) ?? translation.name,
  });
}

export default async function ServiceGroupDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    notFound();
  }

  const locale = await GetLocale();
  const [service, relatedList, currentUser] = await Promise.all([
    fetchServiceGroupById(numericId, { locale }).catch((error) => {
      if (error instanceof FetchResponseError) notFound();
      throw error;
    }),
    fetchServiceGroupsList({ pageNumber: 1, pageSize: 6, culture: locale }),
    getCurrentUser(),
  ]);

  const langId = localeToLangId[locale];
  const relatedPackages = relatedList.data
    .filter((item) => item.id !== numericId)
    .slice(0, 5)
    .map(serviceGroupToServiceListItem);
  const translation =
    service.translations.find((t) => t.langId === langId) ??
    service.translations[0];

  if (!translation) {
    notFound();
  }

  return (
    <MarketingStickyHeaderOffset variant='detail'>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MedicalTest',
          name: translation.name,
          description:
            stripHtmlToNull(translation.description) ?? translation.name,
          url: `${SITE_URL}/${locale}${ROUTES.SERVICES}/${numericId}`,
        }}
      />
      <ServiceGroupDetailsView
        locale={locale}
        langId={langId}
        service={service}
        relatedPackages={relatedPackages}
        isAuthenticated={currentUser !== null}
      />
    </MarketingStickyHeaderOffset>
  );
}
