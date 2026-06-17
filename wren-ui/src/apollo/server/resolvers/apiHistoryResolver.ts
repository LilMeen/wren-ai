import { ApiType, ApiHistory } from '@server/repositories/apiHistoryRepository';
import { IContext } from '@server/types';

export interface ApiHistoryFilter {
  apiType?: ApiType;
  statusCode?: number;
  threadId?: string;
  userId?: number;
  projectId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ApiHistoryPagination {
  offset: number;
  limit: number;
}

const sanitizeResponsePayload = (payload: any, apiType?: ApiType): any => {
  if (!payload) return payload;

  const sanitized = { ...payload };

  if (apiType === ApiType.RUN_SQL) {
    if (sanitized.records && Array.isArray(sanitized.records)) {
      const recordCount = sanitized.records.length;
      sanitized.records = [`${recordCount} records omitted`];
    }
  }

  if (apiType === ApiType.GENERATE_VEGA_CHART) {
    if (
      sanitized.vegaSpec?.data?.values &&
      Array.isArray(sanitized.vegaSpec.data.values)
    ) {
      const dataCount = sanitized.vegaSpec.data.values.length;
      sanitized.vegaSpec.data.values = [`${dataCount} data points omitted`];
    }
  }

  return sanitized;
};

export class ApiHistoryResolver {
  constructor() {
    this.getApiHistory = this.getApiHistory.bind(this);
  }

  public async getApiHistory(
    _root: unknown,
    args: {
      filter?: ApiHistoryFilter;
      pagination: ApiHistoryPagination;
    },
    ctx: IContext,
  ) {
    const { filter, pagination } = args;
    const { offset, limit } = pagination;

    const filterCriteria: Partial<ApiHistory> = {};

    if (filter) {
      if (filter.apiType) {
        filterCriteria.apiType = filter.apiType;
      }

      if (filter.statusCode) {
        filterCriteria.statusCode = filter.statusCode;
      }

      if (filter.threadId) {
        filterCriteria.threadId = filter.threadId;
      }

      if (filter.userId) {
        filterCriteria.userId = filter.userId;
      }

      if (filter.projectId) {
        filterCriteria.projectId = filter.projectId;
      }
    }

    const dateFilter: { startDate?: Date; endDate?: Date } = {};
    if (filter?.startDate) {
      dateFilter.startDate = new Date(filter.startDate);
    }
    if (filter?.endDate) {
      dateFilter.endDate = new Date(filter.endDate);
    }

    const total = await ctx.apiHistoryRepository.count(
      filterCriteria,
      dateFilter,
    );

    if (total === 0 || total <= offset) {
      return {
        items: [],
        total,
        hasMore: false,
      };
    }

    const items = await ctx.apiHistoryRepository.findAllWithPagination(
      filterCriteria,
      dateFilter,
      {
        offset,
        limit,
        orderBy: { createdAt: 'desc' },
      },
    );

    return {
      items,
      total,
      hasMore: offset + limit < total,
    };
  }

  public getApiHistoryNestedResolver = () => ({
    createdAt: (apiHistory: ApiHistory) => {
      return apiHistory.createdAt
        ? new Date(apiHistory.createdAt).toISOString()
        : null;
    },
    updatedAt: (apiHistory: ApiHistory) => {
      return apiHistory.updatedAt
        ? new Date(apiHistory.updatedAt).toISOString()
        : null;
    },
    responsePayload: (apiHistory: ApiHistory) => {
      if (!apiHistory.responsePayload) return null;
      if (Array.isArray(apiHistory.responsePayload))
        return apiHistory.responsePayload;
      return sanitizeResponsePayload(
        apiHistory.responsePayload,
        apiHistory.apiType,
      );
    },
    userEmail: async (apiHistory: ApiHistory, _args: any, ctx: IContext) => {
      if (!apiHistory.userId) return null;
      const user = await ctx.userRepository.findOneBy({ id: apiHistory.userId });
      return user?.email ?? null;
    },
  });
}
