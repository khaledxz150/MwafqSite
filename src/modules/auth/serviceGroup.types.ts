import type {
  PaginatedResponse,
  UpstreamApiResponse,
} from '@/shared/types/api.types';
import type { Locale } from '@/i18n/config';
import { CourseListItem } from './course.types';

export interface ServiceGroupTranslation {
  id: number;
  langId: number;
  serviceGroupId: number;
  name: string;
  description: string | null;
}

export interface ServiceGroupServiceLink {
  id: number;
  serviceGroupId: number;
  serviceId: number;
  serviceName: string;
}

export interface ServiceGroupClassificationPricing {
  id: number;
  serviceGroupId: number;
  serviceProviderClassificationId: number;
  price: number;
  classificationName: string;
}

export type ServiceGroupCourse = {
  id: number;
  courseId: number;
  serviceGroupId: number;
};

export interface ServiceGroupRequirement {
  id: number;
  serviceGroupId: number;
  langId: number;
  requirement: string;
}

export interface ServiceGroupCondition {
  id: number;
  serviceGroupId: number;
  condition: number;
  value: string;
}

export interface ServiceGroupListItem {
  id: number;
  target: number;
  sla: number | null;
  isRenewal: boolean;
  isMandatoryTest: boolean;
  isFeatured: boolean;
  icon: string;
  translations: ServiceGroupTranslation[];
  serviceGroupServices: ServiceGroupServiceLink[];
  serviceGroupClassificationPricings: ServiceGroupClassificationPricing[];
  courses: ServiceGroupCourse[];
  requirements: ServiceGroupRequirement[] | null;
  conditions: ServiceGroupCondition[] | null;
}

/** Full detail from `GET /api/Service/ServiceGroup/GetById`. */
export type ServiceGroupDetail = ServiceGroupListItem;

export type ServiceGroupListPage = PaginatedResponse<ServiceGroupListItem>;

export type ServiceGroupListResponse =
  UpstreamApiResponse<ServiceGroupListPage>;

export type FetchServiceGroupListParams = {
  pageNumber: number;
  pageSize: number;
  Target?: string;
  serviceGroupId?: number;
  search?: string;
  IsRenewal?: boolean;
  IsMandatoryTest?: boolean;
  OrderBy?: string;
  Search?: string;
  OrderDirection?: boolean;
  /** Sent upstream as `?culture=en`/`?culture=ar`. */
  culture?: Locale;
};
